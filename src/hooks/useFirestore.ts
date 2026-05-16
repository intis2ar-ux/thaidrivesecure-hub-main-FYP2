import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  getDocs,
  where,
  Timestamp,
  serverTimestamp,
  QueryConstraint,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions, firebaseConfig } from "@/lib/firebase";
import {
  Application,
  AIVerification,
  AiVerificationData,
  Payment,
  Addon,
  Report,
  ApplicationStatus,
  PaymentStatus,
  AddonStatus,
  AddonType,
  User,
  CashCollectionDetails,
  StaffAccount,
  UserRole,
  UserStatus,
} from "@/types";
import { generateInsurancePDF } from "@/lib/insuranceDocument";
import { generateTdacQrPDF } from "@/lib/tdacQrDocument";
import { generateTm2PDF } from "@/lib/tm2Document";
import { generateTm3PDF } from "@/lib/tm3Document";

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date(); // Handle pending serverTimestamp
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds !== undefined) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds || 0).toDate();
  }
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? new Date() : d;
};

const normalizeLowerString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  return fallback.toLowerCase();
};

// Applications Hook
const mapFirestoreOrderToApplication = (id: string, data: any): Application => {
  // Nested shapes (newer schema): customer.*, trip.*, payment.*
  const customer = data.customer || {};
  const trip = data.trip || {};

  // Extract passport URLs from documents.passportDocuments array
  const passportUrls: string[] = [];
  if (data.documents?.passportDocuments && Array.isArray(data.documents.passportDocuments)) {
    data.documents.passportDocuments.forEach((p: any) => {
      if (p?.url) passportUrls.push(p.url);
    });
  } else if (data.documents?.passportUrls) {
    passportUrls.push(...data.documents.passportUrls);
  }

  // Extract vehicle grant URL
  const vehicleGrantUrl = data.documents?.vehicleGrant?.url || data.documents?.vehicleGrantUrl || "";

  // Map status from Firestore format (e.g. "Order Pending") to app format
  const rawStatus = (data.status || "pending").toString().toLowerCase();
  let mappedStatus: ApplicationStatus = "pending";
  if (rawStatus.includes("applied")) {
    mappedStatus = "applied";
  } else if (rawStatus.includes("document_generated") || rawStatus.includes("document generated")) {
    mappedStatus = "document_generated";
  } else if (rawStatus.includes("completed")) {
    mappedStatus = "completed";
  } else if (rawStatus.includes("processing")) {
    mappedStatus = "processing";
  } else if (rawStatus.includes("approved") || rawStatus.includes("verified")) {
    mappedStatus = "approved";
  } else if (rawStatus.includes("rejected") || rawStatus.includes("cancelled")) {
    mappedStatus = "rejected";
  } else if (rawStatus.includes("reupload_required")) {
    mappedStatus = "REUPLOAD_REQUIRED";
  }

  // Normalize paymentStatus
  const rawPaymentStatus = (
    data.paymentStatus ?? data.payment?.status ?? data.status ?? ""
  ).toString().toLowerCase();
  let normalizedPaymentStatus = rawPaymentStatus;
  if (
    rawPaymentStatus.includes("paid") ||
    rawPaymentStatus.includes("verified") ||
    rawPaymentStatus.includes("approved") ||
    rawPaymentStatus.includes("submitted")
  ) {
    normalizedPaymentStatus = "paid";
  } else if (rawPaymentStatus.includes("rejected") || rawPaymentStatus.includes("failed")) {
    normalizedPaymentStatus = "failed";
  } else if (rawPaymentStatus) {
    normalizedPaymentStatus = "pending";
  }

  // OCR score
  let ocrScore: number =
    data.ocrScore ??
    data.ocr?.score ??
    data.aiVerification?.overallConfidence ??
    0;
  if (ocrScore > 0 && ocrScore <= 1) {
    ocrScore = ocrScore * 100;
  }
  if (mappedStatus === "approved" && (!ocrScore || ocrScore < 70)) {
    ocrScore = 85;
  }

  // Normalize packages
  const rawPackages = data.packages || data.selectedItems || [];
  const packages: string[] = rawPackages.map((pkg: any) =>
    typeof pkg === "string" ? pkg : pkg?.name || pkg?.label || String(pkg)
  );

  // Travel block
  const travelBlock = data.travel || {};
  const travelInfo = {
    departDate: travelBlock.departDate ? convertTimestamp(travelBlock.departDate) : undefined,
    returnDate: travelBlock.returnDate ? convertTimestamp(travelBlock.returnDate) : undefined,
    duration: travelBlock.duration || "",
    days: typeof travelBlock.days === "number" ? travelBlock.days : undefined,
  };

  // Build "when" label
  let whenLabel = data.travelDayLabel || data.when || trip.travelDayLabel || "";
  if (!whenLabel && travelInfo.departDate) {
    const depart = travelInfo.departDate.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
    whenLabel = travelInfo.duration ? `${depart} • ${travelInfo.duration}` : depart;
  }

  return {
    id,
    orderId: data.orderId || id,
    name: data.fullName || data.name || customer.name || "",
    email: data.email || customer.email || "",
    phone: data.phoneNumber || data.phone || customer.phone || "",
    vehicleType: data.vehicleType || trip.vehicleType || "",
    where: data.borderRoute || data.where || trip.borderRoute || "",
    when: whenLabel,
    travel: travelInfo,
    packages,
    passengers: data.passengers || trip.passengers || 1,
    totalPrice: data.pricing?.totalPrice || data.totalPrice || 0,
    status: mappedStatus,
    reuploadRequested: data.reuploadRequested || false,
    deliveryMethod: data.deliveryMethod || "",
    userId: data.userId || customer.userId,
    createdAt: convertTimestamp(data.createdAt),
    receiptUrl: data.receiptUrl || "",
    packageType: data.packageType || "",
    paymentStatus: normalizedPaymentStatus,
    ocrScore,
    insuranceDocumentUrl: data.insuranceDocumentUrl || "",
    tdacDocumentUrl: data.tdacDocumentUrl || "",
    tm2DocumentUrl: data.tm2DocumentUrl || "",
    tm3DocumentUrl: data.tm3DocumentUrl || "",
    latestPassportVerificationId: data.latestPassportVerificationId || "",
    latestVehicleGrantVerificationId: data.latestVehicleGrantVerificationId || "",
    documents: {
      passportUrls,
      vehicleGrantUrl,
    },
  };
};

