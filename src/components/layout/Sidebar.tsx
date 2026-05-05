import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Brain,
  CreditCard,
  Package,
  BarChart3,
  FileBarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import tdsLogo from "@/assets/tds-memanjang-logo.png";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  section?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "Overview" },
  { title: "Applications", href: "/applications", icon: FileText, section: "Operations" },
  { title: "AI Verification", href: "/verification", icon: Brain, section: "Operations" },
  { title: "Payments", href: "/payments", icon: CreditCard, section: "Operations" },
  
  { title: "Add-ons", href: "/addons", icon: Package, section: "Operations" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, section: "Insights" },
  { title: "Reports", href: "/reports", icon: FileBarChart, section: "Insights" },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  // Group items by section
  const sections = filteredNavItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const section = item.section || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar transition-all duration-300 flex flex-col z-50",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="px-3 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <img
            src={tdsLogo}
            alt="ThaiDriveSecure"
            className={cn(
              "w-auto flex-shrink-0 transition-all duration-300",
              collapsed ? "h-7" : "h-9"
            )}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {Object.entries(sections).map(([sectionName, items]) => (
          <div key={sectionName}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {sectionName}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group relative",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary font-medium"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                      )}
                    />
                    {!collapsed && (
                      <span className="text-[13px] truncate">{item.title}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        {user?.role === "admin" && (
          <NavLink
            to="/settings"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150",
              location.pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              collapsed && "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="text-[13px]">Settings</span>}
          </NavLink>
        )}

        {!collapsed && user && (
          <NavLink
            to="/profile"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150",
              location.pathname === "/profile"
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <UserCircle className="h-4 w-4 flex-shrink-0" />
            <div className="overflow-hidden min-w-0">
              <p className="text-[13px] font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/40 capitalize">{user.role}</p>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <NavLink
            to="/profile"
            className={cn(
              "flex items-center justify-center p-2 rounded-lg transition-all duration-150",
              location.pathname === "/profile"
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/65 hover:text-sidebar-foreground"
            )}
          >
            <UserCircle className="h-4 w-4" />
          </NavLink>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-9",
            collapsed && "justify-center px-0"
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2.5 text-[13px]">Logout</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-card border border-border shadow-sm hover:bg-muted text-muted-foreground"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </Button>
    </aside>
  );
};
