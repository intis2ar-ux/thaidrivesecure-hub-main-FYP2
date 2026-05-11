import { cn } from "@/lib/utils";

type StatusVariant =
  | "applied"
  | "pending"
  | "verified"
  | "approved"
  | "rejected"
  | "completed"
  | "paid"
  | "failed"
  | "confirmed"
  | "cancelled"
  | "info"
  | "warning"
  | "error"
  | "pending_verification"
  | "awaiting_cash_payment"
  | "collection_scheduled"
  | "cash_received"
  | "updated"
  | "processing"
  | "document_generated";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  applied:
    "bg-primary/12 text-primary border-primary/25",
  pending:
    "bg-warning/12 text-warning-foreground border-warning/25",
  pending_verification:
    "bg-warning/12 text-warning-foreground border-warning/25",
  awaiting_cash_payment:
    "bg-warning/12 text-warning-foreground border-warning/25",
  collection_scheduled:
    "bg-primary/12 text-primary border-primary/25",
  cash_received:
    "bg-accent/12 text-accent border-accent/25",
  verified:
    "bg-success/12 text-success border-success/25",
  approved:
    "bg-success/12 text-success border-success/25",
  completed:
    "bg-success/12 text-success border-success/25",
  paid:
    "bg-success/12 text-success border-success/25",
  confirmed:
    "bg-accent/12 text-accent border-accent/25",
  rejected:
    "bg-destructive/12 text-destructive border-destructive/25",
  failed:
    "bg-destructive/12 text-destructive border-destructive/25",
  error:
    "bg-destructive/12 text-destructive border-destructive/25",
  cancelled:
    "bg-muted text-muted-foreground border-muted-foreground/20",
  info:
    "bg-primary/12 text-primary border-primary/25",
  warning:
    "bg-warning/12 text-warning-foreground border-warning/25",
  updated:
    "bg-primary/12 text-primary border-primary/25",
  processing:
    "bg-primary/12 text-primary border-primary/25",
  document_generated:
    "bg-accent/12 text-accent border-accent/25",
};

export const StatusBadge = ({
  variant,
  children,
  className,
}: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize leading-none whitespace-nowrap",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
