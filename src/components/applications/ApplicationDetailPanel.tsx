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
import { AIAnalysisSection } from "./sections/AIAnalysisSection";
import { ReuploadRequestModal } from "./sections/ReuploadRequestModal";
import { useApplications, useAIVerifications } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ApplicationDetailPanelProps {
  application: Application;
  onClose: () => void;
}

export const ApplicationDetailPanel = ({ application, onClose }: ApplicationDetailPanelProps) => {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [reuploadModal, setReuploadModal] = useState<{
    isOpen: boolean;
    type: "passport" | "vehicle_grant";
  }>({
    isOpen: false,
    type: "passport",
  });

  const { requestReupload } = useApplications();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleReuploadRequest = (type: "passport" | "vehicle_grant") => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast({
        title: "Unauthorized",
        description: "You do not have permission to perform this action.",
        variant: "destructive"
      });
      return;
    }

    setReuploadModal({
      isOpen: true,
      type,
    });
  };

  const handleConfirmReupload = async (reason: string, notes: string) => {
    try {
      const type = reuploadModal.type === "vehicle_grant" ? "vehicleGrant" : "passport";

      await requestReupload(application.id, type, {
        reason,
        notes,
        staffId: user?.id || "unknown_staff",
      });

      toast({
        title: "Re-upload Requested",
        description: `Customer will be notified to re-upload their ${reuploadModal.type.replace("_", " ")}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request re-upload",
        variant: "destructive"
      });
      throw error; // Re-throw to let the modal handle loading state
    }
  };

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
        <DocumentsSection
          application={application}
          onPreview={setPreviewImage}
          onReupload={handleReuploadRequest}
        />
        <Separator />
        <AIAnalysisSection application={application} />
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

      <ReuploadRequestModal
        isOpen={reuploadModal.isOpen}
        onClose={() => setReuploadModal(prev => ({ ...prev, isOpen: false }))}
        documentType={reuploadModal.type}
        onSubmit={handleConfirmReupload}
      />
    </div>
  );
};
