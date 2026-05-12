import { useMemo, useState } from "react";
import { useApplications, usePayments, useAIVerifications, useAddons } from "./useFirestore";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, subWeeks, differenceInMinutes } from "date-fns";
import { Application } from "@/types";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  status: "all" | "pending" | "approved" | "rejected";
  search: string;
}

export interface AIInsight {
  id: string;
  type: "positive" | "warning" | "info" | "critical";
  title: string;
  description: string;
  metric?: string;
}

export const useAnalyticsDashboard = () => {
  const { applications, loading: appsLoading } = useApplications();
  const { payments, loading: paymentsLoading } = usePayments();
  const { verifications, loading: verificationsLoading } = useAIVerifications();
  const { addons, loading: addonsLoading } = useAddons();

  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: { from: undefined, to: undefined },
    status: "all",
    search: "",
  });

  const loading = appsLoading || paymentsLoading || verificationsLoading || addonsLoading;

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Date filter
      if (filters.dateRange.from && filters.dateRange.to) {
        const appDate = new Date(app.createdAt);
        if (!isWithinInterval(appDate, { start: startOfDay(filters.dateRange.from), end: endOfDay(filters.dateRange.to) })) {
          return false;
        }
      }
      // Status filter
      if (filters.status !== "all" && app.status !== filters.status) return false;
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [applications, filters]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredApps.length;
    const approved = filteredApps.filter((a) => a.status === "approved").length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const avgOCR = verifications.length > 0
      ? Math.round((verifications.reduce((s, v) => s + v.overallConfidence, 0) / verifications.length) * 100)
      : 0;

    const totalRevenue = filteredApps.reduce((s, a) => s + (a.totalPrice || 0), 0);

    // Trends (compare last 7 days vs previous 7 days)
    const now = new Date();
    const thisWeek = applications.filter((a) => new Date(a.createdAt) >= subDays(now, 7));
    const lastWeek = applications.filter((a) => {
      const d = new Date(a.createdAt);
      return d >= subDays(now, 14) && d < subDays(now, 7);
    });

    const appsTrend = lastWeek.length > 0 ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100) : 0;

    const thisWeekApproved = thisWeek.filter((a) => a.status === "approved").length;
    const lastWeekApproved = lastWeek.filter((a) => a.status === "approved").length;
    const approvalTrend = lastWeekApproved > 0 ? Math.round(((thisWeekApproved - lastWeekApproved) / lastWeekApproved) * 100) : 0;

    const thisWeekRevenue = thisWeek.reduce((s, a) => s + (a.totalPrice || 0), 0);
    const lastWeekRevenue = lastWeek.reduce((s, a) => s + (a.totalPrice || 0), 0);
    const revenueTrend = lastWeekRevenue > 0 ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100) : 0;

    const addonRevenue = addons.reduce((s, a) => s + (a.cost || 0), 0);

    return {
      totalApplications: total,
      approvalRate,
      avgProcessingTime: "2.3 min",
      ocrAccuracy: avgOCR,
      totalRevenue: totalRevenue + addonRevenue,
      addonRevenue,
      trends: { apps: appsTrend, approval: approvalTrend, revenue: revenueTrend, ocr: 3 },
    };
  }, [filteredApps, verifications, applications, addons]);

  // Applications over time (last 14 days)
  const applicationsOverTime = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      const dayStr = format(date, "MMM dd");
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayApps = applications.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= dayStart && d <= dayEnd;
      });
      return {
        name: dayStr,
        total: dayApps.length,
        approved: dayApps.filter((a) => a.status === "approved").length,
        rejected: dayApps.filter((a) => a.status === "rejected").length,
        pending: dayApps.filter((a) => a.status === "pending").length,
      };
    });
    return days;
  }, [applications]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const pending = filteredApps.filter((a) => a.status === "pending").length;
    const approved = filteredApps.filter((a) => a.status === "approved").length;
    const rejected = filteredApps.filter((a) => a.status === "rejected").length;
    return [
      { name: "Approved", value: approved, color: "hsl(var(--success))" },
      { name: "Pending", value: pending, color: "hsl(var(--warning))" },
      { name: "Rejected", value: rejected, color: "hsl(var(--destructive))" },
    ];
  }, [filteredApps]);

  // OCR confidence distribution
  const ocrDistribution = useMemo(() => {
    const buckets = [
      { name: "0-50%", min: 0, max: 50, count: 0, color: "hsl(var(--destructive))" },
      { name: "51-70%", min: 51, max: 70, count: 0, color: "hsl(var(--warning))" },
      { name: "71-90%", min: 71, max: 90, count: 0, color: "hsl(var(--chart-1))" },
      { name: "91-100%", min: 91, max: 100, count: 0, color: "hsl(var(--success))" },
    ];
    verifications.forEach((v) => {
      const conf = v.overallConfidence * 100;
      for (const b of buckets) {
        if (conf >= b.min && conf <= b.max) { b.count++; break; }
      }
    });
    return buckets;
  }, [verifications]);

  // Addon Distribution by Type
  const addonDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    addons.forEach((a) => {
      const typeLabel = a.type.toUpperCase().replace("_", " ");
      types[typeLabel] = (types[typeLabel] || 0) + 1;
    });
    return Object.entries(types).map(([name, value], i) => ({
      name,
      value,
      color: `hsl(var(--chart-${(i % 5) + 1}))`,
    }));
  }, [addons]);

  // Addon Status Distribution
  const addonStatusDistribution = useMemo(() => {
    const statuses: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    addons.forEach((a) => {
      if (statuses[a.status] !== undefined) {
        statuses[a.status]++;
      }
    });
    return [
      { name: "Completed", value: statuses.completed, color: "hsl(var(--success))" },
      { name: "Confirmed", value: statuses.confirmed, color: "hsl(var(--primary))" },
      { name: "Pending", value: statuses.pending, color: "hsl(var(--warning))" },
      { name: "Cancelled", value: statuses.cancelled, color: "hsl(var(--destructive))" },
    ];
  }, [addons]);

  // Revenue trend (monthly) - combining apps and addons
  const combinedRevenueTrend = useMemo(() => {
    const months: Record<string, number> = {};
    
    // Add application revenue
    applications.forEach((a) => {
      const m = format(new Date(a.createdAt), "MMM yyyy");
      months[m] = (months[m] || 0) + (a.totalPrice || 0);
    });

    // Add addon revenue
    addons.forEach((a) => {
      const m = format(new Date(a.createdAt), "MMM yyyy");
      months[m] = (months[m] || 0) + (a.cost || 0);
    });

    return Object.entries(months)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-6)
      .map(([name, revenue]) => ({ name: name.split(" ")[0], revenue }));
  }, [applications, addons]);

  // AI Insights
  const insights = useMemo<AIInsight[]>(() => {
    const result: AIInsight[] = [];

    // Approval trend
    if (kpis.trends.approval > 0) {
      result.push({ id: "1", type: "positive", title: "Approval Rate Increasing", description: `Approval rate increased by ${kpis.trends.approval}% this week compared to last week.`, metric: `+${kpis.trends.approval}%` });
    } else if (kpis.trends.approval < 0) {
      result.push({ id: "1", type: "warning", title: "Approval Rate Declining", description: `Approval rate decreased by ${Math.abs(kpis.trends.approval)}% this week.`, metric: `${kpis.trends.approval}%` });
    }

    const lowOCR = verifications.filter((v) => v.overallConfidence < 0.7);
    if (lowOCR.length > 0) {
      const pct = Math.round((lowOCR.length / Math.max(verifications.length, 1)) * 100);
      result.push({ id: "2", type: "critical", title: "Low OCR Confidence Detected", description: `${pct}% of documents have OCR confidence below 70%, which correlates with higher rejection rates.`, metric: `${lowOCR.length} docs` });
    }

    // Pending applications threshold
    const pending = filteredApps.filter((a) => a.status === "pending");
    if (pending.length > 5) {
      result.push({ id: "3", type: "warning", title: "High Pending Queue", description: `${pending.length} applications are awaiting review. Consider prioritizing the queue.`, metric: `${pending.length} pending` });
    }

    // Weekend pattern
    const weekendApps = applications.filter((a) => { const d = new Date(a.createdAt).getDay(); return d === 0 || d === 6; });
    if (weekendApps.length > applications.length * 0.35) {
      result.push({ id: "4", type: "info", title: "Peak Weekend Activity", description: "Over 35% of applications are submitted on weekends. Consider allocating more weekend staff.", metric: `${Math.round((weekendApps.length / Math.max(applications.length, 1)) * 100)}%` });
    }

    // Revenue insight
    if (kpis.trends.revenue > 0) {
      result.push({ id: "5", type: "positive", title: "Revenue Growth", description: `Revenue increased by ${kpis.trends.revenue}% compared to last week.`, metric: `+${kpis.trends.revenue}%` });
    }

    // Addon specific insights
    if (addons.length > 0) {
      const completionRate = Math.round((addons.filter(a => a.status === 'completed').length / addons.length) * 100);
      if (completionRate > 80) {
        result.push({ id: "6", type: "positive", title: "Add-on Completion High", description: `${completionRate}% of add-on services are completed successfully.`, metric: `${completionRate}%` });
      } else if (completionRate < 50 && addons.length > 5) {
        result.push({ id: "6", type: "warning", title: "Add-on Bottleneck", description: `Only ${completionRate}% of add-on services are being completed. Check for service delays.`, metric: `${completionRate}%` });
      }
    }

    if (result.length === 0) {
      result.push({ id: "0", type: "info", title: "Collecting Data", description: "More data is needed to generate meaningful insights. Continue processing applications.", metric: "—" });
    }

    return result;
  }, [kpis, verifications, filteredApps, applications]);

  // Drill-down table data
  const tableData = useMemo(() => {
    return filteredApps.map((app) => {
      const verification = verifications.find((v) => v.applicationId === app.id);
      let conf: number | null = null;
      if (verification?.overallConfidence != null) {
        conf = Math.round(verification.overallConfidence * 100);
      } else if (app.ocrScore != null && app.ocrScore > 0) {
        conf = app.ocrScore <= 1 ? Math.round(app.ocrScore * 100) : Math.round(app.ocrScore);
      }

      return {
        ...app,
        ocrConfidence: conf,
      };
    });
  }, [filteredApps, verifications]);

  return {
    loading,
    kpis,
    applicationsOverTime,
    statusDistribution,
    ocrDistribution,
    revenueTrend: combinedRevenueTrend,
    addonDistribution,
    addonStatusDistribution,
    insights,
    tableData,
    filters,
    setFilters,
  };
};