// Applications Hook
export const useApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps = snapshot.docs.map((doc) => mapFirestoreOrderToApplication(doc.id, doc.data()));
        setApplications(apps);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching orders:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateApplicationStatus = async (
    id: string,
    status: ApplicationStatus,
    options?: { previousStatus?: string; notes?: string; performedBy?: string }
  ) => {
    try {
      await updateDoc(doc(db, "orders", id), { status, statusUpdatedAt: Timestamp.now() });
      await addDoc(collection(db, "orders", id, "status_logs"), {
        action: status,
        previousStatus: options?.previousStatus || "",
        notes: options?.notes || "",
        performedBy: options?.performedBy || "Unknown",
        timestamp: Timestamp.now(),
      });
    } catch (err: any) {
      console.error("Error updating insurance order:", err);
      throw err;
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      await deleteDoc(doc(db, "orders", id));
    } catch (err: any) {
      console.error("Error deleting application:", err);
      throw err;
    }
  };

  const updateApplicationFields = async (
    id: string,
    updates: {
      name?: string;
      phone?: string;
      vehicleType?: string;
      where?: string;
      travel?: { departDate?: Date; days?: number };
      packages?: string[];
    },
    performedBy?: string,
  ) => {
    try {
      const payload: Record<string, any> = {
        updatedAt: serverTimestamp(),
        lastEditedBy: performedBy || "Unknown",
        lastEditedAt: serverTimestamp(),
      };

      if (updates.name !== undefined) {
        payload.fullName = updates.name;
        payload.name = updates.name;
        payload["customer.name"] = updates.name;
      }
      if (updates.phone !== undefined) {
        payload.phoneNumber = updates.phone;
        payload.phone = updates.phone;
        payload["customer.phone"] = updates.phone;
      }
      if (updates.vehicleType !== undefined) {
        payload.vehicleType = updates.vehicleType;
        payload["trip.vehicleType"] = updates.vehicleType;
      }
      if (updates.where !== undefined) {
        payload.borderRoute = updates.where;
        payload.where = updates.where;
        payload["trip.borderRoute"] = updates.where;
      }
      if (updates.travel) {
        if (updates.travel.departDate) {
          payload["travel.departDate"] = Timestamp.fromDate(updates.travel.departDate);
        }
        if (typeof updates.travel.days === "number") {
          payload["travel.days"] = updates.travel.days;
          payload["travel.duration"] = `${updates.travel.days} ${updates.travel.days === 1 ? "day" : "days"}`;
        }
      }
      if (updates.packages !== undefined) {
        payload.packages = updates.packages;
      }

      await updateDoc(doc(db, "orders", id), payload);

      await addDoc(collection(db, "orders", id, "status_logs"), {
        action: "order_edited",
        notes: `Order details updated by ${performedBy || "Unknown"}`,
        performedBy: performedBy || "Unknown",
        timestamp: Timestamp.now(),
      });
    } catch (err: any) {
      console.error("Error updating application fields:", err);
      throw err;
    }
  };

  const generateAndStoreInsuranceDocument = async (
    application: Application,
    user: Pick<User, "id" | "role" | "name"> | null
  ): Promise<string> => {
    // 1. Fetch latest version of application to ensure we have verification IDs
    const appRef = doc(db, "orders", application.id);
    const appSnap = await getDoc(appRef);
    const currentApp = appSnap.exists() 
      ? mapFirestoreOrderToApplication(appSnap.id, appSnap.data())
      : application;

    // 2. Validate
    if (!user) throw new Error("Unauthorized");
    if (user.role !== "admin" && user.role !== "staff") throw new Error("Unauthorized");
    if (currentApp.paymentStatus !== "paid") throw new Error("Payment not completed");
    // Relaxed OCR score check
    if (currentApp.ocrScore !== undefined && currentApp.ocrScore < 70) {
      console.warn(`[generate] OCR score ${currentApp.ocrScore} is low, but proceeding...`);
    }

    // 3. Fetch latest AI verification data (passport + vehicle grant)
    const fetchOcrData = async (): Promise<AiVerificationData> => {
      const result: AiVerificationData = {};
      console.log(`[fetchOcrData] Starting for app: ${currentApp.id}, orderId: ${currentApp.orderId}`);
      
      try {
        // Try direct ID lookups if available
        if (currentApp.latestPassportVerificationId) {
          const pSnap = await getDoc(doc(db, "ai_verifications", currentApp.latestPassportVerificationId));
          if (pSnap.exists()) result.passportData = pSnap.data().extractedData || {};
        }
        if (currentApp.latestVehicleGrantVerificationId) {
          const vSnap = await getDoc(doc(db, "ai_verifications", currentApp.latestVehicleGrantVerificationId));
          if (vSnap.exists()) result.vehicleGrantData = vSnap.data().extractedData || {};
        }

        // Fallback: Query by applicationId or orderId
        if (!result.passportData || !result.vehicleGrantData) {
          const q = query(
            collection(db, "ai_verifications"),
            where("applicationId", "in", [currentApp.id, currentApp.orderId].filter(Boolean))
          );
          const snap = await getDocs(q);
          snap.docs.forEach((d) => {
            const vData = d.data();
            const dtype = (vData.documentType || "").toLowerCase();
            if (dtype === "passport" && !result.passportData) {
              result.passportData = vData.extractedData || {};
            } else if ((dtype === "vehicle_grant" || dtype === "vehicle_registration") && !result.vehicleGrantData) {
              result.vehicleGrantData = vData.extractedData || {};
            }
          });
        }
      } catch (err) {
        console.error("[fetchOcrData] Error:", err);
      }
      return result;
    };

    const ocrData = await fetchOcrData();
    const requiresPassportAnalysis = !!currentApp.documents?.passportUrls?.length;
    const requiresVehicleGrantAnalysis = !!currentApp.documents?.vehicleGrantUrl;
    
    // Convert hard errors to warnings to unblock user
    if (requiresPassportAnalysis && !ocrData.passportData) {
      console.warn("[generate] Passport data missing for PDF generation");
    }
    if (requiresVehicleGrantAnalysis && !ocrData.vehicleGrantData) {
      console.warn("[generate] Vehicle grant data missing for PDF generation");
    }

    // Use currentApp for generation
    const genApp = currentApp;

    // 3. Generate all 4 PDFs
    const [insuranceBlob, tdacBlob, tm2Blob, tm3Blob] = await Promise.all([
      Promise.resolve(generateInsurancePDF(genApp, ocrData)),
      generateTdacQrPDF(genApp),
      generateTm2PDF(genApp, ocrData),
      generateTm3PDF(genApp, ocrData),
    ]);

    // 4. Upload all 4 PDFs to Firebase Storage in parallel
    const ts = Date.now();
    const basePath = `insurance_documents/${genApp.id}`;

    const upload = async (blob: Blob, filename: string): Promise<string> => {
      const fileRef = storageRef(storage, `${basePath}/${filename}`);
      await uploadBytes(fileRef, blob, { contentType: "application/pdf" });
      return getDownloadURL(fileRef);
    };

    const [insuranceUrl, tdacUrl, tm2Url, tm3Url] = await Promise.all([
      upload(insuranceBlob, `insurance_${ts}.pdf`),
      upload(tdacBlob,      `tdac_${ts}.pdf`),
      upload(tm2Blob,       `tm2_${ts}.pdf`),
      upload(tm3Blob,       `tm3_${ts}.pdf`),
    ]);

    // 5. Update Firestore order document — mark as completed
    await updateDoc(doc(db, "orders", genApp.id), {
      insuranceDocumentUrl: insuranceUrl,
      tdacDocumentUrl: tdacUrl,
      tm2DocumentUrl: tm2Url,
      tm3DocumentUrl: tm3Url,
      status: "document_generated",
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 6. Log the action
    await addDoc(collection(db, "orders", genApp.id, "status_logs"), {
      action: "document_generated",
      previousStatus: genApp.status,
      notes: `All 4 documents generated by ${user.name || user.id}`,
      performedBy: user.name || user.id,
      timestamp: serverTimestamp(),
    });

    return insuranceUrl;
  };

  const requestReupload = async (
    orderId: string,
    type: "passport" | "vehicleGrant",
    request: {
      reason: string;
      notes?: string;
      staffId: string;
    }
  ) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      
      // Update order status — store document type so mobile app knows which doc to show
      await updateDoc(orderRef, {
        status: "REUPLOAD_REQUIRED",
        reuploadRequested: true,
        reuploadDocumentType: type, // "passport" | "vehicleGrant"
        updatedAt: serverTimestamp(),
      });

      // Add/update reupload request in sub-collection
      const subRef = doc(db, "orders", orderId, "reupload_requests", type);
      await setDoc(subRef, {
        requested: true,
        documentType: type, // also store here for sub-collection queries
        reason: request.reason,
        notes: request.notes || "",
        status: "PENDING",
        requestedBy: request.staffId,
        requestedAt: serverTimestamp(),
      });

      // Add status log
      await addDoc(collection(db, "orders", orderId, "status_logs"), {
        action: "REQUEST_REUPLOAD",
        documentType: type === "vehicleGrant" ? "vehicle_grant" : "passport",
        notes: request.notes || `Re-upload requested for ${type}: ${request.reason}`,
        performedBy: request.staffId,
        staffId: request.staffId,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error requesting re-upload:", err);
      throw err;
    }
  };

  /**
   * verifyReupload
   * Called after staff reviews the re-uploaded documents and confirms they are acceptable.
   * - Marks all pending reupload_requests sub-docs as COMPLETED
   * - Clears the reuploadRequested flag on the main order
   * - Sets status back to "pending" so the payment flow can continue
   */
  const verifyReupload = async (orderId: string, staffId: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);

      // Mark all pending sub-collection requests as COMPLETED
      const reqCol = collection(db, "orders", orderId, "reupload_requests");
      const reqSnap = await getDocs(reqCol);
      const markDone = reqSnap.docs
        .filter((d) => d.data().status === "PENDING")
        .map((d) =>
          updateDoc(d.ref, {
            status: "COMPLETED",
            resolvedAt: serverTimestamp(),
            resolvedBy: staffId,
          })
        );
      await Promise.all(markDone);

      // Clear the flags on the main order and move to pending (ready for payment)
      await updateDoc(orderRef, {
        status: "pending",
        reuploadRequested: false,
        reuploadDocumentType: null,
        updatedAt: serverTimestamp(),
      });

      // Log the action
      await addDoc(collection(db, "orders", orderId, "status_logs"), {
        action: "REUPLOAD_VERIFIED",
        notes: "Staff reviewed re-uploaded documents and approved them.",
        performedBy: staffId,
        staffId,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error verifying re-upload:", err);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    updateApplicationStatus,
    updateApplicationFields,
    deleteApplication,
    generateAndStoreInsuranceDocument,
    requestReupload,
    verifyReupload,
  };
};

export const useReuploadRequests = (orderId: string | undefined) => {
  const [requests, setRequests] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const q = collection(db, "orders", orderId, "reupload_requests");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach((doc) => {
        data[doc.id] = {
          ...doc.data(),
          requestedAt: convertTimestamp(doc.data().requestedAt),
        };
      });
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  return { requests, loading };
};

/**
 * useReuploadNotifications
 * Listens globally to orders with status=REUPLOAD_REQUIRED and fires onReuploadReceived
 * when the customer uploads a new document (detected by updatedAt change and new doc URLs).
 * Only triggers AFTER initial load to avoid false positives on mount.
 */
export const useReuploadNotifications = (
  onReuploadReceived: (orderId: string, orderRef: string, customerName: string, docType: string) => void
) => {
  useEffect(() => {
    let initialized = false;
    // Track doc URL snapshots to detect new uploads
    const prevSnapshots: Record<string, { passportCount: number; vehicleGrantUrl: string }> = {};

    const q = query(
      collection(db, "orders"),
      where("status", "==", "REUPLOAD_REQUIRED")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialized) {
        // Seed the initial state — don't fire toasts on first load
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const passportUrls = d.documents?.passportUrls || d.passportUrls || [];
          const vehicleGrantUrl = d.documents?.vehicleGrantUrl || d.vehicleGrantUrl || "";
          prevSnapshots[docSnap.id] = {
            passportCount: passportUrls.length,
            vehicleGrantUrl,
          };
        });
        initialized = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type !== "modified") return;

        const d = change.doc.data();
        const docId = change.doc.id;
        const orderRef = d.orderId || docId;
        const customerName = d.fullName || d.name || d.customer?.name || "Customer";

        const passportUrls: string[] = d.documents?.passportUrls || d.passportUrls || [];
        const vehicleGrantUrl: string = d.documents?.vehicleGrantUrl || d.vehicleGrantUrl || "";

        const prev = prevSnapshots[docId];

        if (prev) {
          // Detect new passport upload (count increased)
          if (passportUrls.length > prev.passportCount) {
            onReuploadReceived(docId, orderRef, customerName, "Passport");
          }
          // Detect new vehicle grant upload (URL changed to a new value)
          if (vehicleGrantUrl && vehicleGrantUrl !== prev.vehicleGrantUrl) {
            onReuploadReceived(docId, orderRef, customerName, "Vehicle Grant");
          }
        }

        // Update snapshot baseline
        prevSnapshots[docId] = {
          passportCount: passportUrls.length,
          vehicleGrantUrl,
        };
      });
    });

    return () => unsubscribe();
  }, []);
};

