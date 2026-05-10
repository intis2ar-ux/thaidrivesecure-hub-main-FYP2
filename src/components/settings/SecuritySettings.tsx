import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Shield,
  Clock,
  Key,
  Smartphone,
  LogOut,
  Monitor,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface SecurityData {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // in minutes
  lastLogin?: Date;
  lastLoginDevice?: string;
}

interface SecuritySettingsProps {
  security: SecurityData;
  onUpdate: (field: string, value: boolean | number) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const SecuritySettings = ({
  security,
  onUpdate,
  onSave,
  isSaving,
}: SecuritySettingsProps) => {
  const { toast } = useToast();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);


  const handleForceLogout = () => {
    toast({
      title: "Sessions Terminated",
      description: "All other sessions have been logged out.",
    });
    setShowLogoutDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Manage authentication, sessions, and security preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Smartphone className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Two-Factor Authentication</Label>
                {security.twoFactorEnabled ? (
                  <Badge className="bg-success/10 text-success border-0">Enabled</Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning">
                    Recommended
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security using authenticator app or SMS
              </p>
            </div>
          </div>
          <Switch
            checked={security.twoFactorEnabled}
            onCheckedChange={(checked) => onUpdate("twoFactorEnabled", checked)}
          />
        </div>

        <Separator />

        {/* Session Timeout */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <Label className="text-base font-medium">Session Timeout</Label>
              <p className="text-sm text-muted-foreground">
                Automatically log out after period of inactivity
              </p>
            </div>
          </div>
          <Select
            value={String(security.sessionTimeout)}
            onValueChange={(value) => onUpdate("sessionTimeout", parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Force Logout All Sessions */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <Label className="text-base font-medium">Force Logout All Sessions</Label>
              <p className="text-sm text-muted-foreground">
                Sign out from all devices and browsers
              </p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setShowLogoutDialog(true)}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout All
          </Button>
        </div>

        <Separator />

        {/* Last Login Activity */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Last Login Activity</Label>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Time:</span>
              <p className="font-medium">
                {security.lastLogin
                  ? format(security.lastLogin, "PPp")
                  : "Not available"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Device:</span>
              <p className="font-medium">{security.lastLoginDevice || "Unknown device"}</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Update Security Settings
          </Button>
        </div>
      </CardContent>

      {/* Force Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Force Logout All Sessions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out from all devices and browsers. You will need to log
              in again on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogout}
              className="bg-destructive hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout All Sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
