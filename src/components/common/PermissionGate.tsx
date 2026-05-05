import React from "react";
import { useRBAC } from "@/hooks/useRBAC";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionGateProps {
  action: string;
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBlockedMessage?: boolean;
  hideOnBlocked?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  action,
  resource,
  children,
  fallback,
  showBlockedMessage = false,
  hideOnBlocked = false,
}) => {
  const { hasPermission, getBlockedReason } = useRBAC();
  const allowed = hasPermission(action, resource);
  const blockedReason = getBlockedReason(action, resource);

  if (allowed) {
    return <>{children}</>;
  }

  if (hideOnBlocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showBlockedMessage) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <Shield className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">Permission Denied</h3>
          <p className="text-sm text-muted-foreground">{blockedReason}</p>
        </CardContent>
      </Card>
    );
  }

  return null;
};

interface ProtectedButtonProps {
  action: string;
  resource: string;
  children: React.ReactNode;
  className?: string;
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  action,
  resource,
  children,
  className,
}) => {
  const { hasPermission, getBlockedReason } = useRBAC();
  const allowed = hasPermission(action, resource);
  const blockedReason = getBlockedReason(action, resource);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                disabled: true,
                className: `${child.props.className || ""} opacity-50 cursor-not-allowed`,
              });
            }
            return child;
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <Lock className="h-3 w-3" />
        <span>{blockedReason}</span>
      </TooltipContent>
    </Tooltip>
  );
};

interface RoleIndicatorProps {
  showIfAdmin?: boolean;
  showIfStaff?: boolean;
}

export const RoleIndicator: React.FC<RoleIndicatorProps> = ({
  showIfAdmin = true,
  showIfStaff = true,
}) => {
  const { isAdmin, isStaff, role } = useRBAC();

  if ((showIfAdmin && isAdmin()) || (showIfStaff && isStaff())) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isAdmin()
            ? "bg-accent/20 text-accent border border-accent/30"
            : "bg-primary/20 text-primary border border-primary/30"
        }`}
      >
        <Shield className="h-3 w-3" />
        {role?.charAt(0).toUpperCase() + role?.slice(1)}
      </span>
    );
  }

  return null;
};