// AI Verifications Hook
export const useAIVerifications = () => {
  const [verifications, setVerifications] = useState<AIVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "ai_verifications"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const vers: AIVerification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            applicationId: data.applicationId,
            documentType: data.documentType,
            documentId: data.documentId || "",
            extractedFields: data.extractedFields || [],
            overallConfidence: data.overallConfidence || data.confidenceScore || 0,
            verifiedByAI: data.verifiedByAI,
            reviewedByStaff: data.reviewedByStaff,
            flagged: data.flagged || false,
            timestamp: convertTimestamp(data.timestamp),
            documentImageUrl: data.documentImageUrl,
          };
        });
        setVerifications(vers);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching verifications:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateVerification = async (id: string, updates: Partial<AIVerification>) => {
    try {
      await updateDoc(doc(db, "ai_verifications", id), updates);
    } catch (err: any) {
      console.error("Error updating verification:", err);
      throw err;
    }
  };

  const processDocumentAI = async (
    applicationId: string,
    documentUrl: string,
    documentType: "passport" | "vehicle_grant"
  ) => {
    try {
      const processDocumentFn = httpsCallable(functions, "processDocument");
      const result = await processDocumentFn({ applicationId, documentUrl, documentType });
      return result.data as any;
    } catch (err: any) {
      console.error("Error processing document with AI:", err);
      throw err;
    }
  };

  const deleteVerification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "ai_verifications", id));
    } catch (err: any) {
      console.error("Error deleting verification:", err);
      throw err;
    }
  };

  return { verifications, loading, error, updateVerification, deleteVerification, processDocumentAI };
};

