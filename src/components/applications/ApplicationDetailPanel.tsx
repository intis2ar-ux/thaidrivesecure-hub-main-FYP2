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
import { useApplications, useAIVerifications } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { VerificationAudit } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface ApplicationDetailPanelProps {
  application: Application;
  onClose: () => void;
}

export const ApplicationDetailPanel = ({ application, onClose }: ApplicationDetailPanelProps) => {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const { updateApplicationStatus } = useApplications();
  const { updateVerification } = useAIVerifications();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleReuploadRequest = async (type: "passport" | "vehicle_grant") => {
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      toast({
        title: "Unauthorized",
        description: "You do not have permission to perform this action.",
        variant: "destructive"
      });
      return;
    }

    const verificationId = type === "passport" 
      ? application.latestPassportVerificationId 
      : application.latestVehicleGrantVerificationId;

    try {
      if (verificationId) {
        // Fetch existing verification to preserve audit trail
        const vRef = doc(db, "ai_verifications", verificationId);
        const vSnap = await getDoc(vRef);
        const existingData = vSnap.exists() ? vSnap.data() : {};
        const existingAudit = existingData.auditTrail || [];

        const auditEntry: VerificationAudit = {
          id: `audit-${Date.now()}`,
          reviewerName: user?.name || "Staff",
          reviewerId: user?.id || "unknown",
          action: "re_upload_requested",
          notes: `Staff requested re-upload of ${type.replace("_", " ")} document.`,
          timestamp: new Date(),
        };

        await updateVerification(verificationId, {
          reUploadRequested: true,
          reviewedBy: user?.name,
          auditTrail: [...existingAudit, auditEntry]
        });
      }

      // Always update application status and log the action
      // We use "pending" status to indicate customer action is required
      await updateApplicationStatus(application.id, "pending", {
        notes: `Re-upload requested for ${type.replace("_", " ")} document.`,
        performedBy: user?.name || "Staff"
      });

      toast({
        title: "Re-upload Requested",
        description: `Customer will be notified to re-upload their ${type.replace("_", " ")}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request re-upload",
        variant: "destructive"
      });
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
    </div>
  );
};
