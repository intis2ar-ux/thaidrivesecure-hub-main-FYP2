import { useState } from "react";
import { Payment, PaymentVerificationStatus, CashCollectionDetails } from "@/types";
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
import { Input } from "@/components/ui/input";
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
  Phone,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

const CASH_COLLECTION_BRANCH = "CNT Enterprise @ Changlun, Kedah";

interface PaymentDetailDrawerProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (paymentId: string, notes: string) => void;
  onReject: (paymentId: string, reason: string) => void;
  onScheduleCollection: (paymentId: string, details: CashCollectionDetails, notes: string) => void;
  onMarkCashReceived: (paymentId: string, notes: string) => void;
}

const onlineStatusMap: Record<PaymentVerificationStatus, { label: string; variant: "pending" | "approved" | "rejected" | "info" | "warning" }> = {
  pending_verification: { label: "Pending Verification", variant: "pending" },
  awaiting_cash_payment: { label: "Pending Verification", variant: "pending" },
  collection_scheduled: { label: "Pending Verification", variant: "pending" },
  cash_received: { label: "Pending Verification", variant: "pending" },
  verified: { label: "Verified", variant: "approved" },
  rejected: { label: "Rejected", variant: "rejected" },
  updated: { label: "Updated by Customer", variant: "info" },
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

const getTimelineLabel = (action: PaymentVerificationStatus, isCash: boolean) => {
  if (isCash && action === "pending_verification") return "Payment submitted";
  if (action === "awaiting_cash_payment") return "Awaiting cash payment";
  if (action === "collection_scheduled") return "Collection scheduled";
  if (action === "cash_received") return "Cash received";
  if (action === "verified") return isCash ? "Verified by staff" : "Payment verified";
  if (action === "rejected") return "Rejected";
  if (action === "updated") return "Requested update";
  return "Pending verification";
};

export const PaymentDetailDrawer = ({
  payment,
  open,
  onOpenChange,
  onVerify,
  onReject,
  onScheduleCollection,
  onMarkCashReceived,
}: PaymentDetailDrawerProps) => {
  const [staffNotes, setStaffNotes] = useState("");
  const [actionMode, setActionMode] = useState<"none" | "verify" | "reject" | "request_update" | "schedule" | "cash_received">("none");
  const [scheduleDetails, setScheduleDetails] = useState<CashCollectionDetails>({
    date: "",
    time: "",
    branch: CASH_COLLECTION_BRANCH,
    staffNotes: "",
  });
  const [receiptZoomOpen, setReceiptZoomOpen] = useState(false);
  const { receiptUrl, loading: receiptLoading } = useReceiptUrl(
    payment?.applicationId || "",
    payment?.id || "",
    payment?.receiptUrl
  );

  if (!payment) return null;

  const isCash = payment.method === "cash";
  const statusInfo = getStatusInfo(payment);
  const cashCollection = payment.cashCollection || {};

  const handleAction = () => {
    if (actionMode === "schedule") {
      if (!scheduleDetails.date || !scheduleDetails.time) {
        toast.error("Please add collection date and time.");
        return;
      }
      const notes = scheduleDetails.staffNotes || staffNotes;
      onScheduleCollection(payment.id, { ...scheduleDetails, branch: CASH_COLLECTION_BRANCH }, notes);
    } else if (!staffNotes.trim() && actionMode !== "verify") {
      toast.error("Please add a note before proceeding.");
      return;
    } else if (actionMode === "verify") {
      onVerify(payment.id, staffNotes);
    } else if (actionMode === "cash_received") {
      onMarkCashReceived(payment.id, staffNotes);
    } else if (actionMode === "reject") {
      onReject(payment.id, staffNotes);
    }
    resetAction();
    onOpenChange(false);
  };

  const resetAction = () => {
    setActionMode("none");
    setStaffNotes("");
    setScheduleDetails({ date: "", time: "", branch: CASH_COLLECTION_BRANCH, staffNotes: "" });
  };

  const contactCustomer = () => {
    if (payment.customerPhone) {
      window.location.href = `tel:${payment.customerPhone}`;
      return;
    }
    toast.info("No phone number is available for this customer.");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetAction(); }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-primary">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
              <Badge variant="outline" className={isCash ? "text-accent border-accent/30 bg-accent/10 gap-1" : "text-primary border-primary/30 bg-primary/10 gap-1"}>
                {isCash ? <Banknote className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
                {isCash ? "Cash Payment" : "QR Payment"}
              </Badge>
              <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1">
                <ShieldCheck className="h-3 w-3" />
                Approved Application
              </Badge>
            </div>

            <div className="bg-secondary rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
              <p className="text-3xl font-bold text-primary">RM{payment.amount.toLocaleString()}</p>
            </div>

            <Separator />

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
                  icon={isCash ? <Banknote className="h-3.5 w-3.5" /> : <QrCode className="h-3.5 w-3.5" />}
                  label="Method"
                  value={isCash ? "Cash" : "QR Payment"}
                />
                <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Submitted" value={format(payment.createdAt, "dd MMM yyyy, HH:mm")} />
                {payment.verifiedAt && (
                  <InfoRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Verified At" value={format(payment.verifiedAt, "dd MMM yyyy, HH:mm")} />
                )}
              </div>
            </div>

            <Separator />

            {isCash ? (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Cash Payment Instructions
                  </h4>
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="Amount" value={`RM${payment.amount.toLocaleString()}`} />
                      <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Reference ID" value={payment.applicationId} mono />
                      <InfoRow
                        icon={<CalendarClock className="h-3.5 w-3.5" />}
                        label="Payment Deadline"
                        value={payment.paymentDeadline ? format(payment.paymentDeadline, "dd MMM yyyy") : "Confirm with staff"}
                      />
                      <InfoRow icon={<Banknote className="h-3.5 w-3.5" />} label="Payment Method" value="Cash" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer should pay the exact amount directly to authorized staff or at the office counter. Staff must record collection notes before confirming payment.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Cash Collection Notes
                  </h4>
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Collection Date" value={cashCollection.date || "Not scheduled"} />
                      <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Collection Time" value={cashCollection.time || "Not scheduled"} />
                      <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Customer Phone" value={payment.customerPhone || "Not available"} />
                    </div>
                    {cashCollection.staffNotes && (
                      <p className="text-sm bg-muted/50 p-3 rounded-md">{cashCollection.staffNotes}</p>
                    )}
                  </div>
                </div>

                <OptionalReceipt />
              </>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Payment Proof
                </h4>
                <ReceiptPreview receiptLoading={receiptLoading} receiptUrl={receiptUrl} onZoom={() => setReceiptZoomOpen(true)} />
              </div>
            )}

            <Separator />

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

            {payment.verificationHistory && payment.verificationHistory.length > 0 && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Activity Timeline
                  </h4>
                  <div className="space-y-2">
                    {payment.verificationHistory.map((log, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm bg-muted/30 p-3 rounded-md">
                        <div className="mt-0.5">
                          {log.action === "verified" && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {log.action === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                          {(log.action === "pending_verification" || log.action === "awaiting_cash_payment") && <Clock className="h-4 w-4 text-warning" />}
                          {log.action === "collection_scheduled" && <CalendarClock className="h-4 w-4 text-primary" />}
                          {log.action === "cash_received" && <Banknote className="h-4 w-4 text-accent" />}
                          {log.action === "updated" && <AlertTriangle className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{getTimelineLabel(log.action, isCash)}</p>
                          {log.notes && <p className="text-muted-foreground mt-0.5">{log.notes}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.performedBy} - {format(log.timestamp, "dd MMM yyyy, HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {payment.verificationStatus !== "verified" && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Verification Actions
                </h4>

                {actionMode === "none" ? (
                  <div className="grid grid-cols-1 gap-2">
                    {isCash && (
                      <>
                        <Button variant="outline" className="w-full gap-2" onClick={() => setActionMode("schedule")}>
                          <CalendarClock className="h-4 w-4" />
                          Schedule Collection
                        </Button>
                        <Button variant="outline" className="w-full gap-2" onClick={contactCustomer}>
                          <Phone className="h-4 w-4" />
                          Contact Customer
                        </Button>
                        <Button className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setActionMode("cash_received")}>
                          <Banknote className="h-4 w-4" />
                          Mark as Cash Received
                        </Button>
                      </>
                    )}
                    <Button
                      className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => setActionMode("verify")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Verify Payment
                    </Button>
                    <Button variant="destructive" className="w-full gap-2" onClick={() => setActionMode("reject")}>
                      <XCircle className="h-4 w-4" />
                      Reject Payment
                    </Button>
                  </div>
                ) : (
                  <ActionPanel
                    actionMode={actionMode}
                    staffNotes={staffNotes}
                    setStaffNotes={setStaffNotes}
                    scheduleDetails={scheduleDetails}
                    setScheduleDetails={setScheduleDetails}
                    onCancel={resetAction}
                    onConfirm={handleAction}
                  />
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
  <div className="space-y-1 min-w-0">
    <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
    <p className={`text-sm font-medium ${mono ? "font-mono" : ""} truncate`}>{value}</p>
  </div>
);

const ReceiptPreview = ({
  receiptLoading,
  receiptUrl,
  onZoom,
}: {
  receiptLoading: boolean;
  receiptUrl?: string;
  onZoom: () => void;
}) => {
  if (receiptLoading) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
        <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading receipt...</p>
      </div>
    );
  }

  if (receiptUrl) {
    return (
      <div className="border border-border rounded-lg overflow-hidden relative group cursor-zoom-in" onClick={onZoom} title="Click to view full size">
        <img src={receiptUrl} alt="Payment proof" className="w-full h-48 object-cover transition-opacity group-hover:opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="bg-white/90 rounded-full p-2 shadow-lg">
            <ZoomIn className="h-5 w-5 text-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No payment proof uploaded</p>
      <p className="text-xs text-muted-foreground mt-1">Customer has not submitted receipt yet</p>
    </div>
  );
};

const OptionalReceipt = () => (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
      <ImageIcon className="h-4 w-4" />
      Optional Uploaded Receipt Image
    </h4>
    <CashReceiptPlaceholder />
  </div>
);

const CashReceiptPlaceholder = () => (
  <div className="rounded-lg border border-dashed border-accent/30 bg-accent/5 p-6 text-center">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
      <Banknote className="h-5 w-5 text-accent" />
    </div>
    <p className="text-sm font-medium text-foreground">Cash receipt image is optional</p>
    <p className="text-xs text-muted-foreground mt-1">
      Staff can confirm this payment manually after collecting cash at {CASH_COLLECTION_BRANCH}.
    </p>
  </div>
);

const ActionPanel = ({
  actionMode,
  staffNotes,
  setStaffNotes,
  scheduleDetails,
  setScheduleDetails,
  onCancel,
  onConfirm,
}: {
  actionMode: "verify" | "reject" | "request_update" | "schedule" | "cash_received";
  staffNotes: string;
  setStaffNotes: (value: string) => void;
  scheduleDetails: CashCollectionDetails;
  setScheduleDetails: (value: CashCollectionDetails) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const needsNotes = actionMode !== "verify" && actionMode !== "schedule";
  const title =
    actionMode === "verify" ? "Confirm Payment Verification"
      : actionMode === "reject" ? "Reject Payment"
      : actionMode === "cash_received" ? "Confirm Cash Received"
      : "Schedule Cash Collection";

  return (
    <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
      <p className="text-sm font-medium">{title}</p>
      {actionMode === "schedule" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input type="date" value={scheduleDetails.date || ""} onChange={(e) => setScheduleDetails({ ...scheduleDetails, date: e.target.value })} />
          <Input type="time" value={scheduleDetails.time || ""} onChange={(e) => setScheduleDetails({ ...scheduleDetails, time: e.target.value })} />
          <Textarea
            className="sm:col-span-2"
            placeholder="Staff notes for collection..."
            value={scheduleDetails.staffNotes || ""}
            onChange={(e) => setScheduleDetails({ ...scheduleDetails, staffNotes: e.target.value })}
            rows={3}
          />
        </div>
      ) : (
        <Textarea
          placeholder={
            actionMode === "verify"
              ? "Optional: Add verification notes..."
              : actionMode === "cash_received"
              ? "Required: Add cash collection notes..."
              : actionMode === "reject"
              ? "Required: Reason for rejection..."
              : "Required: What needs to be updated..."
          }
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
          rows={3}
          className={needsNotes && !staffNotes.trim() ? "border-destructive/50" : ""}
        />
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
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
          onClick={onConfirm}
          disabled={needsNotes && !staffNotes.trim()}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