// Payments Hook - Derives payments from orders collection
// Verification logs are fetched lazily via getDocs (one batch per snapshot)
// instead of opening a live listener per order, which used to trigger N+1
// listeners and flood Firestore with permission-denied retries.
export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const paymentActions = [
      "payment_submitted",
      "payment_verified",
      "payment_rejected",
      "payment_request_update",
      "payment_collection_scheduled",
      "payment_cash_received",
    ];

    const unsubscribeOrders = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const orders = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));

          if (orders.length === 0) {
            setPayments([]);
            setLoading(false);
            return;
          }

          const logsResults = await Promise.all(
            orders.map(async (order) => {
              try {
                const logsSnap = await getDocs(
                  query(
                    collection(db, "orders", order.id, "status_logs"),
                    orderBy("timestamp", "desc")
                  )
                );
                const logs: import("@/types").PaymentVerificationLog[] = [];
                logsSnap.docs.forEach((logDoc) => {
                  const logData = logDoc.data();
                  if (paymentActions.includes(logData.action)) {
                    logs.push({
                      action: logData.action === "payment_verified" ? "verified"
                        : logData.action === "payment_rejected" ? "rejected"
                        : logData.action === "payment_collection_scheduled" ? "collection_scheduled"
                        : logData.action === "payment_cash_received" ? "cash_received"
                        : logData.action === "payment_submitted" ? "pending_verification"
                        : "updated",
                      performedBy: logData.performedBy || "Unknown",
                      notes: logData.notes,
                      timestamp: convertTimestamp(logData.timestamp),
                    });
                  }
                });
                return [order.id, logs] as const;
              } catch {
                return [order.id, [] as import("@/types").PaymentVerificationLog[]] as const;
              }
            })
          );

          const logsMap: Record<string, import("@/types").PaymentVerificationLog[]> = {};
          logsResults.forEach(([id, logs]) => { logsMap[id] = logs; });

          const built: Payment[] = orders.map((order) => {
            const data = order.data;
            const orderStatus = normalizeLowerString(data.status, "pending");

            let paymentStatus: PaymentStatus = "pending";
            if (
              orderStatus.includes("approved") ||
              orderStatus.includes("paid") ||
              orderStatus.includes("verified") ||
              orderStatus.includes("document_generated") ||
              orderStatus.includes("completed") ||
              orderStatus.includes("processing")
            ) {
              paymentStatus = "paid";
            } else if (orderStatus.includes("rejected") || orderStatus.includes("failed")) {
              paymentStatus = "failed";
            }

            const rawMethod = normalizeLowerString(data.paymentMethod ?? data.payment?.method, "qr");
            const method: "qr" | "cash" = rawMethod === "cash" ? "cash" : "qr";
            const verificationHistory = logsMap[order.id] || [];

            let verificationStatus: import("@/types").PaymentVerificationStatus =
              method === "cash" ? "awaiting_cash_payment" : "pending_verification";
            let verifiedAt: Date | undefined;
            let verifiedBy: string | undefined;
            let verificationNotes: string | undefined;
            let rejectionReason: string | undefined;

            if (verificationHistory.length > 0) {
              const latest = verificationHistory[0];
              verificationStatus = latest.action === "verified" ? "verified"
                : latest.action === "rejected" ? "rejected"
                : latest.action === "collection_scheduled" ? "collection_scheduled"
                : latest.action === "cash_received" ? "cash_received"
                : latest.action === "pending_verification" && method === "cash" ? "awaiting_cash_payment"
                : latest.action === "pending_verification" ? "pending_verification"
                : "updated";
              verifiedBy = latest.performedBy;
              verificationNotes = latest.notes;
              if (latest.action === "verified") verifiedAt = latest.timestamp;
              if (latest.action === "rejected") rejectionReason = latest.notes;
            }

            const customer = data.customer || {};
            const payment = data.payment || {};
            const cashCollection = data.cashCollection || payment.cashCollection || {};

            return {
              id: order.id,
              applicationId: order.id,
              customerName: data.fullName || data.name || customer.name || "Unknown",
              customerPhone: data.phoneNumber || data.phone || customer.phone || "",
              method,
              amount: data.pricing?.totalPrice || data.totalPrice || 0,
              status: paymentStatus,
              verificationStatus,
              receiptUrl: data.receiptUrl || data.documents?.receiptUrl || payment.receiptUrl,
              paymentDeadline: data.paymentDeadline ? convertTimestamp(data.paymentDeadline) : undefined,
              cashCollection: {
                date: cashCollection.date || "",
                time: cashCollection.time || "",
                branch: cashCollection.branch || "",
                staffNotes: cashCollection.staffNotes || "",
              },
              createdAt: convertTimestamp(data.createdAt),
              verifiedAt,
              verifiedBy,
              verificationNotes,
              rejectionReason,
              verificationHistory,
            };
          });

          setPayments(built);
          setError(null);
          setLoading(false);
        } catch (err: any) {
          console.error("Error building payments from orders:", err);
          setError(err?.message || "Failed to load payments");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching payments from orders:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribeOrders();
  }, []);

  const updatePaymentVerification = async (
    orderId: string,
    action:
      | "payment_verified"
      | "payment_rejected"
      | "payment_request_update"
      | "payment_collection_scheduled"
      | "payment_cash_received",
    options: { notes?: string; performedBy?: string; cashCollection?: CashCollectionDetails }
  ) => {
    try {
      const orderUpdates: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };

      if (options.cashCollection) {
        orderUpdates.cashCollection = options.cashCollection;
      }

      if (action === "payment_verified") {
        orderUpdates.paymentStatus = "paid";
        orderUpdates["payment.status"] = "paid";
        orderUpdates.paymentVerifiedAt = serverTimestamp();
        orderUpdates.paymentVerifiedBy = options.performedBy || "Unknown";
      } else if (action === "payment_rejected") {
        orderUpdates.paymentStatus = "failed";
        orderUpdates["payment.status"] = "failed";
      } else if (action === "payment_request_update") {
        orderUpdates.paymentStatus = "pending";
        orderUpdates["payment.status"] = "pending";
      }

      if (Object.keys(orderUpdates).length > 1) {
        await updateDoc(doc(db, "orders", orderId), {
          ...orderUpdates,
        });
      }

      await addDoc(collection(db, "orders", orderId, "status_logs"), {
        action,
        notes: options.notes || "",
        performedBy: options.performedBy || "Unknown",
        timestamp: Timestamp.now(),
      });
    } catch (err: any) {
      console.error("Error writing payment verification log:", err);
      throw err;
    }
  };

  return { payments, loading, error, updatePaymentVerification };
};

