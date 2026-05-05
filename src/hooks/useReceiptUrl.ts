import { useState, useEffect } from "react";
import { ref, list, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";

/**
 * Fetches a receipt URL for an order. If the Firestore document already has a
 * receiptUrl it is returned immediately. Otherwise we search the Firebase
 * Storage `receipt/` folder for a file whose name contains the orderId, cache
 * the resulting download URL back to the Firestore document, and return it.
 */
export const useReceiptUrl = (
  orderId: string,
  docId: string,
  existingUrl?: string | null
) => {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(existingUrl || null);
  const [loading, setLoading] = useState(!existingUrl);

  useEffect(() => {
    if (existingUrl) {
      setReceiptUrl(existingUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const receiptRef = ref(storage, "receipt");
        const result = await list(receiptRef, { maxResults: 1000 });

        const searchId = orderId || docId;
        const matchingItem = result.items.find((item) =>
          item.name.includes(searchId)
        );

        if (matchingItem && !cancelled) {
          const url = await getDownloadURL(matchingItem);
          setReceiptUrl(url);

          // Cache the URL back to the Firestore document so future lookups
          // skip the Storage list call entirely.
          try {
            await updateDoc(doc(db, "orders", docId), { receiptUrl: url });
          } catch (cacheErr) {
            // Non-critical – receipt still displays even if caching fails
            console.warn("Failed to cache receiptUrl to Firestore:", cacheErr);
          }
        }
      } catch (err) {
        console.error("Error fetching receipt from storage:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReceipt();
    return () => { cancelled = true; };
  }, [orderId, docId, existingUrl]);

  return { receiptUrl, loading };
};
