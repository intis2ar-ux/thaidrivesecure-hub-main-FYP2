import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Database,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  CreditCard,
} from "lucide-react";

interface SystemStatus {
  firestore: "online" | "offline" | "degraded";
  aiService: "online" | "offline" | "degraded";
  paymentSystem: "online" | "offline" | "degraded";
}

interface SystemSettingsProps {
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export const SystemSettings = ({
  onSave,
  isSaving,
}: SystemSettingsProps) => {

  // Simulated system status for FYP prototype
  const systemStatus: SystemStatus = {
    firestore: "online",
    aiService: "online",
    paymentSystem: "online",
  };

  const getStatusBadge = (status: "online" | "offline" | "degraded") => {
    const config = {
      online: { icon: CheckCircle, color: "bg-success/10 text-success", label: "Online" },
      offline: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Offline" },
      degraded: { icon: AlertTriangle, color: "bg-warning/10 text-warning", label: "Degraded" },
    };
    const { icon: Icon, color, label } = config[status];
    return (
      <Badge className={`${color} border-0 gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getConfidenceLabel = (value: number) => {
    if (value >= 0.9) return { label: "High", color: "text-success" };
    if (value >= 0.7) return { label: "Medium", color: "text-warning" };
    return { label: "Low", color: "text-destructive" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          System Configuration
        </CardTitle>
        <CardDescription>
          Manage AI thresholds, system behavior, and data operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Firestore</span>
            </div>
            {getStatusBadge(systemStatus.firestore)}
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">AI Service</span>
            </div>
            {getStatusBadge(systemStatus.aiService)}
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Payment System</span>
            </div>
            {getStatusBadge(systemStatus.paymentSystem)}
          </div>
        </div>



        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