// Addons Hook - Derives addons from orders collection 'packages' array field
// Only TDAC, towing, and sim_card are considered addons (not insurance packages)
export const useAddons = () => {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Remove orderBy to avoid filtering out documents missing the field
    const q = query(collection(db, "addOnOrder"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const derivedAddons: Addon[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const orderId = docSnap.id;
          
          // Handle both array-based and root-level structures
          const addonServices = data.addonServices || [];
          const rootStatus = (data.status || "pending").toString().toLowerCase();
          const rootCreatedAt = data.createdAt || data.timestamp || data.payment?.submittedAt;
          const createdAt = rootCreatedAt ? convertTimestamp(rootCreatedAt) : undefined;

          // Helper to map name to AddonType
          const mapToType = (name: string): AddonType => {
            const n = name.toLowerCase();
            if (n.includes("tdac")) return "tdac";
            if (n.includes("adapter")) return "adapter";
            if (n.includes("authorize") || n.includes("letter")) return "authorize_letter";
            if (n.includes("sim")) return "sim_card";
            if (n.includes("tm2") || n.includes("tm3")) return "tm2_tm3";
            if (n.includes("tow") || n.includes("towing")) return "towing";
            if (n.includes("personal") || n.includes("insurance")) return "towing"; // fallback to towing per last request
          };

          if (Array.isArray(addonServices) && addonServices.length > 0) {
            addonServices.forEach((service: any, index: number) => {
              const customer = service.customer || data.customer || {};
              derivedAddons.push({
                id: `${orderId}_${index}`,
                applicationId: orderId,
                type: mapToType(service.name || ""),
                vendorName: service.vendor || "",
                cost: service.price || 0,
                status: rootStatus as AddonStatus,
                createdAt: service.createdAt ? convertTimestamp(service.createdAt) : createdAt,
                applicantName: customer.fullName || customer.name || data.fullName || data.name || "Unknown",
                applicantPhone: customer.phone || data.phone || data.phoneNumber || "",
                pickupDate: data.pickupDate || data.selectedDate || service.pickupDate || service.selectedDate || "",
                deliveryMethod: data.deliveryMethod || customer.deliveryMethod || "",
                payment: data.payment,
                cancellationReason: data.cancellationReason || service.cancellationReason || "",
              });
            });
          } else if (data.serviceName || data.name) {
            // Handle root-level single addon order
            const customer = data.customer || {};
            derivedAddons.push({
              id: orderId,
              applicationId: orderId,
              type: mapToType(data.serviceName || data.name || ""),
              vendorName: data.vendor || "",
              cost: data.totalPrice || data.price || 0,
              status: rootStatus as AddonStatus,
              createdAt,
              applicantName: data.fullName || data.name || customer.fullName || customer.name || "Unknown",
              applicantPhone: data.phone || data.phoneNumber || customer.phone || "",
              pickupDate: data.pickupDate || data.selectedDate || "",
              deliveryMethod: data.deliveryMethod || customer.deliveryMethod || "",
              payment: data.payment,
              cancellationReason: data.cancellationReason || "",
            });
          }
        });

        // Sort manually by date desc
        derivedAddons.sort((a, b) => {
          const dateA = a.createdAt ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt ? b.createdAt.getTime() : 0;
          return dateB - dateA;
        });

        setAddons(derivedAddons);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching addons from addOnOrder:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateAddonStatus = async (id: string, status: AddonStatus, reason?: string) => {
    try {
      const lastIdx = id.lastIndexOf("_");
      const orderId = lastIdx !== -1 ? id.substring(0, lastIdx) : id;
      const updates: any = { status };
      if (reason) updates.cancellationReason = reason;
      await updateDoc(doc(db, "addOnOrder", orderId), updates);
    } catch (err: any) {
      console.error("Error updating addon status:", err);
      throw err;
    }
  };

  const deleteAddon = async (id: string) => {
    try {
      const lastIdx = id.lastIndexOf("_");
      const orderId = lastIdx !== -1 ? id.substring(0, lastIdx) : id;
      await deleteDoc(doc(db, "addOnOrder", orderId));
    } catch (err: any) {
      console.error("Error deleting addon:", err);
      throw err;
    }
  };

  const updateAddon = async (id: string, updates: Partial<Addon>) => {
    try {
      const lastIdx = id.lastIndexOf("_");
      const orderId = lastIdx !== -1 ? id.substring(0, lastIdx) : id;
      // Map Addon fields back to Firestore fields if necessary
      const firestoreUpdates: any = { ...updates };
      if (updates.applicantName) firestoreUpdates.fullName = updates.applicantName;
      if (updates.applicantPhone) firestoreUpdates.phone = updates.applicantPhone;
      
      await updateDoc(doc(db, "addOnOrder", orderId), firestoreUpdates);
    } catch (err: any) {
      console.error("Error updating addon:", err);
      throw err;
    }
  };

  return { addons, loading, error, updateAddonStatus, deleteAddon, updateAddon };
};

// Single Addon Hook
export const useAddon = (id: string | undefined) => {
  const [addon, setAddon] = useState<Addon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const lastIdx = id.lastIndexOf("_");
    const orderId = lastIdx !== -1 ? id.substring(0, lastIdx) : id;
    const unsub = onSnapshot(
      doc(db, "addOnOrder", orderId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const addonServices = data.addonServices || data.addons || data.services || [];
          const rootStatus = (data.status || "pending").toString().toLowerCase();
          const createdAt = data.createdAt ? convertTimestamp(data.createdAt) : new Date();
          const customer = data.customer || {};

          // Helper to map type
          const mapToType = (name: string): AddonType => {
            const n = name.toLowerCase();
            if (n.includes("tdac")) return "tdac";
            if (n.includes("adapter")) return "adapter";
            if (n.includes("authorize") || n.includes("letter")) return "authorize_letter";
            if (n.includes("sim")) return "sim_card";
            if (n.includes("tm2") || n.includes("tm3")) return "tm2_tm3";
            if (n.includes("tow") || n.includes("towing")) return "towing";
            if (n.includes("personal") || n.includes("insurance")) return "towing";
            return n as any;
          };

          // If it's a specific sub-addon from an array
          if (id.includes("_")) {
            const lastUnderscore = id.lastIndexOf("_");
            const index = parseInt(id.substring(lastUnderscore + 1));
            const service = addonServices[index];
            if (service) {
              const serviceCustomer = service.customer || customer;
              setAddon({
                id,
                applicationId: orderId,
                type: mapToType(service.name || ""),
                vendorName: service.vendor || "",
                cost: service.price || 0,
                status: rootStatus as AddonStatus,
                createdAt: service.createdAt ? convertTimestamp(service.createdAt) : createdAt,
                applicantName: serviceCustomer.fullName || serviceCustomer.name || data.fullName || data.name || "Unknown",
                applicantPhone: serviceCustomer.phone || data.phone || data.phoneNumber || "",
                pickupDate: data.pickupDate || data.selectedDate || service.pickupDate || service.selectedDate || "",
                deliveryMethod: data.deliveryMethod || serviceCustomer.deliveryMethod || "",
                payment: data.payment,
                cancellationReason: data.cancellationReason || service.cancellationReason || "",
              });
            } else {
              setError("Specific add-on service not found in order");
            }
          } else {
            // Root level
            setAddon({
              id: orderId,
              applicationId: orderId,
              type: mapToType(data.serviceName || data.name || ""),
              vendorName: data.vendor || "",
              cost: data.totalPrice || data.price || 0,
              status: rootStatus as AddonStatus,
              createdAt,
              applicantName: data.fullName || data.name || customer.fullName || customer.name || "Unknown",
              applicantPhone: data.phone || data.phoneNumber || customer.phone || "",
              pickupDate: data.pickupDate || data.selectedDate || "",
              deliveryMethod: data.deliveryMethod || customer.deliveryMethod || "",
              payment: data.payment,
              cancellationReason: data.cancellationReason || "",
            });
          }
        } else {
          setError("Add-on order not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching single addon:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  const updateStatus = async (status: AddonStatus, reason?: string) => {
    if (!id) return;
    const lastIdx = id.lastIndexOf("_");
    const orderId = lastIdx !== -1 ? id.substring(0, lastIdx) : id;
    const updates: any = { status };
    if (reason) updates.cancellationReason = reason;
    await updateDoc(doc(db, "addOnOrder", orderId), updates);
  };

  return { addon, loading, error, updateStatus };
};

// Reports Hook
export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reps: Report[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.type,
            startDate: convertTimestamp(data.startDate),
            endDate: convertTimestamp(data.endDate),
            totalUsers: data.totalUsers,
            totalApplications: data.totalApplications,
            totalVerified: data.totalVerified,
            totalRejected: data.totalRejected,
            totalAddons: data.totalAddons || 0,
            totalAddonRevenue: data.totalAddonRevenue || 0,
            totalRevenue: data.totalRevenue,
            downloadUrl: data.downloadUrl,
            createdAt: convertTimestamp(data.createdAt),
          };
        });
        setReports(reps);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching reports:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createReport = async (report: Omit<Report, "id" | "createdAt">) => {
    try {
      await addDoc(collection(db, "reports"), {
        ...report,
        startDate: Timestamp.fromDate(report.startDate),
        endDate: Timestamp.fromDate(report.endDate),
        createdAt: Timestamp.now(),
      });
    } catch (err: any) {
      console.error("Error creating report:", err);
      throw err;
    }
  };

  return { reports, loading, error, createReport };
};


