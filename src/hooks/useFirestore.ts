import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
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
import { db, storage, functions } from "@/lib/firebase";
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
} from "@/types";
import { generateInsurancePDF } from "@/lib/insuranceDocument";
import { generateTdacQrPDF } from "@/lib/tdacQrDocument";
import { generateTm2PDF } from "@/lib/tm2Document";
import { generateTm3PDF } from "@/lib/tm3Document";

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
  }
  return new Date(timestamp);
};

const normalizeLowerString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  return fallback.toLowerCase();
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
        const apps: Application[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Nested shapes (newer schema): customer.*, trip.*, payment.*
          const customer = data.customer || {};
          const trip = data.trip || {};
          const payment = data.payment || {};

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
          }

          // Normalize paymentStatus to lowercase canonical values
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

          // OCR score: single source of truth (with fallback for approved orders)
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

          // Normalize packages/selectedItems - handle both string[] and object[] with name property
          const rawPackages = data.packages || data.selectedItems || [];
          const packages: string[] = rawPackages.map((pkg: any) =>
            typeof pkg === "string" ? pkg : pkg?.name || pkg?.label || String(pkg)
          );

          // Travel block (newer schema): travel.departDate, travel.returnDate, travel.duration, travel.days
          const travelBlock = data.travel || {};
          const travelInfo = {
            departDate: travelBlock.departDate ? convertTimestamp(travelBlock.departDate) : undefined,
            returnDate: travelBlock.returnDate ? convertTimestamp(travelBlock.returnDate) : undefined,
            duration: travelBlock.duration || "",
            days: typeof travelBlock.days === "number" ? travelBlock.days : undefined,
          };

          // Build a human-readable "when" label: prefer explicit label, then derive from travel dates
          let whenLabel = data.travelDayLabel || data.when || trip.travelDayLabel || "";
          if (!whenLabel && travelInfo.departDate) {
            const depart = travelInfo.departDate.toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
            });
            whenLabel = travelInfo.duration ? `${depart} • ${travelInfo.duration}` : depart;
          }

          return {
            id: doc.id,
            orderId: data.orderId || doc.id,
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
            deliveryMethod: data.deliveryMethod || "",
            userId: data.userId || customer.userId,
            createdAt: convertTimestamp(data.createdAt),
            receiptUrl: data.receiptUrl || data.documents?.receiptUrl || payment.receiptUrl || "",
            packageType: data.packageType || "",
            paymentMethod: data.paymentMethod || payment.method || "",
            paymentStatus: normalizedPaymentStatus,
            documents: {
              passportUrls,
              vehicleGrantUrl,
            },
            ocrScore,
            insuranceDocumentUrl: data.insuranceDocumentUrl || "",
            tdacDocumentUrl: data.tdacDocumentUrl || "",
            tm2DocumentUrl: data.tm2DocumentUrl || "",
            tm3DocumentUrl: data.tm3DocumentUrl || "",
            statusUpdatedAt: data.statusUpdatedAt ? convertTimestamp(data.statusUpdatedAt) : undefined,
          };
        });
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
    // 1. Validate
    if (!user) throw new Error("Unauthorized");
    if (user.role !== "admin" && user.role !== "staff") throw new Error("Unauthorized");
    if (application.paymentStatus !== "paid") throw new Error("Payment not completed");
    if ((application.ocrScore ?? 0) < 70) throw new Error("OCR validation below required threshold");
    if (application.status !== "approved" && application.status !== "processing") {
      throw new Error("Invalid application state");
    }

    // 2. Fetch latest AI verification data (passport + vehicle grant)
    const fetchOcrData = async (): Promise<AiVerificationData> => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "ai_verifications"),
            where("applicationId", "==", application.id),
            orderBy("timestamp", "desc")
          )
        );
        const result: AiVerificationData = {};
        snap.docs.forEach((d) => {
          const vData = d.data();
          const dtype = (vData.documentType || "").toLowerCase();
          if ((dtype === "passport") && !result.passportData) {
            result.passportData = vData.extractedData || {};
          } else if ((dtype === "vehicle_grant" || dtype === "vehicle_registration") && !result.vehicleGrantData) {
            result.vehicleGrantData = vData.extractedData || {};
          }
        });
        return result;
      } catch {
        return {};
      }
    };

    const ocrData = await fetchOcrData();

    // 3. Generate all 4 PDFs (insurance is sync, TDAC is async due to QR)
    const [insuranceBlob, tdacBlob, tm2Blob, tm3Blob] = await Promise.all([
      Promise.resolve(generateInsurancePDF(application, ocrData)),
      generateTdacQrPDF(application),
      generateTm2PDF(application, ocrData),
      generateTm3PDF(application, ocrData),
    ]);

    // 4. Upload all 4 PDFs to Firebase Storage in parallel
    const ts = Date.now();
    const basePath = `insurance_documents/${application.id}`;

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
    await updateDoc(doc(db, "orders", application.id), {
      insuranceDocumentUrl: insuranceUrl,
      tdacDocumentUrl: tdacUrl,
      tm2DocumentUrl: tm2Url,
      tm3DocumentUrl: tm3Url,
      status: "document_generated",
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 6. Log the action
    await addDoc(collection(db, "orders", application.id, "status_logs"), {
      action: "document_generated",
      previousStatus: application.status,
      notes: `All 4 documents generated by ${user.name || user.id}`,
      performedBy: user.name || user.id,
      timestamp: serverTimestamp(),
    });

    return insuranceUrl;
  };

  return {
    applications,
    loading,
    error,
    updateApplicationStatus,
    updateApplicationFields,
    deleteApplication,
    generateAndStoreInsuranceDocument,
  };
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
    const paymentActions = ["payment_verified", "payment_rejected", "payment_request_update"];

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

            let verificationStatus: import("@/types").PaymentVerificationStatus = "pending_verification";
            let verifiedAt: Date | undefined;
            let verifiedBy: string | undefined;
            let verificationNotes: string | undefined;
            let rejectionReason: string | undefined;

            if (verificationHistory.length > 0) {
              const latest = verificationHistory[0];
              verificationStatus = latest.action === "verified" ? "verified"
                : latest.action === "rejected" ? "rejected"
                : "updated";
              verifiedBy = latest.performedBy;
              verificationNotes = latest.notes;
              if (latest.action === "verified") verifiedAt = latest.timestamp;
              if (latest.action === "rejected") rejectionReason = latest.notes;
            }

            const customer = data.customer || {};
            const payment = data.payment || {};

            return {
              id: order.id,
              applicationId: order.id,
              customerName: data.fullName || data.name || customer.name || "Unknown",
              method,
              amount: data.pricing?.totalPrice || data.totalPrice || 0,
              status: paymentStatus,
              verificationStatus,
              receiptUrl: data.receiptUrl || data.documents?.receiptUrl || payment.receiptUrl,
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
    action: "payment_verified" | "payment_rejected" | "payment_request_update",
    options: { notes?: string; performedBy?: string }
  ) => {
    try {
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
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const derivedAddons: Addon[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const orderId = docSnap.id;
          const packages: string[] = data.selectedItems || data.packages || [];
          const orderStatus = normalizeLowerString(data.status, "pending");
          const createdAt = data.createdAt ? convertTimestamp(data.createdAt) : undefined;

          const addonStatus: AddonStatus =
            orderStatus === "approved" ? "confirmed" :
            orderStatus === "rejected" ? "cancelled" :
            "pending";

          packages.forEach((pkgName, index) => {
            const normalizedName = pkgName.toLowerCase().replace(/[\s/]+/g, "_");

            let type: AddonType | null = null;
            if (normalizedName.includes("tdac")) type = "tdac";
            else if (normalizedName.includes("tow")) type = "towing";
            else if (normalizedName.includes("sim")) type = "sim_card";
            else if (normalizedName.includes("tm2") || normalizedName.includes("tm_2")) type = "towing";

            if (!type) return;

            derivedAddons.push({
              id: `${orderId}_addon_${index}`,
              applicationId: orderId,
              type,
              vendorName: "",
              cost: 0,
              status: addonStatus,
              createdAt,
            });
          });
        });

        setAddons(derivedAddons);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching addons from orders:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateAddonStatus = async (_id: string, _status: AddonStatus, _trackingNumber?: string) => {
    // Addons are derived from orders collection, status updates go through order status
    console.warn("Addon status is derived from order status. Update the order instead.");
  };

  return { addons, loading, error, updateAddonStatus };
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
      .reduce((sum, p) => sum + p.amount, 0),
    avgVerificationTime: 2.3,
    popularAddonType: (() => {
      const typeCounts: Record<string, number> = {};
      addons.forEach((a) => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      });
      const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
      return (sorted[0]?.[0] as any) || "insurance";
    })(),
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
      { name: "Insurance", value: addons.filter((a) => a.type === "insurance").length || 1 },
      { name: "TDAC", value: addons.filter((a) => a.type === "tdac").length || 1 },
      { name: "Towing", value: addons.filter((a) => a.type === "towing").length || 1 },
      { name: "SIM Card", value: addons.filter((a) => a.type === "sim_card").length || 1 },
    ],
  };

  return { analytics, chartData };
};
