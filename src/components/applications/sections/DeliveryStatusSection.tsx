import { Truck } from "lucide-react";
import { format } from "date-fns";
import { Application } from "@/types";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Section } from "./SectionHeader";
import { InsuranceDocumentAction } from "./InsuranceDocumentAction";

interface Props {
  application: Application;
}

const deliveryLabels: Record<string, string> = {
  takeaway: "Self Collect",
  email_pdf: "Via PDF (Email)",
  shipping: "Courier Delivery",
  "Via PDF": "Via PDF (Email)",
};

const formatPaymentStatus = (status?: string) => {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const DeliveryStatusSection = ({ application }: Props) => (
  <Section icon={Truck} title="Delivery & Status">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Delivery Method</span>
      </div>
      <Badge variant="outline" className="bg-background">
        {deliveryLabels[application.deliveryMethod] || application.deliveryMethod || "-"}
      </Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Application Status</span>
      <StatusBadge variant={application.status}>{application.status.replace("_", " ")}</StatusBadge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Payment Status</span>
      <StatusBadge
        variant={
          application.paymentStatus === "paid"
            ? "paid"
            : application.paymentStatus === "failed"
            ? "failed"
            : "pending"
        }
      >
        {formatPaymentStatus(application.paymentStatus)}
      </StatusBadge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">OCR Validation Score</span>
      <span
        className={
          (application.ocrScore ?? 0) >= 85
            ? "text-sm font-semibold text-success"
            : (application.ocrScore ?? 0) >= 70
            ? "text-sm font-semibold text-warning-foreground"
            : "text-sm font-semibold text-destructive"
        }
      >
        {application.ocrScore ? `${Math.round(application.ocrScore)}%` : "—"}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Created At</span>
      <span className="text-sm text-foreground">
        {application.createdAt ? format(application.createdAt, "dd MMM yyyy, HH:mm") : "-"}
      </span>
    </div>

    <InsuranceDocumentAction application={application} />
  </Section>
);

