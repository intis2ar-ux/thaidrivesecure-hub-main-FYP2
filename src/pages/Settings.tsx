import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { TeamManagement } from "@/components/settings/TeamManagement";
import {
  Shield,
  Bell,
  Database,
  Users,
  Loader2,
} from "lucide-react";

interface AdminSettings {
  profile: {
    name: string;
    email: string;
    avatarUrl?: string;
    lastUpdated?: Date;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    lastLogin?: Date;
    lastLoginDevice?: string;
  };
  notifications: {
    emailNotifications: boolean;
    newApplicationAlerts: boolean;
    applicationStatusAlerts: boolean;
    paymentFailureAlerts: boolean;
    paymentSuccessAlerts: boolean;
    lowConfidenceAIAlerts: boolean;
    aiSystemErrorAlerts: boolean;
  };
  system: {
    aiConfidenceThreshold: number;
    queuePriorityThreshold: number;
    maintenanceMode: boolean;
  };
}

const getDefaultNotifications = (role: string): AdminSettings["notifications"] => {
  if (role === "admin") {
    return {
      emailNotifications: true,
      newApplicationAlerts: true,
      applicationStatusAlerts: true,
      paymentFailureAlerts: true,
      paymentSuccessAlerts: true,
      lowConfidenceAIAlerts: true,
      aiSystemErrorAlerts: true,
    };
  }
  // Staff defaults
  return {
    emailNotifications: true,
    newApplicationAlerts: true,
    applicationStatusAlerts: true,
    paymentFailureAlerts: false,
    paymentSuccessAlerts: false,
    lowConfidenceAIAlerts: true,
    aiSystemErrorAlerts: false,
  };
};

const defaultSettings: AdminSettings = {
  profile: {
    name: "",
    email: "",
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    lastLogin: new Date(),
    lastLoginDevice: "Chrome on Windows",
  },
  notifications: getDefaultNotifications("admin"),
  system: {
    aiConfidenceThreshold: 0.85,
    queuePriorityThreshold: 100,
    maintenanceMode: false,
  },
};

const Settings = () => {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);

  // Fetch settings from Firebase on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!firebaseUser) return;

      try {
        const settingsDoc = await getDoc(doc(db, "adminSettings", "config"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            profile: {
              name: user?.name || data.profile?.name || "",
              email: user?.email || data.profile?.email || "",
              avatarUrl: data.profile?.avatarUrl,
              lastUpdated: data.profile?.lastUpdated?.toDate(),
            },
            security: {
              twoFactorEnabled: data.security?.twoFactorEnabled ?? false,
              sessionTimeout: data.security?.sessionTimeout ?? 30,
              lastLogin: data.security?.lastLogin?.toDate() ?? new Date(),
              lastLoginDevice: data.security?.lastLoginDevice ?? "Unknown device",
            },
            notifications: {
              ...getDefaultNotifications(user?.role || "staff"),
              ...data.notifications,
            },
            system: {
              aiConfidenceThreshold: data.system?.aiConfidenceThreshold ?? 0.85,
              queuePriorityThreshold: data.system?.queuePriorityThreshold ?? 100,
              maintenanceMode: data.system?.maintenanceMode ?? false,
            },
          });
        } else {
          // Initialize with user data if no settings exist
          setSettings({
            ...defaultSettings,
            profile: {
              name: user?.name || "",
              email: user?.email || "",
            },
            notifications: getDefaultNotifications(user?.role || "staff"),
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings from database.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [firebaseUser, user, toast]);

  const saveSettings = async (section?: keyof AdminSettings) => {
    if (!firebaseUser) return;

    setIsSaving(true);
    try {
      const dataToSave = {
        ...settings,
        profile: {
          ...settings.profile,
          lastUpdated: new Date(),
        },
      };
      await setDoc(doc(db, "adminSettings", "config"), dataToSave, { merge: true });
      setSettings(prev => ({
        ...prev,
        profile: { ...prev.profile, lastUpdated: new Date() },
      }));
      toast({
        title: "Settings Saved",
        description: section
          ? `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully.`
          : "All settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings to database.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const updateSecurity = (field: string, value: boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      security: { ...prev.security, [field]: value },
    }));
  };

  const updateNotifications = (field: string, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  const updateSystem = (field: string, value: number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      system: { ...prev.system, [field]: value },
    }));
  };

  const applyNotificationDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      notifications: getDefaultNotifications(user?.role || "staff"),
    }));
    toast({
      title: "Defaults Applied",
      description: `${user?.role === "admin" ? "Admin" : "Staff"} notification presets have been applied.`,
    });
  };


  // Only admin can access this page
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <Header title="Settings" subtitle="Admin access required" />
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                You need admin privileges to access system settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <Header title="Settings" subtitle="Manage system configuration and preferences" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Settings"
        subtitle="Manage system configuration and preferences for ThaiDriveSecure"
      />

      <div className="p-6">
        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="grid w-full max-w-[500px] grid-cols-4 gap-1 p-1 h-auto">
            <TabsTrigger value="security" className="flex items-center gap-2 py-2.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-2.5">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 py-2.5">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2 py-2.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          {/* Security Settings */}
          <TabsContent value="security">
            <SecuritySettings
              security={settings.security}
              onUpdate={updateSecurity}
              onSave={() => saveSettings("security")}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <NotificationSettings
              notifications={settings.notifications}
              userRole={user?.role || "admin"}
              onUpdate={updateNotifications}
              onSave={() => saveSettings("notifications")}
              onApplyDefaults={applyNotificationDefaults}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system">
            <SystemSettings
              system={settings.system}
              onUpdate={updateSystem}
              onSave={() => saveSettings("system")}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Team Settings */}
          <TabsContent value="team">
            <Card>
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Management
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invite staff members, assign roles, and manage team access
                  </p>
                </div>
                <TeamManagement />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
