import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { AppNotification } from "@/types/notification";

const toDate = (val: any): Date => {
  if (val instanceof Timestamp) return val.toDate();
  if (val?.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
};

export const useNotifications = (maxItems?: number) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, "notifications");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(maxItems || 100));

    const unsub = onSnapshot(q, (snap) => {
      const items: AppNotification[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const role = data.recipientRole || "all";
        // Filter: show if role matches or "all", or if targeted to this user
        if (
          role === "all" ||
          role === user.role ||
          data.recipientUserId === user.id
        ) {
          items.push({
            id: d.id,
            title: data.title || "",
            message: data.message || "",
            type: data.type || "system",
            isRead: data.isRead ?? false,
            createdAt: toDate(data.createdAt),
            targetPage: data.targetPage || "/dashboard",
            targetId: data.targetId,
            priority: data.priority || "low",
            recipientRole: role,
            recipientUserId: data.recipientUserId,
          });
        }
      });
      setNotifications(items);
      setLoading(false);
    });

    return unsub;
  }, [user, maxItems]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markAsRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { isRead: true });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { isRead: true }));
    await batch.commit();
  }, [notifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};
