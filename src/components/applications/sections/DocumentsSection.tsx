import { FileText, Eye, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { Application } from "@/types";
import { Section } from "./SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  application: Application;
  reuploadRequests?: Record<string, any>;
  onPreview: (preview: { url: string; title: string }) => void;
  onReupload: (type: "passport" | "vehicle_grant") => void;
  onVerifyReupload?: () => void;
  isVerifying?: boolean;
}

export const DocumentsSection = ({
  application,
  reuploadRequests,
  onPreview,
  onReupload,
  onVerifyReupload,
  isVerifying = false,
}: Props) => {
  const isPassportPending =
    reuploadRequests?.passport?.status === "PENDING" ||
    application.reuploadRequests?.passport?.status === "PENDING";
  const isVehicleGrantPending =
    reuploadRequests?.vehicleGrant?.status === "PENDING" ||
    application.reuploadRequests?.vehicleGrant?.status === "PENDING";

  const isReuploadRequired = application.status === "REUPLOAD_REQUIRED";
  const hasPendingRequests = isPassportPending || isVehicleGrantPending;

  return (
    <Section icon={FileText} title="Documents">
      <div className="space-y-6">

        {/* ── Reupload Review Banner ── */}
        {isReuploadRequired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Re-uploaded Documents Awaiting Review
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  The customer has submitted new documents. Review them below, then click{" "}
                  <strong>Verify &amp; Continue</strong> to move the application back to{" "}
                  <span className="font-medium">Pending → Payment</span>.
                </p>
              </div>
            </div>
            {onVerifyReupload && (
              <Button
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                onClick={onVerifyReupload}
                disabled={isVerifying}
              >
                <CheckCircle className="h-4 w-4" />
                {isVerifying ? "Verifying…" : "Verify & Continue to Payment"}
              </Button>
            )}
          </div>
        )}

        {/* ── Passport Section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Passport Documents
              </p>
              {isPassportPending && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 border-orange-200 bg-orange-50 text-orange-700 gap-1 font-medium"
                >
                  <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" />
                  Requested
                </Badge>
              )}
            </div>
            {application.documents?.passportUrls &&
              application.documents.passportUrls.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPassportPending}
                  className="h-7 text-[10px] text-muted-foreground hover:text-destructive gap-1"
                  onClick={() => onReupload("passport")}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isPassportPending ? "" : "text-orange-500"}`}
                  />
                  {isPassportPending ? "Re-upload Pending" : "Request Re-upload"}
                </Button>
              )}
          </div>

          {application.documents?.passportUrls &&
          application.documents.passportUrls.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {application.documents.passportUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() =>
                    onPreview({ url, title: `Passport ${index + 1}` })
                  }
                  className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer w-fit"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Passport {index + 1}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No passport documents uploaded
            </p>
          )}
        </div>

        {/* ── Vehicle Grant Section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Vehicle Grant
              </p>
              {isVehicleGrantPending && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 border-orange-200 bg-orange-50 text-orange-700 gap-1 font-medium"
                >
                  <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" />
                  Requested
                </Badge>
              )}
            </div>
            {application.documents?.vehicleGrantUrl && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isVehicleGrantPending}
                className="h-7 text-[10px] text-muted-foreground hover:text-destructive gap-1"
                onClick={() => onReupload("vehicle_grant")}
              >
                <RefreshCw
                  className={`h-3 w-3 ${isVehicleGrantPending ? "" : "text-orange-500"}`}
                />
                {isVehicleGrantPending ? "Re-upload Pending" : "Request Re-upload"}
              </Button>
            )}
          </div>

          {application.documents?.vehicleGrantUrl ? (
            <button
              onClick={() =>
                onPreview({
                  url: application.documents!.vehicleGrantUrl!,
                  title: "Vehicle Grant",
                })
              }
              className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer w-fit"
            >
              <Eye className="h-3.5 w-3.5" />
              View Vehicle Grant
            </button>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No vehicle grant document uploaded
            </p>
          )}
        </div>
      </div>
    </Section>
  );
};
