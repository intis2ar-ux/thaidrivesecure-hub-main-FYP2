import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  className,
}: StatCardProps) => {
  return (
    <Card
      className={cn(
        "bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                {Math.abs(trend.value)}% from last period
              </p>
            )}
          </div>
          <div
            className={cn(
              "p-2.5 rounded-lg flex-shrink-0",
              iconBg || "bg-primary/8"
            )}
          >
            <Icon
              className={cn("h-5 w-5", iconColor || "text-primary")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
