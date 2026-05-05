import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

export interface Permission {
  action: string;
  resource: string;
}

// Define all permissions for roles
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Applications
    { action: "view", resource: "applications" },
    { action: "approve", resource: "applications" },
    { action: "reject", resource: "applications" },
    { action: "update", resource: "applications" },
    { action: "delete", resource: "applications" },
    // AI Verification
    { action: "view", resource: "verification" },
    { action: "approve", resource: "verification" },
    { action: "reject", resource: "verification" },
    { action: "override", resource: "verification" },
    // Payments
    { action: "view", resource: "payments" },
    { action: "update", resource: "payments" },
    { action: "refund", resource: "payments" },
    // Tracking
    { action: "view", resource: "tracking" },
    { action: "update", resource: "tracking" },
    // Add-ons
    { action: "view", resource: "addons" },
    { action: "update", resource: "addons" },
    // Analytics
    { action: "view", resource: "analytics" },
    // Reports
    { action: "view", resource: "reports" },
    { action: "generate", resource: "reports" },
    { action: "download", resource: "reports" },
    // Logs
    { action: "view", resource: "logs" },
    // Audit
    { action: "view", resource: "audit" },
    // Settings
    { action: "view", resource: "settings" },
    { action: "update", resource: "settings" },
    // Team
    { action: "view", resource: "team" },
    { action: "manage", resource: "team" },
  ],
  staff: [
    // Applications - full CRUD
    { action: "view", resource: "applications" },
    { action: "approve", resource: "applications" },
    { action: "reject", resource: "applications" },
    { action: "update", resource: "applications" },
    { action: "delete", resource: "applications" },
    // AI Verification - can review but not override
    { action: "view", resource: "verification" },
    { action: "approve", resource: "verification" },
    { action: "reject", resource: "verification" },
    // Payments - view only
    { action: "view", resource: "payments" },
    // Tracking
    { action: "view", resource: "tracking" },
    { action: "update", resource: "tracking" },
    // Add-ons - view only
    { action: "view", resource: "addons" },
    // Analytics - view only
    { action: "view", resource: "analytics" },
    // Logs - limited view
    { action: "view", resource: "logs" },
  ],
};

// Admin-only actions
const adminOnlyActions = [
  { action: "override", resource: "verification" },
  { action: "update", resource: "payments" },
  { action: "refund", resource: "payments" },
  { action: "generate", resource: "reports" },
  { action: "download", resource: "reports" },
  { action: "view", resource: "audit" },
  { action: "view", resource: "settings" },
  { action: "update", resource: "settings" },
  { action: "manage", resource: "team" },
];

export const useRBAC = () => {
  const { user } = useAuth();

  const hasPermission = (action: string, resource: string): boolean => {
    if (!user?.role) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.some((p) => p.action === action && p.resource === resource);
  };

  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const isStaff = (): boolean => {
    return user?.role === "staff";
  };

  const canPerformAction = (action: string, resource: string): boolean => {
    return hasPermission(action, resource);
  };

  const isAdminOnlyAction = (action: string, resource: string): boolean => {
    return adminOnlyActions.some((a) => a.action === action && a.resource === resource);
  };

  const getBlockedReason = (action: string, resource: string): string | null => {
    if (!user) return "You must be logged in to perform this action.";
    if (!hasPermission(action, resource)) {
      if (isAdminOnlyAction(action, resource)) {
        return "This action requires admin privileges.";
      }
      return "You don't have permission to perform this action.";
    }
    return null;
  };

  const getAllowedActions = (resource: string): string[] => {
    if (!user?.role) return [];
    const permissions = rolePermissions[user.role] || [];
    return permissions.filter((p) => p.resource === resource).map((p) => p.action);
  };

  return {
    user,
    hasPermission,
    isAdmin,
    isStaff,
    canPerformAction,
    isAdminOnlyAction,
    getBlockedReason,
    getAllowedActions,
    role: user?.role,
  };
};
