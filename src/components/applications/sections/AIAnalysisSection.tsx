import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Application } from "@/types";
import { Section } from "./SectionHeader";
import { BrainCircuit, CheckCircle, AlertTriangle, PlayCircle, ExternalLink, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIVerifications, useApplications } from "@/hooks/useFirestore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface Props {
  application: Application;
}

export const AIAnalysisSection = ({ application }: Props) => {
  const navigate = useNavigate();
  const { processDocumentAI } = useAIVerifications();
  const { updateApplicationFields } = useApplications();
  const [loadingPassport, setLoadingPassport] = useState(false);
  const [loadingVehicleGrant, setLoadingVehicleGrant] = useState(false);

  const [passportResult, setPassportResult] = useState<any>(null);
  const [vehicleGrantResult, setVehicleGrantResult] = useState<any>(null);

  // Listen to the order document to get latest verification references
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "orders", application.id), async (docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      const fetchResult = async (id: string, setter: any) => {
        if (!id) return;
        const vSnap = await import("firebase/firestore").then(m => m.getDoc(m.doc(db, "ai_verifications", id)));
        if (vSnap.exists()) {
          setter(vSnap.data());
        }
      };

      if (data.latestPassportVerificationId) {
        fetchResult(data.latestPassportVerificationId, setPassportResult);
      }
      if (data.latestVehicleGrantVerificationId) {
        fetchResult(data.latestVehicleGrantVerificationId, setVehicleGrantResult);
      }
    });

    return () => unsub();
  }, [application.id]);

  // Gate 1: application must have been actioned (approved or rejected)
  const isApplicationActioned =
    application.status === "approved" ||
    application.status === "rejected" ||
    application.status === "processing" ||
    application.status === "document_generated" ||
    application.status === "completed";

  // Gate 2: payment must be confirmed
  const isPaymentConfirmed = application.paymentStatus === "paid";

  // Both gates must pass before AI can run
  const canRunAI = isApplicationActioned && isPaymentConfirmed;

  const handleRunAI = async (type: "passport" | "vehicle_grant") => {
    try {
      if (type === "passport") setLoadingPassport(true);
      if (type === "vehicle_grant") setLoadingVehicleGrant(true);

      const url =
        type === "passport"
          ? application.documents?.passportUrls?.[0]
          : application.documents?.vehicleGrantUrl;

      if (!url) {
        throw new Error(`No ${type === "passport" ? "passport" : "vehicle grant"} document found`);
      }

      const result = await processDocumentAI(application.id, url, type);

      // Auto-fill fields if confidence >= 0.85
      if (result.overallConfidence >= 0.85) {
        const updates: any = {};
        const ext = result.extractedData || {};

        if (type === "passport") {
           // Try various common passport field names from Form Parser
           const givenName = ext["Given Name"]?.value || ext["First Name"]?.value 
             || ext["Given Names"]?.value || ext["Prenom"]?.value || "";
           const familyName = ext["Family Name"]?.value || ext["Last Name"]?.value 
             || ext["Surname"]?.value || ext["Nom"]?.value || "";
           if (givenName || familyName) {
             updates.name = `${givenName} ${familyName}`.trim();
           }
        } else if (type === "vehicle_grant") {
           const vTypeKey = Object.keys(ext).find(k => 
             k.toLowerCase().includes("type") || k.toLowerCase().includes("model")
           );
           if (vTypeKey && ext[vTypeKey]?.value) {
             updates.vehicleType = ext[vTypeKey].value;
           }
        }
        
        if (Object.keys(updates).length > 0) {
          await updateApplicationFields(application.id, updates, "AI Agent");
        }
      }

      const label = type === "passport" ? "Passport" : "Vehicle Grant";
      toast.success(`${label} analysis complete`, {
        description: `Confidence: ${(result.overallConfidence * 100).toFixed(0)}% — Redirecting to AI Verification…`,
      });

      // Navigate to the AI Verification page after a short delay
      setTimeout(() => {
        navigate("/verification");
      }, 1200);

    } catch (err: any) {
      console.error(err);
      toast.error("AI Analysis Failed", {
        description: err.message || "Failed to process document",
      });
    } finally {
      if (type === "passport") setLoadingPassport(false);
      if (type === "vehicle_grant") setLoadingVehicleGrant(false);
    }
  };

  const renderResult = (result: any, type: "passport" | "vehicle_grant") => {
    if (!result) return null;
    const { status, overallConfidence } = result;
    const isVerified = status === "verified";
    const fieldCount = result.extractedData ? Object.keys(result.extractedData).length : 0;
    
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            {isVerified ? (
              <span className="text-success flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Verified</span>
            ) : (
              <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Needs Review</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {(overallConfidence * 100).toFixed(1)}% • {fieldCount} fields
          </span>
        </div>
        
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-primary gap-1"
          onClick={() => navigate("/verification")}
        >
          <ExternalLink className="w-3 h-3" />
          View full analysis in AI Verification
        </Button>
      </div>
    );
  };

  const isLoading = loadingPassport || loadingVehicleGrant;

  return (
    <Section icon={BrainCircuit} title="AI Document Analysis">
      <div className="space-y-4 mt-2">

        {/* Locked state banner */}
        {!canRunAI && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/60 border border-border text-muted-foreground">
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed space-y-0.5">
              {!isApplicationActioned && (
                <p>
                  <span className="font-semibold text-foreground">Application not yet actioned.</span>{" "}
                  Staff must approve or reject the application before running AI analysis.
                </p>
              )}
              {isApplicationActioned && !isPaymentConfirmed && (
                <p>
                  <span className="font-semibold text-foreground">Payment not confirmed.</span>{" "}
                  AI analysis is available only after the customer's payment has been verified.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Passport Section */}
        {application.documents?.passportUrls && application.documents.passportUrls.length > 0 ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Passport</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRunAI("passport")}
                disabled={isLoading || !canRunAI}
                className="h-8 gap-1.5"
              >
                {loadingPassport ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
                ) : !canRunAI ? (
                  <><Lock className="w-3.5 h-3.5" /> Run AI</>
                ) : (
                  <><PlayCircle className="w-3.5 h-3.5" /> Run AI</>
                )}
              </Button>
            </div>
            {renderResult(passportResult, "passport")}
          </div>
        ) : null}

        {/* Vehicle Grant Section */}
        {application.documents?.vehicleGrantUrl ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Vehicle Grant</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRunAI("vehicle_grant")}
                disabled={isLoading || !canRunAI}
                className="h-8 gap-1.5"
              >
                {loadingVehicleGrant ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
                ) : !canRunAI ? (
                  <><Lock className="w-3.5 h-3.5" /> Run AI</>
                ) : (
                  <><PlayCircle className="w-3.5 h-3.5" /> Run AI</>
                )}
              </Button>
            </div>
            {renderResult(vehicleGrantResult, "vehicle_grant")}
          </div>
        ) : null}
        
        {(!application.documents?.passportUrls?.length && !application.documents?.vehicleGrantUrl) && (
          <p className="text-sm text-muted-foreground">No documents available for analysis.</p>
        )}
      </div>
    </Section>
  );
};
