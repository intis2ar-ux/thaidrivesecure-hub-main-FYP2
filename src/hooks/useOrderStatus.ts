import { useState, useEffect } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  collection,
  Timestamp,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { ApplicationStatus } from "@/types";

export interface OrderStatusData {
  id: string;
  orderId: string;
  status: ApplicationStatus;
  receiptUrl: string;
  insuranceDocumentUrl: string;
  customerName: string;
  createdAt: Date | null;
  approvedAt: Date | null;
  totalPrice: number;
  vehicleType: string;
  borderRoute: string;
  packages: string[];
}

export interface StatusLog {
  id: string;
  action: string;
  notes: string;
  performedBy: string;
  timestamp: Date;
}

/**
 * Real-time single-order status tracking hook.
 * Designed for the mobile customer-facing status page.
 */
export const useOrderStatus = (orderId: string | undefined) => {
  const [order, setOrder] = useState<OrderStatusData | null>(null);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time order listener
  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, "orders", orderId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setOrder(null);
          setError("Order not found");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        // Normalize status
        const rawStatus = (data.status || "pending").toString().toLowerCase();
        let status: ApplicationStatus = "pending";
        if (rawStatus.includes("applied")) status = "applied";
        else if (rawStatus.includes("document_generated")) status = "document_generated";
        else if (rawStatus.includes("completed")) status = "completed";
        else if (rawStatus.includes("processing")) status = "processing";
        else if (rawStatus.includes("approved") || rawStatus.includes("verified")) status = "approved";
        else if (rawStatus.includes("rejected") || rawStatus.includes("cancelled")) status = "rejected";

        const customer = data.customer || {};

        // Normalize packages
        const rawPackages = data.packages || data.selectedItems || [];
        const packages: string[] = rawPackages.map((pkg: any) =>
          typeof pkg === "string" ? pkg : pkg?.name || pkg?.label || String(pkg)
        );

        setOrder({
          id: snapshot.id,
          orderId: data.orderId || snapshot.id,
          status,
          receiptUrl: data.receiptUrl || data.documents?.receiptUrl || data.payment?.receiptUrl || "",
          insuranceDocumentUrl: data.insuranceDocumentUrl || "",
          customerName: data.fullName || data.name || customer.name || "",
          createdAt: data.createdAt ? convertTimestamp(data.createdAt) : null,
          approvedAt: data.approvedAt ? convertTimestamp(data.approvedAt) : null,
          totalPrice: data.pricing?.totalPrice || data.totalPrice || 0,
          vehicleType: data.vehicleType || data.trip?.vehicleType || "",
          borderRoute: data.borderRoute || data.where || data.trip?.borderRoute || "",
          packages,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to order:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // Real-time status logs listener
  useEffect(() => {
    if (!orderId) {
      setStatusLogs([]);
      return;
    }

    const logsQuery = query(
      collection(db, "orders", orderId, "status_logs"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs: StatusLog[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            action: data.action || "",
            notes: data.notes || "",
            performedBy: data.performedBy || "",
            timestamp: data.timestamp ? convertTimestamp(data.timestamp) : new Date(),
          };
        });
        setStatusLogs(logs);
      },
      (err) => {
        console.error("Error listening to status logs:", err);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  /**
   * Upload receipt and create/update order with status "applied",
   * then automatically transition to "pending".
   */
  const uploadReceiptAndApply = async (
    file: File,
    userId: string,
    existingOrderId?: string
  ): Promise<string> => {
    if (!file) throw new Error("No file provided");

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      throw new Error("Invalid file type. Please upload JPEG, PNG, WebP, or PDF.");
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("File too large. Maximum size is 10MB.");
    }

    const targetId = existingOrderId || orderId;
    if (!targetId) throw new Error("Order ID is required");

    try {
      // 1. Upload receipt to Firebase Storage
      const fileName = `receipt_${Date.now()}.${file.name.split(".").pop()}`;
      const filePath = `orders/${targetId}/receipts/${fileName}`;
      const fileRef = storageRef(storage, filePath);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const receiptUrl = await getDownloadURL(fileRef);

      // 2. Update order document with status "applied"
      const orderRef = doc(db, "orders", targetId);
      await updateDoc(orderRef, {
        receiptUrl,
        status: "applied",
        updatedAt: serverTimestamp(),
      });

      // 3. Log the receipt upload
      await addDoc(collection(db, "orders", targetId, "status_logs"), {
        action: "applied",
        notes: "Receipt uploaded by customer",
        performedBy: userId || "customer",
        timestamp: serverTimestamp(),
      });

      // 4. Auto-transition to "pending" after a brief delay (simulating processing)
      setTimeout(async () => {
        try {
          await updateDoc(orderRef, {
            status: "pending",
            updatedAt: serverTimestamp(),
          });

          await addDoc(collection(db, "orders", targetId, "status_logs"), {
            action: "pending",
            notes: "Application submitted for review",
            performedBy: "system",
            timestamp: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error transitioning to pending:", err);
        }
      }, 2000);

      return receiptUrl;
    } catch (err: any) {
      console.error("Error uploading receipt:", err);
      throw new Error(err.message || "Failed to upload receipt");
    }
  };

  /**
   * Admin: Approve application and generate insurance document.
   * Updates status to "completed" with insurance doc URL.
   */
  const approveAndComplete = async (
    targetOrderId: string,
    insuranceDocUrl: string,
    performedBy: string
  ) => {
    try {
      const orderRef = doc(db, "orders", targetOrderId);
      await updateDoc(orderRef, {
        status: "completed",
        insuranceDocumentUrl: insuranceDocUrl,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "orders", targetOrderId, "status_logs"), {
        action: "completed",
        previousStatus: "pending",
        notes: `Application approved and insurance document generated by ${performedBy}`,
        performedBy,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error approving order:", err);
      throw err;
    }
  };

  return {
    order,
    statusLogs,
    loading,
    error,
    uploadReceiptAndApply,
    approveAndComplete,
  };
};

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
