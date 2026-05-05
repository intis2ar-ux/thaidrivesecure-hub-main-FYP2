import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceIndicatorProps {
  confidence: number;
  showExplanation?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ConfidenceIndicator = ({
  confidence,
  showExplanation = true,
  size = "md",
}: ConfidenceIndicatorProps) => {
  const percentage = Math.round(confidence * 100);

  const getStatus = () => {
    if (confidence >= 0.85) {
      return {
        label: "Auto Verified",
        description: "High confidence - document automatically verified by AI",
        color: "text-success",
        bgColor: "bg-success",
        bgLight: "bg-success/15",
        borderColor: "border-success/30",
        Icon: CheckCircle,
      };
    }
    if (confidence >= 0.7) {
      return {
        label: "Manual Review Required",
        description: "Medium confidence - requires staff review before approval",
        color: "text-warning",
        bgColor: "bg-warning",
        bgLight: "bg-warning/15",
        borderColor: "border-warning/30",
        Icon: AlertTriangle,
      };
    }
    return {
      label: "Flagged (High Risk)",
      description: "Low confidence - document flagged for detailed inspection",
      color: "text-destructive",
      bgColor: "bg-destructive",
      bgLight: "bg-destructive/15",
      borderColor: "border-destructive/30",
      Icon: XCircle,
    };
  };

  const status = getStatus();
  const { Icon } = status;

  const sizeClasses = {
    sm: {
      container: "p-2",
      icon: "h-4 w-4",
      text: "text-xs",
      percentage: "text-lg",
    },
    md: {
      container: "p-4",
      icon: "h-5 w-5",
      text: "text-sm",
      percentage: "text-2xl",
    },
    lg: {
      container: "p-6",
      icon: "h-6 w-6",
      text: "text-base",
      percentage: "text-3xl",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        "rounded-lg border",
        status.bgLight,
        status.borderColor,
        classes.container
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn(classes.icon, status.color)} />
          <span className={cn("font-semibold", status.color, classes.text)}>
            {status.label}
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-semibold">Confidence Thresholds</p>
                <div className="text-xs space-y-1">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-success" />
                    ≥85%: Auto Verified
                  </p>
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    70-84%: Manual Review
                  </p>
                  <p className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-destructive" />
                    &lt;70%: Flagged (High Risk)
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-end gap-3">
        <span className={cn("font-bold tabular-nums", status.color, classes.percentage)}>
          {percentage}%
        </span>
        <span className={cn("text-muted-foreground mb-1", classes.text)}>
          confidence
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn("h-2 mt-3", status.bgLight)}
      />

      {showExplanation && (
        <p className={cn("mt-3 text-muted-foreground", classes.text)}>
          {status.description}
        </p>
      )}
    </div>
  );
};