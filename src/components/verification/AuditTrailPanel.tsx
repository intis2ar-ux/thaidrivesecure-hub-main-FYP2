import { VerificationAudit } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Flag,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditTrailPanelProps {
  auditTrail: VerificationAudit[];
}

export const AuditTrailPanel = ({ auditTrail }: AuditTrailPanelProps) => {
  const getActionConfig = (action: VerificationAudit["action"]) => {
    switch (action) {
      case "approved":
        return {
          icon: CheckCircle,
          color: "text-success",
          bg: "bg-success/10",
          border: "border-success/30",
          label: "Approved",
        };
      case "rejected":
        return {
          icon: XCircle,
          color: "text-destructive",
          bg: "bg-destructive/10",
          border: "border-destructive/30",
          label: "Rejected",
        };
      case "flagged":
        return {
          icon: Flag,
          color: "text-warning",
          bg: "bg-warning/10",
          border: "border-warning/30",
          label: "Flagged",
        };
      case "re_upload_requested":
        return {
          icon: RefreshCw,
          color: "text-primary",
          bg: "bg-primary/10",
          border: "border-primary/30",
          label: "Re-upload Requested",
        };
      default:
        return {
          icon: Clock,
          color: "text-muted-foreground",
          bg: "bg-muted",
          border: "border-border",
          label: action,
        };
    }
  };

  const getRejectionReasonLabel = (reason?: string) => {
    switch (reason) {
      case "blurred":
        return "Document is blurred";
      case "mismatch":
        return "Data mismatch detected";
      case "expired":
        return "Document has expired";
      case "unclear":
        return "Information is unclear";
      case "incomplete":
        return "Document is incomplete";
      case "fraudulent":
        return "Suspected fraudulent document";
      default:
        return reason;
    }
  };

  if (auditTrail.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No review history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Verification History
      </h4>

      <ScrollArea className="h-[200px]">
        <div className="space-y-3 pr-4">
          {auditTrail.map((audit, index) => {
            const config = getActionConfig(audit.action);
            const Icon = config.icon;

            return (
              <div
                key={audit.id || index}
                className={cn(
                  "p-3 rounded-lg border",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-1.5 rounded-full", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn("font-medium text-sm", config.color)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(audit.timestamp, "MMM dd, HH:mm")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{audit.reviewerName}</span>
                    </div>

                    {audit.reason && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        Reason: {getRejectionReasonLabel(audit.reason)}
                      </p>
                    )}

                    {audit.notes && (
                      <p className="text-xs mt-1 text-muted-foreground italic">
                        "{audit.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};