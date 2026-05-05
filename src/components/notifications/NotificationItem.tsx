import { cn } from "@/lib/utils";
import {
  FileText,
  Brain,
  CreditCard,
  Truck,
  AlertTriangle,
} from "lucide-react";
import type { AppNotification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  application: { icon: FileText, color: "text-primary" },
  verification: { icon: Brain, color: "text-accent" },
  payment: { icon: CreditCard, color: "hsl(var(--success))" },
  tracking: { icon: Truck, color: "text-warning-foreground" },
  system: { icon: AlertTriangle, color: "text-destructive" },
};

const priorityBorder: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-border",
};

interface NotificationItemProps {
  notification: AppNotification;
  onClick: () => void;
  onMarkRead: () => void;
}

export const NotificationItem = ({
  notification,
  onClick,
  onMarkRead,
}: NotificationItemProps) => {
  const config = typeConfig[notification.type] || typeConfig.system;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 border-l-[3px] transition-colors hover:bg-secondary/50",
        priorityBorder[notification.priority],
        notification.isRead ? "bg-card" : "bg-secondary/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          notification.isRead ? "bg-muted" : "bg-primary/10"
        )}
      >
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              notification.isRead
                ? "text-muted-foreground font-normal"
                : "text-foreground font-semibold"
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>
    </button>
  );
};
