import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Bell,
  Mail,
  FileText,
  CreditCard,
  Brain,
  AlertCircle,
} from "lucide-react";

interface NotificationData {
  emailNotifications: boolean;
  // Operational
  newApplicationAlerts: boolean;
  applicationStatusAlerts: boolean;
  // Financial
  paymentFailureAlerts: boolean;
  paymentSuccessAlerts: boolean;
  // AI System
  lowConfidenceAIAlerts: boolean;
  aiSystemErrorAlerts: boolean;
}

interface NotificationSettingsProps {
  notifications: NotificationData;
  userRole: string;
  onUpdate: (field: keyof NotificationData, value: boolean) => void;
  onSave: () => Promise<void>;
  onApplyDefaults: () => void;
  isSaving: boolean;
}

export const NotificationSettings = ({
  notifications,
  userRole,
  onUpdate,
  onSave,
  onApplyDefaults,
  isSaving,
}: NotificationSettingsProps) => {
  const NotificationToggle = ({
    field,
    icon: Icon,
    label,
    description,
    disabled = false,
  }: {
    field: keyof NotificationData;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    disabled?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between py-3 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
        <div className="space-y-0.5">
          <Label className={disabled ? "text-muted-foreground" : ""}>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={notifications[field]}
        onCheckedChange={(checked) => onUpdate(field, checked)}
        disabled={disabled || !notifications.emailNotifications}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure how and when you receive notifications
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onApplyDefaults}>
            Apply {userRole === "admin" ? "Admin" : "Staff"} Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Email Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Email Notifications</Label>
                <Badge variant="secondary" className="text-xs">
                  Master Toggle
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Enable or disable all email notifications
              </p>
            </div>
          </div>
          <Switch
            checked={notifications.emailNotifications}
            onCheckedChange={(checked) => onUpdate("emailNotifications", checked)}
          />
        </div>

        {!notifications.emailNotifications && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning border border-warning/20">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">All email notifications are currently disabled</span>
          </div>
        )}

        {/* Operational Notifications */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm uppercase tracking-wide text-primary">
              Operational
            </h3>
          </div>
          <div className="space-y-1 pl-2 border-l-2 border-primary/20">
            <NotificationToggle
              field="newApplicationAlerts"
              icon={FileText}
              label="New Application Submitted"
              description="Get notified when a new insurance application is submitted"
            />
            <Separator />
            <NotificationToggle
              field="applicationStatusAlerts"
              icon={FileText}
              label="Application Status Changes"
              description="Updates when applications are approved, rejected, or need attention"
            />
          </div>
        </div>

        <Separator />

        {/* Financial Notifications */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-success" />
            <h3 className="font-medium text-sm uppercase tracking-wide text-success">
              Financial
            </h3>
          </div>
          <div className="space-y-1 pl-2 border-l-2 border-success/20">
            <NotificationToggle
              field="paymentFailureAlerts"
              icon={CreditCard}
              label="Payment Failures"
              description="Alert when customer payments fail or are declined"
            />
            <Separator />
            <NotificationToggle
              field="paymentSuccessAlerts"
              icon={CreditCard}
              label="Successful Payments"
              description="Notification for successfully processed payments"
            />
          </div>
        </div>

        <Separator />

        {/* AI System Notifications */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-accent" />
            <h3 className="font-medium text-sm uppercase tracking-wide text-accent">
              AI System
            </h3>
          </div>
          <div className="space-y-1 pl-2 border-l-2 border-accent/20">
            <NotificationToggle
              field="lowConfidenceAIAlerts"
              icon={Brain}
              label="Low Confidence AI Verification"
              description="Alert when AI confidence falls below threshold requiring manual review"
            />
            <Separator />
            <NotificationToggle
              field="aiSystemErrorAlerts"
              icon={AlertCircle}
              label="AI System Errors"
              description="Critical alerts for AI service failures or anomalies"
            />
          </div>
        </div>

        {/* Role-based Preset Info */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Role-based defaults:</strong>{" "}
            {userRole === "admin"
              ? "Admins receive all notifications including system errors and financial alerts."
              : "Staff members receive operational notifications by default. Financial and system alerts are disabled."}
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
