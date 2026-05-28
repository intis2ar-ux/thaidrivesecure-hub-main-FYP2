import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

admin.initializeApp();

const documentAIClient = new DocumentProcessorServiceClient();

// Cloud Function runs in asia-southeast1; Document AI processors are in 'us'
const CLOUD_FUNCTION_REGION = "asia-southeast1";
const DOCUMENT_AI_LOCATION = "us";

// Both passport and vehicle grant use Form Parser processors.
// The passport parser extracts key-value pairs (name, nationality, DOB, passport no., etc.)
// which are then used to auto-fill insurance docs, TM2/TM3, and TDAC forms.
const PASSPORT_PROCESSOR_ID =
  process.env.PASSPORT_PROCESSOR_ID || "43b80fb543a0ca3b";
const VEHICLE_GRANT_PROCESSOR_ID =
  process.env.VEHICLE_GRANT_PROCESSOR_ID || "588ec71b62ae5425";

interface ProcessDocumentRequest {
  applicationId: string;
  documentUrl: string;
  documentType: "passport" | "vehicle_grant";
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const assertActiveDashboardUser = async (uid: string): Promise<void> => {
  const profileSnap = await admin.firestore().collection("userWdboard").doc(uid).get();
  const profile = profileSnap.data();

  if (
    !profileSnap.exists ||
    !["admin", "staff"].includes(profile?.role) ||
    profile?.status === "disabled"
  ) {
    throw new HttpsError(
      "permission-denied",
      "User is not authorized to process documents."
    );
  }
};

const validateStorageDownloadUrl = (
  rawUrl: string,
  applicationId: string
): string => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new HttpsError("invalid-argument", "documentUrl must be a valid URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new HttpsError("invalid-argument", "documentUrl must use HTTPS.");
  }

  const bucketName = admin.storage().bucket().name;
  const hostname = parsedUrl.hostname.toLowerCase();
  let objectPath = "";

  if (hostname === "firebasestorage.googleapis.com") {
    const match = parsedUrl.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^/]+)/);
    if (!match || match[1] !== bucketName) {
      throw new HttpsError("invalid-argument", "documentUrl must point to this Firebase Storage bucket.");
    }
    objectPath = decodeURIComponent(match[2]);
  } else if (hostname === "storage.googleapis.com") {
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathParts[0] !== bucketName || pathParts.length < 2) {
      throw new HttpsError("invalid-argument", "documentUrl must point to this Firebase Storage bucket.");
    }
    objectPath = decodeURIComponent(pathParts.slice(1).join("/"));
  } else if (hostname === `${bucketName}.storage.googleapis.com`) {
    objectPath = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
  } else {
    throw new HttpsError("invalid-argument", "documentUrl host is not allowed.");
  }

  if (!objectPath.startsWith(`orders/${applicationId}/`)) {
    throw new HttpsError(
      "invalid-argument",
      "documentUrl must belong to the requested application."
    );
  }

  return parsedUrl.toString();
};

