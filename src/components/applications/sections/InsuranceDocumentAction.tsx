import { useState, useMemo } from "react";
import {
  FileText, Loader2, ExternalLink, RefreshCw, ShieldCheck,
  Download, Lock, QrCode, ClipboardList, Car,
} from "lucide-react";
import { toast } from "sonner";
import { Application } from "@/types";
import { Button } from "@/components/ui/button";
import { useAIVerifications, useApplications, usePayments } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  application: Application;
}

interface DocCard {
  key: "insurance" | "tdac" | "tm2" | "tm3";
  label: string;
  description: string;
  url: string;
  icon: React.ElementType;
  color: string;
}

export const InsuranceDocumentAction = ({ application }: Props) => {
  const { user } = useAuth();
  const { generateAndStoreInsuranceDocument } = useApplications();
  const { payments } = usePayments();
  const { verifications } = useAIVerifications();
  const [loading, setLoading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const paymentVerified = useMemo(() => {
    const match = payments.find((p) => p.applicationId === application.id);
    if (!match) return false;
    return match.verificationStatus === "verified";
  }, [payments, application.id]);

  const hasPassportDocument = !!application.documents?.passportUrls?.length;
  const hasVehicleGrantDocument = !!application.documents?.vehicleGrantUrl;

  const aiAnalysisStatus = useMemo(() => {
    const appVerifications = verifications.filter((verification) => verification.applicationId === application.id);
    const hasPassportAnalysis =
      !hasPassportDocument ||
      appVerifications.some((verification) => String(verification.documentType).toLowerCase() === "passport");
    const hasVehicleGrantAnalysis =
      !hasVehicleGrantDocument ||
      appVerifications.some((verification) =>
        ["vehicle_grant", "vehicle_registration"].includes(String(verification.documentType).toLowerCase())
      );
    const missing = [
      hasPassportDocument && !hasPassportAnalysis ? "Passport" : "",
      hasVehicleGrantDocument && !hasVehicleGrantAnalysis ? "Vehicle Grant" : "",
    ].filter(Boolean);

    return {
      complete: (hasPassportDocument || hasVehicleGrantDocument) && hasPassportAnalysis && hasVehicleGrantAnalysis,
      missing,
    };
  }, [application.id, hasPassportDocument, hasVehicleGrantDocument, verifications]);

  const canGenerate =
    paymentVerified &&
    aiAnalysisStatus.complete &&
    (application.ocrScore ?? 0) >= 70 &&
    (application.status === "approved" ||
      application.status === "processing" ||
      application.status === "document_generated");

  const blockReason = useMemo(() => {
    if (!paymentVerified) return "Awaiting payment confirmation in the Payments page.";
    if (!aiAnalysisStatus.complete) {
      return aiAnalysisStatus.missing.length > 0
        ? `Run AI analysis for ${aiAnalysisStatus.missing.join(" and ")} first.`
        : "Run AI document analysis before generating documents.";
    }
    if ((application.ocrScore ?? 0) < 70) return "OCR score is below the 70% threshold.";
    return "Application status must be Approved or Processing.";
  }, [paymentVerified, aiAnalysisStatus.complete, aiAnalysisStatus.missing, application.ocrScore, application.status]);

  const hasAnyDoc =
    !!application.insuranceDocumentUrl ||
    !!application.tdacDocumentUrl ||
    !!application.tm2DocumentUrl ||
    !!application.tm3DocumentUrl;

  // Hide entirely if no docs and can't generate and not in relevant state
  if (
    !hasAnyDoc &&
    !canGenerate &&
    application.status !== "approved" &&
    application.status !== "processing" &&
    application.status !== "document_generated"
  ) {
    return null;
  }

  const docCards: DocCard[] = [
    {
      key: "insurance",
      label: "Vehicle Insurance",
      description: "Cross-border insurance certificate",
      url: application.insuranceDocumentUrl || "",
      icon: ShieldCheck,
      color: "text-blue-600",
    },
    {
      key: "tdac",
      label: "TDAC QR Mockup",
      description: "Thailand road tax certificate",
      url: application.tdacDocumentUrl || "",
      icon: QrCode,
      color: "text-emerald-600",
    },
    {
      key: "tm2",
      label: "TM2 — Immigration Card",
      description: "Notification of staying in Thailand",
      url: application.tm2DocumentUrl || "",
      icon: ClipboardList,
      color: "text-violet-600",
    },
    {
      key: "tm3",
      label: "TM3 — Vehicle Entry",
      description: "Vehicle entry declaration form",
      url: application.tm3DocumentUrl || "",
      icon: Car,
      color: "text-orange-600",
    },
  ];

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await generateAndStoreInsuranceDocument({ ...application, paymentStatus: "paid" }, user);
      toast.success("All 4 documents generated successfully!", {
        description: "Vehicle Insurance, TDAC QR, TM2, and TM3 are ready.",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate documents");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (url: string) => {
    if (url) window.open(url, "_blank", "noopener");
  };

  const handleDownload = async (url: string, label: string, key: string) => {
    if (!url || downloadingKey) return;
    setDownloadingKey(key);
    try {
      const refId = application.orderId || application.id;
      const filename = `${label.replace(/\s+/g, "-")}-${refId}.pdf`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch_failed");
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success(`${label} downloaded`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download");
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Document Pack</span>
        </div>
        {hasAnyDoc && canGenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="h-7 gap-1.5 text-xs"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating…</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5" /> Re-generate All</>
            )}
          </Button>
        )}
      </div>

      {/* Generate button (no docs yet) */}
      {!hasAnyDoc && (
        <div className="space-y-2">
          <Button
            onClick={canGenerate ? handleGenerate : undefined}
            disabled={!canGenerate || loading}
            className="w-full gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating All Documents…</>
            ) : canGenerate ? (
              <><FileText className="h-4 w-4" /> Generate All Documents</>
            ) : (
              <><Lock className="h-4 w-4" /> Generate All Documents</>
            )}
          </Button>
          {!canGenerate && (
            <p className="text-xs text-muted-foreground text-center">{blockReason}</p>
          )}
        </div>
      )}

      {/* 2×2 document cards */}
      {hasAnyDoc && (
        <div className="grid grid-cols-2 gap-2">
          {docCards.map((card) => {
            const Icon = card.icon;
            const ready = !!card.url;
            const isDownloading = downloadingKey === card.key;

            return (
              <div
                key={card.key}
                className={`p-3 rounded-lg border transition-all ${
                  ready
                    ? "border-border bg-card hover:shadow-sm"
                    : "border-dashed border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-start gap-2 mb-2.5">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${ready ? card.color : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{card.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{card.description}</p>
                  </div>
                </div>

                {ready ? (
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => handleView(card.url)}
                      disabled={isDownloading}
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => handleDownload(card.url, card.label, card.key)}
                      disabled={!!downloadingKey}
                    >
                      {isDownloading ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> …</>
                      ) : (
                        <><Download className="h-3 w-3" /> Save</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center mt-1">Not yet generated</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Loading progress overlay */}
      {loading && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Generating documents…</span>
            <br />
            Insurance PDF, TDAC QR, TM2 Form, TM3 Form — uploading to Firebase
          </div>
        </div>
      )}
    </div>
  );
};
