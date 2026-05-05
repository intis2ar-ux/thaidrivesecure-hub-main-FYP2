import { useState } from "react";
import { Application } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CustomerSection } from "./sections/CustomerSection";
import { TripSection } from "./sections/TripSection";
import { PackagesSection } from "./sections/PackagesSection";
import { DocumentsSection } from "./sections/DocumentsSection";
import { PricingSection } from "./sections/PricingSection";
import { DeliveryStatusSection } from "./sections/DeliveryStatusSection";
import { StatusHistorySection } from "./sections/StatusHistorySection";
import { DocumentPreviewModal } from "./sections/DocumentPreviewModal";

interface ApplicationDetailPanelProps {
  application: Application;
  onClose: () => void;
}

export const ApplicationDetailPanel = ({ application, onClose }: ApplicationDetailPanelProps) => {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="bg-card border-l border-border h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Application Details</h2>
          <p className="text-sm text-muted-foreground">Order: {application.orderId}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        <CustomerSection application={application} />
        <Separator />
        <TripSection application={application} />
        <Separator />
        <PackagesSection application={application} />
        <Separator />
        <DocumentsSection application={application} onPreview={setPreviewImage} />
        <Separator />
        <PricingSection application={application} onPreview={setPreviewImage} />
        <Separator />
        <DeliveryStatusSection application={application} />
        <Separator />
        <StatusHistorySection applicationId={application.id} />
      </div>

      {previewImage && (
        <DocumentPreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
        />
      )}
    </div>
  );
};