export const processDocument = onCall(
  { region: CLOUD_FUNCTION_REGION },
  async (request: CallableRequest<ProcessDocumentRequest>) => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be logged in to process documents."
      );
    }

    await assertActiveDashboardUser(request.auth.uid);

    const { documentUrl, documentType, applicationId } = request.data;
    console.log(`Processing ${documentType} for app ${applicationId}.`);

    if (!documentUrl || !documentType || !applicationId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: documentUrl, documentType, applicationId."
      );
    }

    try {
      // Determine processor ID based on document type
      let processorId: string;
      if (documentType === "passport") {
        processorId = PASSPORT_PROCESSOR_ID;
      } else if (documentType === "vehicle_grant") {
        processorId = VEHICLE_GRANT_PROCESSOR_ID;
      } else {
        throw new HttpsError(
          "invalid-argument",
          "Invalid documentType. Must be 'passport' or 'vehicle_grant'."
        );
      }

      const safeDocumentUrl = validateStorageDownloadUrl(documentUrl, applicationId);
      const PROJECT_ID = admin.app().options.projectId || "thaidrive-b7eb4";
      console.log(`Using Project ID for Document AI: ${PROJECT_ID}`);

      // Download only project-owned Firebase Storage documents.
      const response = await fetch(safeDocumentUrl);
      if (!response.ok) {
        throw new HttpsError(
          "internal",
          "Failed to download document from the provided URL."
        );
      }
      const contentLength = Number(response.headers.get("content-length") || "0");
      if (contentLength > MAX_DOCUMENT_BYTES) {
        throw new HttpsError("invalid-argument", "Document exceeds the 10MB limit.");
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_DOCUMENT_BYTES) {
        throw new HttpsError("invalid-argument", "Document exceeds the 10MB limit.");
      }
      const buffer = Buffer.from(arrayBuffer);
      const encodedImage = buffer.toString("base64");
      const mimeType = (response.headers.get("content-type") || "application/pdf")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
        throw new HttpsError("invalid-argument", "Unsupported document content type.");
      }

      // Build processor resource name
      const name = `projects/${PROJECT_ID}/locations/${DOCUMENT_AI_LOCATION}/processors/${processorId}`;

      // Call Document AI API
      const [result] = await documentAIClient.processDocument({
        name,
        rawDocument: {
          content: encodedImage,
          mimeType,
        },
        processOptions: {
          ocrConfig: {
            hints: {
              languageHints: ["en", "th"],
            },
          },
        },
      });

      const { document } = result;

      if (!document) {
        throw new HttpsError("internal", "Failed to process document.");
      }

      // Extract structured fields with individual confidence scores.
      // Form Parser returns key-value pairs from form fields on each page.
      const extractedData: Record<string, { value: string; confidence: number }> = {};
      let totalConfidence = 0;
      let count = 0;

      // Primary: Extract from Form Parser key-value fields
      if (document.pages) {
        for (const page of document.pages) {
          if (!page.formFields) continue;
          for (const field of page.formFields) {
            const keyText = field.fieldName?.textAnchor?.content?.trim() || "";
            const valueText = field.fieldValue?.textAnchor?.content?.trim() || "";
            const confidence = field.fieldValue?.confidence ?? 0;

            if (keyText && valueText) {
              // Clean up key: remove trailing colons/whitespace
              const cleanKey = keyText.replace(/[:：]\s*$/, "").trim();
              extractedData[cleanKey] = { value: valueText, confidence };
              totalConfidence += confidence;
              count++;
            }
          }
        }
      }

      // Fallback: Extract from entities (some parsers return entities instead)
      if (count === 0 && document.entities && document.entities.length > 0) {
        for (const entity of document.entities) {
          if (entity.type && entity.mentionText) {
            const confidence = entity.confidence ?? 0;
            extractedData[entity.type] = {
              value: entity.mentionText.trim(),
              confidence,
            };
            totalConfidence += confidence;
            count++;
          }
        }
      }

      // If still no structured data, extract raw text blocks as a last resort
      if (count === 0 && document.text) {
        extractedData["Raw Text"] = {
          value: document.text.substring(0, 2000), // cap at 2000 chars
          confidence: 0.5,
        };
        totalConfidence = 0.5;
        count = 1;
      }

      const overallConfidence = count > 0 ? totalConfidence / count : 0;
      const status = overallConfidence >= 0.85 ? "verified" : "needs_review";

      // Build the extracted fields array for the AI verification page
      const extractedFields = Object.entries(extractedData).map(([key, data]) => ({
        fieldName: key,
        extractedValue: data.value,
        confidence: data.confidence,
      }));

      const aiVerificationRecord = {
        applicationId,
        documentType,
        documentId: `${documentType}_${applicationId}`,
        documentImageUrl: documentUrl,
        extractedData,
        extractedFields,
        overallConfidence,
        confidenceScore: overallConfidence,
        verifiedByAI: overallConfidence >= 0.85,
        reviewedByStaff: false,
        flagged: overallConfidence < 0.7,
        status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: request.auth.uid,
      };

      // Save result to ai_verifications Firestore collection
      const verificationRef = await admin
        .firestore()
        .collection("ai_verifications")
        .add(aiVerificationRecord);

      // Update ocrScore and verification reference on the order document
      const verificationKey =
        documentType === "passport"
          ? "latestPassportVerificationId"
          : "latestVehicleGrantVerificationId";

      await admin
        .firestore()
        .collection("orders")
        .doc(applicationId)
        .update({
          ocrScore: Math.round(overallConfidence * 100), // stored as 0-100
          [verificationKey]: verificationRef.id,
        });

      return {
        success: true,
        extractedData,
        extractedFields,
        overallConfidence,
        status,
        verificationId: verificationRef.id,
      };
    } catch (error) {
      console.error("Document AI processing error:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "An error occurred while processing the document."
      );
    }
  }
);