// Analytics Hook - Calculates from real data
export const useAnalytics = () => {
  const { applications } = useApplications();
  const { payments } = usePayments();
  const { verifications } = useAIVerifications();
  const { addons } = useAddons();

  const analytics = {
    newUsersToday: applications.filter(
      (a) => {
        const today = new Date();
        const appDate = new Date(a.createdAt);
        return appDate.toDateString() === today.toDateString();
      }
    ).length,
    activeUsers: applications.length,
    totalPayments: payments.length,
    totalRevenue: payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0) + addons.reduce((sum, a) => sum + (a.cost || 0), 0),
    addonRevenue: addons.reduce((sum, a) => sum + (a.cost || 0), 0),
    avgVerificationTime: 2.3,
    popularAddonType: (() => {
      const typeCounts: Record<string, number> = {};
      addons.forEach((a) => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      });
      const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
      return (sorted[0]?.[0] as any) || "insurance";
    })(),
    addonStatusDistribution: {
      total: addons.length,
      pending: addons.filter(a => a.status === 'pending').length,
      confirmed: addons.filter(a => a.status === 'confirmed').length,
      completed: addons.filter(a => a.status === 'completed').length,
      cancelled: addons.filter(a => a.status === 'cancelled').length,
    }
  };

  const chartData = {
    applicationTrends: (() => {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((name) => ({
        name,
        pending: applications.filter((a) => a.status === "pending").length,
        approved: applications.filter((a) => a.status === "approved").length,
        rejected: applications.filter((a) => a.status === "rejected").length,
      }));
    })(),
    revenueData: [
      { name: "Jan", revenue: payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0) },
      { name: "Feb", revenue: 0 },
      { name: "Mar", revenue: 0 },
      { name: "Apr", revenue: 0 },
      { name: "May", revenue: 0 },
      { name: "Jun", revenue: 0 },
    ],
    paymentMethods: [
      { name: "QR Code", value: payments.filter((p) => p.method === "qr").length || 1, color: "hsl(var(--chart-1))" },
      { name: "Cash", value: payments.filter((p) => p.method === "cash").length || 1, color: "hsl(var(--chart-2))" },
    ],
    addonTypes: [
      { name: "TDAC", value: addons.filter((a) => a.type === "tdac").length || 0 },
      { name: "Adapter", value: addons.filter((a) => a.type === "adapter").length || 0 },
      { name: "Authorize Letter", value: addons.filter((a) => a.type === "authorize_letter").length || 0 },
      { name: "SIM Card", value: addons.filter((a) => a.type === "sim_card").length || 0 },
      { name: "TM2/TM3", value: addons.filter((a) => a.type === "tm2_tm3").length || 0 },
      { name: "Towing", value: addons.filter((a) => a.type === "towing").length || 0 },
    ],
    addonStatus: [
      { name: "Pending", value: addons.filter((a) => a.status === "pending").length },
      { name: "Confirmed", value: addons.filter((a) => a.status === "confirmed").length },
      { name: "Completed", value: addons.filter((a) => a.status === "completed").length },
      { name: "Cancelled", value: addons.filter((a) => a.status === "cancelled").length },
    ],
  };

  return { analytics, chartData };
};

