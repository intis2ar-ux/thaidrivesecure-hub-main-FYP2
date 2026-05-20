import { Payment, PaymentVerificationStatus } from "@/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  QrCode,
  Banknote,
  Eye,
  CheckCircle2,
  XCircle,
  Receipt,
  FileEdit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentVerificationTableProps {
  payments: Payment[];
  sortOrder: "asc" | "desc" | null;
  onToggleSort: () => void;
  onViewDetails: (payment: Payment) => void;
  onVerify: (payment: Payment) => void;
  onReject: (payment: Payment) => void;
  onViewReceipt: (payment: Payment) => void;
}

const onlineStatusMap: Record<PaymentVerificationStatus, { label: string; variant: "pending" | "approved" | "rejected" | "info" | "warning" }> = {
  pending_verification: { label: "Pending Verification", variant: "pending" },
  awaiting_cash_payment: { label: "Pending Verification", variant: "pending" },
  collection_scheduled: { label: "Pending Verification", variant: "pending" },
  cash_received: { label: "Pending Verification", variant: "pending" },
  verified: { label: "Verified", variant: "approved" },
  rejected: { label: "Rejected", variant: "rejected" },
  updated: { label: "Updated", variant: "info" },
};

const cashStatusMap: Record<PaymentVerificationStatus, { label: string; variant: "pending" | "approved" | "rejected" | "info" | "warning" }> = {
  pending_verification: { label: "Awaiting Cash Payment", variant: "pending" },
  awaiting_cash_payment: { label: "Awaiting Cash Payment", variant: "pending" },
  collection_scheduled: { label: "Collection Scheduled", variant: "info" },
  cash_received: { label: "Cash Received", variant: "warning" },
  verified: { label: "Payment Confirmed", variant: "approved" },
  rejected: { label: "Rejected", variant: "rejected" },
  updated: { label: "Update Requested", variant: "info" },
};

const getStatusInfo = (payment: Payment) =>
  payment.method === "cash" ? cashStatusMap[payment.verificationStatus] : onlineStatusMap[payment.verificationStatus];

const getQueuePriority = (verificationStatus: PaymentVerificationStatus) => {
  if (verificationStatus === "verified") return { label: "High Priority", color: "bg-success" };
  if (verificationStatus === "cash_received") return { label: "Ready to Confirm", color: "bg-accent" };
  if (verificationStatus === "rejected" || verificationStatus === "updated") return { label: "Requires Attention", color: "bg-warning" };
  return { label: "Normal", color: "bg-muted-foreground" };
};

export const PaymentVerificationTable = ({
  payments,
  sortOrder,
  onToggleSort,
  onViewDetails,
  onVerify,
  onReject,
  onViewReceipt,
}: PaymentVerificationTableProps) => {
  const getSortIcon = () => {
    if (sortOrder === "desc") return <ArrowDown className="h-4 w-4" />;
    if (sortOrder === "asc") return <ArrowUp className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Receipt className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <h3 className="text-lg font-medium text-foreground">No payments available yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Payments will appear here once customers with approved applications submit their payment.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/50">
          <TableHead className="text-primary font-medium">Payment ID</TableHead>
          <TableHead className="text-primary font-medium">Application ID</TableHead>
          <TableHead className="text-primary font-medium">Customer</TableHead>
          <TableHead className="text-primary font-medium">Method</TableHead>
          <TableHead className="text-primary font-medium">Amount</TableHead>
          <TableHead className="text-primary font-medium">Verification</TableHead>
          <TableHead className="text-primary font-medium">Queue</TableHead>
          <TableHead className="text-primary font-medium">Proof</TableHead>
          <TableHead
            className="text-primary font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={onToggleSort}
          >
            <div className="flex items-center gap-1">
              Submitted At
              {getSortIcon()}
            </div>
          </TableHead>
          <TableHead className="text-primary font-medium text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => {
          const statusInfo = getStatusInfo(payment);
          const priority = getQueuePriority(payment.verificationStatus);

          return (
            <TableRow key={payment.id} className="hover:bg-muted/30 border-b border-border/30">
              <TableCell className="font-mono text-sm text-accent">{payment.id.slice(0, 8)}...</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{payment.applicationId.slice(0, 8)}...</TableCell>
              <TableCell>
                <p className="font-medium text-foreground">{payment.customerName}</p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {payment.method === "qr" ? <QrCode className="h-4 w-4 text-primary" /> : <Banknote className="h-4 w-4 text-accent" />}
                  <span className="text-sm">{payment.method === "qr" ? "QR" : "Cash"}</span>
                </div>
              </TableCell>
              <TableCell className="font-semibold text-foreground">{formatPrice(payment.amount)}</TableCell>
              <TableCell>
                <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", priority.color)} />
                  <span className="text-sm">{priority.label}</span>
                </div>
              </TableCell>
              <TableCell>
                {payment.method === "cash" ? (
                  <Badge variant="outline" className="gap-1 text-accent border-accent/30">
                    <Banknote className="h-3 w-3" />
                    Optional
                  </Badge>
                ) : payment.receiptUrl ? (
                  <Badge variant="outline" className="gap-1 text-success border-success/30">
                    <ImageIcon className="h-3 w-3" />
                    Yes
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    No
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(payment.createdAt, "dd MMM yyyy, HH:mm")}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1.5">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onViewDetails(payment)} title="View Details">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(payment.verificationStatus === "pending_verification" || payment.verificationStatus === "awaiting_cash_payment" || payment.verificationStatus === "collection_scheduled" || payment.verificationStatus === "cash_received") && (
                    <>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success" onClick={() => onVerify(payment)} title="Verify">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onReject(payment)} title="Reject">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {payment.verificationStatus === "verified" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onViewReceipt(payment)} title="View Receipt">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}
                  {payment.verificationStatus === "updated" && (
                    <>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success" onClick={() => onVerify(payment)} title="Verify">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onReject(payment)} title="Reject">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
