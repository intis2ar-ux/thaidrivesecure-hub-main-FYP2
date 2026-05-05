import { useMemo } from "react";
import { Clock, CheckCircle2, XCircle, Timer } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Application } from "@/types";
import { isToday } from "date-fns";

interface ApplicationsKpiStripProps {
  applications: Application[];
}

export const ApplicationsKpiStrip = ({ applications }: ApplicationsKpiStripProps) => {
  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending" || a.status === "applied").length;
    const approvedToday = applications.filter(
      (a) => a.status === "approved" && a.statusUpdatedAt && isToday(a.statusUpdatedAt),
    ).length;
    const rejectedToday = applications.filter(
      (a) => a.status === "rejected" && a.statusUpdatedAt && isToday(a.statusUpdatedAt),
    ).length;

    // Avg processing time: createdAt → now for non-pending orders (rough proxy)
    const processed = applications.filter(
      (a) => a.status !== "pending" && a.createdAt,
    );
    let avgHours = 0;
    if (processed.length > 0) {
      const now = Date.now();
      const totalMs = processed.reduce(
        (sum, a) => sum + Math.max(0, now - a.createdAt.getTime()),
        0,
      );
      avgHours = totalMs / processed.length / (1000 * 60 * 60);
    }
    const avgLabel =
      avgHours < 1
        ? `${Math.round(avgHours * 60)}m`
        : avgHours < 24
        ? `${avgHours.toFixed(1)}h`
        : `${(avgHours / 24).toFixed(1)}d`;

    return { pending, approvedToday, rejectedToday, avgLabel };
  }, [applications]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Pending"
        value={stats.pending}
        subtitle="Awaiting review"
        icon={Clock}
        iconColor="text-warning"
        iconBg="bg-warning/10"
      />
      <StatCard
        title="Approved Today"
        value={stats.approvedToday}
        subtitle="Sent to payments"
        icon={CheckCircle2}
        iconColor="text-success"
        iconBg="bg-success/10"
      />
      <StatCard
        title="Rejected Today"
        value={stats.rejectedToday}
        subtitle="Declined applications"
        icon={XCircle}
        iconColor="text-destructive"
        iconBg="bg-destructive/10"
      />
      <StatCard
        title="Avg Processing"
        value={stats.avgLabel}
        subtitle="Across all orders"
        icon={Timer}
        iconColor="text-accent"
        iconBg="bg-accent/10"
      />
    </div>
  );
};
