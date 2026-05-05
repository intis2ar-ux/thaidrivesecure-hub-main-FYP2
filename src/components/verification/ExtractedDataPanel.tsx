import { ExtractedField, Application } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExtractedDataPanelProps {
  fields: ExtractedField[];
  application?: Application | null;
}

export const ExtractedDataPanel = ({
  fields,
  application,
}: ExtractedDataPanelProps) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return "text-success";
    if (score >= 0.7) return "text-warning";
    return "text-destructive";
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 0.85) return "bg-success/10";
    if (score >= 0.7) return "bg-warning/10";
    return "bg-destructive/10";
  };

  // Simulate comparison with application data
  const getExpectedValue = (label: string): string | undefined => {
    if (!application) return undefined;
    const labelLower = label.toLowerCase();
    if (labelLower.includes("name")) return application.name;
    if (labelLower.includes("email")) return undefined;
    return undefined;
  };

  const checkMismatch = (field: ExtractedField): boolean => {
    if (field.isMismatch !== undefined) return field.isMismatch;
    const expected = field.expectedValue || getExpectedValue(field.label);
    if (!expected) return false;
    return expected.toLowerCase() !== field.value.toLowerCase();
  };

  const missingFields = ["Date of Birth", "Address"].filter(
    (f) => !fields.some((field) => field.label.toLowerCase().includes(f.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Extracted Data</h4>
        <div className="flex items-center gap-2">
          {fields.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {fields.length} fields
            </Badge>
          )}
        </div>
      </div>

      {/* Extracted Fields */}
      <div className="space-y-2">
        {fields.map((field, index) => {
          const isMismatch = checkMismatch(field);
          const expectedValue = field.expectedValue || getExpectedValue(field.label);

          return (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isMismatch
                  ? "border-destructive/50 bg-destructive/5"
                  : getConfidenceBg(field.confidence),
                "hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {field.label}
                  </p>
                  <p className="font-semibold mt-0.5">{field.value}</p>
                  {isMismatch && expectedValue && (
                    <div className="mt-1 flex items-center gap-1 text-destructive">
                      <XCircle className="h-3 w-3" />
                      <span className="text-xs">Expected: {expectedValue}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isMismatch ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : field.confidence >= 0.85 ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : null}
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      getConfidenceColor(field.confidence)
                    )}
                  >
                    {(field.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Missing Fields Warning */}
      {missingFields.length > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning-foreground">
                Missing Fields Detected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Could not extract: {missingFields.join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Application Data Comparison */}
      {application && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
            Application Reference
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{application.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium text-xs">{application.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Route:</span>{" "}
              <span className="font-medium capitalize">{application.where}</span>
            </div>
            <div>
              <span className="text-muted-foreground">App ID:</span>{" "}
              <span className="font-medium font-mono text-xs">{application.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};