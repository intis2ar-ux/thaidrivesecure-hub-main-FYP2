import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  FileText,
  Brain,
  Scale,
  Loader2
} from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";
import { cn } from "@/lib/utils";

interface AIOverrideFlowProps {
  verificationId: string;
  originalConfidence: number;
  originalDecision: "approved" | "rejected" | "pending";
  onOverride: (decision: "approved" | "rejected", justification: string) => Promise<void>;
  isDisabled?: boolean;
}

export const AIOverrideFlow: React.FC<AIOverrideFlowProps> = ({
  verificationId,
  originalConfidence,
  originalDecision,
  onOverride,
  isDisabled = false,
}) => {
  const { isAdmin, hasPermission } = useRBAC();
  const [isOpen, setIsOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<"approved" | "rejected" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canOverride = hasPermission("override", "verification");

  const handleOverride = async () => {
    if (!selectedDecision || !justification.trim()) return;

    setIsLoading(true);
    try {
      await onOverride(selectedDecision, justification);
      setIsOpen(false);
      setJustification("");
      setSelectedDecision(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canOverride) {
    return (
      <Alert className="border-warning/30 bg-warning/5">
        <ShieldAlert className="h-4 w-4 text-warning" />
        <AlertTitle>Override Restricted</AlertTitle>
        <AlertDescription>
          Only administrators can override AI verification decisions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
          disabled={isDisabled}
        >
          <Scale className="h-4 w-4 mr-2" />
          Override AI Decision
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Override AI Verification Decision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Decision Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Original AI Decision</p>
                    <p className="font-semibold capitalize">{originalDecision}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence Score</p>
                  <p className={cn(
                    "font-bold text-lg",
                    originalConfidence >= 0.85 ? "text-success" :
                    originalConfidence >= 0.7 ? "text-warning" : "text-destructive"
                  )}>
                    {(originalConfidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Alert className="border-warning/30 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Overriding AI decisions requires documented justification. This action will be 
              recorded in the audit trail with your name, the original AI confidence score, 
              and your provided reason.
            </AlertDescription>
          </Alert>

          {/* Decision Selection */}
          <div className="space-y-2">
            <Label>Select Override Decision</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={selectedDecision === "approved" ? "default" : "outline"}
                className={cn(
                  "h-auto py-4 flex flex-col gap-2",
                  selectedDecision === "approved" && "bg-success hover:bg-success/90 border-success"
                )}
                onClick={() => setSelectedDecision("approved")}
              >
                <CheckCircle className="h-6 w-6" />
                <span>Approve</span>
                <span className="text-xs opacity-70">Override to verified</span>
              </Button>
              <Button
                type="button"
                variant={selectedDecision === "rejected" ? "default" : "outline"}
                className={cn(
                  "h-auto py-4 flex flex-col gap-2",
                  selectedDecision === "rejected" && "bg-destructive hover:bg-destructive/90 border-destructive"
                )}
                onClick={() => setSelectedDecision("rejected")}
              >
                <XCircle className="h-6 w-6" />
                <span>Reject</span>
                <span className="text-xs opacity-70">Override to rejected</span>
              </Button>
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Provide a clear justification for overriding the AI decision. This will be recorded in the audit trail..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters required. Be specific about why the AI decision is incorrect.
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={!selectedDecision || justification.length < 20 || isLoading}
              className={cn(
                selectedDecision === "approved" && "bg-success hover:bg-success/90",
                selectedDecision === "rejected" && "bg-destructive hover:bg-destructive/90"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Confirm Override
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AIMetricsDashboardProps {
  metrics: {
    totalVerifications: number;
    autoVerifiedCount: number;
    manualReviewCount: number;
    flaggedCount: number;
    humanOverrideCount: number;
    autoVerificationSuccessRate: number;
    humanOverrideRate: number;
    averageConfidence: number;
  };
  className?: string;
}

export const AIMetricsDashboard: React.FC<AIMetricsDashboardProps> = ({
  metrics,
  className,
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">{metrics.totalVerifications}</p>
            <p className="text-xs text-muted-foreground">Total Verifications</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">
              {metrics.autoVerificationSuccessRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Auto-Verification Rate</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <p className="text-2xl font-bold text-warning">{metrics.manualReviewCount}</p>
            <p className="text-xs text-muted-foreground">Manual Reviews</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 text-center">
            <p className="text-2xl font-bold text-accent">
              {(metrics.averageConfidence * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg. Confidence</p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-semibold">{metrics.autoVerifiedCount}</p>
              <p className="text-xs text-muted-foreground">Auto-Verified</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="font-semibold">{metrics.flaggedCount}</p>
              <p className="text-xs text-muted-foreground">Flagged (High Risk)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/10">
              <Scale className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="font-semibold">{metrics.humanOverrideCount}</p>
              <p className="text-xs text-muted-foreground">Human Overrides</p>
            </div>
          </div>
        </div>

        {metrics.humanOverrideRate > 10 && (
          <Alert className="mt-4 border-warning/30 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              Human override rate is above 10%. Consider reviewing AI model calibration.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
