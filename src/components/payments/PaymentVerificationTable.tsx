import { Payment, PaymentVerificationStatus } from "@/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
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
  onRequestUpdate: (payment: Payment) => void;
}

const verificationStatusMap: Record<PaymentVerificationStatus, { label: string; variant: "pending" | "approved" | "rejected" | "info" }> = {
  pending_verification: { label: "Pending Verification", variant: "pending" },
  verified: { label: "Verified", variant: "approved" },
  rejected: { label: "Rejected", variant: "rejected" },
  updated: { label: "Updated", variant: "info" },
};

const getQueuePriority = (verificationStatus: PaymentVerificationStatus) => {
  if (verificationStatus === "verified") return { label: "High Priority", color: "bg-success" };
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
  onRequestUpdate,
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
          const statusInfo = verificationStatusMap[payment.verificationStatus];
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
              <TableCell className="font-semibold text-foreground">RM{payment.amount.toLocaleString()}</TableCell>
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
                {payment.receiptUrl ? (
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
                  {payment.verificationStatus === "pending_verification" && (
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
                  {payment.verificationStatus === "rejected" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onRequestUpdate(payment)} title="Request Update">
                      <FileEdit className="h-4 w-4" />
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