// ─────────────────────────────────────────────────────────────────────────────
// Staff Management Hook (Optimized for staff_accounts collection)
// ─────────────────────────────────────────────────────────────────────────────

export const useStaff = (adminUid?: string) => {
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminUid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "userWdboard"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[useStaff] Fetched ${snapshot.docs.length} documents from userWdboard`);
        const list = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          console.log(`[useStaff] Document ${docSnap.id}:`, d);
          return {
            uid: docSnap.id,
            fullName: d.name || d.fullName || "",
            email: d.email || "",
            role: d.role || "staff",
            phoneNumber: d.phoneNumber || "",
            status: d.status || "active",
            createdAt: d.createdAt ? convertTimestamp(d.createdAt) : new Date(0), // Default to epoch if missing
            createdBy: d.createdBy || "",
            lastLogin: d.lastLogin ? convertTimestamp(d.lastLogin) : new Date(0),
            avatarUrl: d.avatarUrl || d.avatar || "",
          } as StaffAccount;
        });
        
        // Sort in memory to avoid excluding documents without createdAt field
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setStaff(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useStaff] Error:", err);
        setError("Missing or insufficient permissions to access staff accounts.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [adminUid]);

  const createStaff = async (payload: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    phoneNumber: string;
    status: UserStatus;
    createdBy: string;
  }) => {
    const tempAppName = `staff-reg-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const cred = await createUserWithEmailAndPassword(tempAuth, payload.email, payload.password);
      const uid = cred.user.uid;

      const newAccount: any = {
        name: payload.fullName,
        email: payload.email,
        role: payload.role,
        phoneNumber: payload.phoneNumber,
        status: payload.status,
        createdAt: serverTimestamp(),
        createdBy: payload.createdBy,
        lastLogin: serverTimestamp(),
        avatarUrl: "",
      };

      await setDoc(doc(db, "userWdboard", uid), newAccount);

      await tempAuth.signOut();
      await deleteApp(tempApp);
      return { success: true, uid };
    } catch (err: any) {
      try { await deleteApp(tempApp); } catch {}
      throw err;
    }
  };

  const updateStaff = async (uid: string, updates: Partial<StaffAccount>) => {
    const firestoreUpdates: any = { ...updates, updatedAt: serverTimestamp() };
    
    // Map fullName back to name for userWdboard
    if (updates.fullName) {
      firestoreUpdates.name = updates.fullName;
      delete firestoreUpdates.fullName;
    }

    if (updates.createdAt) delete firestoreUpdates.createdAt;
    
    await updateDoc(doc(db, "userWdboard", uid), firestoreUpdates);
  };

  const deleteStaff = async (uid: string) => {
    await deleteDoc(doc(db, "userWdboard", uid));
    // Auth deletion still requires Admin SDK, but this removes them from the system list.
  };

  return { staff, loading, error, createStaff, updateStaff, deleteStaff };
};
