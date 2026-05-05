export type NotificationType = "application" | "verification" | "payment" | "tracking" | "system";
export type NotificationPriority = "low" | "medium" | "high";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  targetPage: string;
  targetId?: string;
  priority: NotificationPriority;
  recipientRole: "admin" | "staff" | "all";
  recipientUserId?: string;
}
