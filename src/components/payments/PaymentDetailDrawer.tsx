import { useState } from "react";
import { Payment, PaymentVerificationStatus } from "@/types";
import { useReceiptUrl } from "@/hooks/useReceiptUrl";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  User,
  CreditCard,
  QrCode,
  Banknote,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ImageIcon,
  History,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentDetailDrawerProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (paymentId: string, notes: string) => void;
  onReject: (paymentId: string, reason: string) => void;
  onRequestUpdate: (paymentId: string, notes: string) => void;
}

const verificationStatusMap: Record<PaymentVerificationStatus, { label: string; variant: "pending" | "approved" | "rejected" | "info" }> = {
  pending_verification: { label: "Pending Verification", variant: "pending" },
  verified: { label: "Verified", variant: "approved" },
  rejected: { label: "Rejected", variant: "rejected" },
  updated: { label: "Updated by Customer", variant: "info" },
};

export const PaymentDetailDrawer = ({
  payment,
  open,
  onOpenChange,
  onVerify,
  onReject,
  onRequestUpdate,
}: PaymentDetailDrawerProps) => {
  const [staffNotes, setStaffNotes] = useState("");
  const [actionMode, setActionMode] = useState<"none" | "verify" | "reject" | "request_update">("none");
  const [receiptZoomOpen, setReceiptZoomOpen] = useState(false);
  const { receiptUrl, loading: receiptLoading } = useReceiptUrl(
    payment?.applicationId || "",
    payment?.id || "",
    payment?.receiptUrl
  );

  if (!payment) return null;

  const statusInfo = verificationStatusMap[payment.verificationStatus];

  const handleAction = () => {
    if (!staffNotes.trim() && actionMode !== "verify") {
      toast.error("Please add a note before proceeding.");
      return;
    }
    if (actionMode === "verify") {
      onVerify(payment.id, staffNotes);
    } else if (actionMode === "reject") {
      onReject(payment.id, staffNotes);
    } else if (actionMode === "request_update") {
      onRequestUpdate(payment.id, staffNotes);
    }
    setStaffNotes("");
    setActionMode("none");
    onOpenChange(false);
  };

  const resetAction = () => {
    setActionMode("none");
    setStaffNotes("");
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetAction(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Status & Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
            <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1">
              <ShieldCheck className="h-3 w-3" />
              Approved Application
            </Badge>
          </div>

          {/* Amount Card */}
          <div className="bg-secondary rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
            <p className="text-3xl font-bold text-primary">RM{payment.amount.toLocaleString()}</p>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Payment Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Payment ID" value={payment.id} mono />
              <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Application ID" value={payment.applicationId} mono />
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Customer" value={payment.customerName} />
              <InfoRow
                icon={payment.method === "qr" ? <QrCode className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
                label="Method"
                value={payment.method === "qr" ? "QR Payment" : "Cash"}
              />
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Submitted" value={format(payment.createdAt, "dd MMM yyyy, HH:mm")} />
              {payment.verifiedAt && (
                <InfoRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Verified At" value={format(payment.verifiedAt, "dd MMM yyyy, HH:mm")} />
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Proof */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Payment Proof
            </h4>
            {receiptLoading ? (
              <div className="border border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
                <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading receipt...</p>
              </div>
            ) : receiptUrl ? (
              <div
                className="border border-border rounded-lg overflow-hidden relative group cursor-zoom-in"
                onClick={() => setReceiptZoomOpen(true)}
                title="Click to view full size"
              >
                <img src={receiptUrl} alt="Payment proof" className="w-full h-48 object-cover transition-opacity group-hover:opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <div className="bg-white/90 rounded-full p-2 shadow-lg">
                    <ZoomIn className="h-5 w-5 text-gray-800" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No payment proof uploaded</p>
                <p className="text-xs text-muted-foreground mt-1">Customer has not submitted receipt yet</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Staff Notes */}
          {(payment.verificationNotes || payment.rejectionReason) && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Staff Notes
                </h4>
                {payment.verificationNotes && (
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{payment.verificationNotes}</p>
                )}
                {payment.rejectionReason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive font-medium">Rejection Reason:</p>
                    <p className="text-sm mt-1">{payment.rejectionReason}</p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Verification History */}
          {payment.verificationHistory && payment.verificationHistory.length > 0 && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Verification History
                </h4>
                <div className="space-y-2">
                  {payment.verificationHistory.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm bg-muted/30 p-3 rounded-md">
                      <div className="mt-0.5">
                        {log.action === "verified" && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {log.action === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                        {log.action === "pending_verification" && <Clock className="h-4 w-4 text-warning" />}
                        {log.action === "updated" && <AlertTriangle className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{log.action.replace("_", " ")}</p>
                        {log.notes && <p className="text-muted-foreground mt-0.5">{log.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.performedBy} · {format(log.timestamp, "dd MMM yyyy, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Manual Verification Actions */}
          {payment.verificationStatus !== "verified" && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Verification Actions
              </h4>

              {actionMode === "none" ? (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => setActionMode("verify")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verify Payment
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setActionMode("reject")}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setActionMode("request_update")}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Request Update from Customer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium">
                    {actionMode === "verify" && "✅ Confirm Payment Verification"}
                    {actionMode === "reject" && "❌ Reject Payment — Provide Reason"}
                    {actionMode === "request_update" && "📝 Request Update — Provide Instructions"}
                  </p>
                  <Textarea
                    placeholder={
                      actionMode === "verify"
                        ? "Optional: Add verification notes..."
                        : actionMode === "reject"
                        ? "Required: Reason for rejection..."
                        : "Required: What needs to be updated..."
                    }
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={resetAction}>
                      Cancel
                    </Button>
                    <Button
                      className={`flex-1 ${
                        actionMode === "verify"
                          ? "bg-success hover:bg-success/90 text-success-foreground"
                          : actionMode === "reject"
                          ? "bg-destructive hover:bg-destructive/90"
                          : ""
                      }`}
                      onClick={handleAction}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Receipt lightbox */}
    <Dialog open={receiptZoomOpen} onOpenChange={setReceiptZoomOpen}>
      <DialogContent className="max-w-3xl p-2 bg-black/95 border-border">
        <DialogTitle className="sr-only">Payment Receipt</DialogTitle>
        <img
          src={receiptUrl || ""}
          alt="Payment receipt full size"
          className="w-full h-auto max-h-[80vh] object-contain rounded"
        />
      </DialogContent>
    </Dialog>
    </>
  );
};

const InfoRow = ({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
    <p className={`text-sm font-medium ${mono ? "font-mono" : ""} truncate`}>{value}</p>
  </div>
);
