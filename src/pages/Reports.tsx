import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileBarChart, Download, Calendar as CalendarIcon,
  Clock, Brain, XCircle, DollarSign, TrendingUp, AlertTriangle, FileText, Loader2,
} from "lucide-react";
import { useReports, useApplications, usePayments, useAIVerifications } from "@/hooks/useFirestore";
import { format, differenceInDays, startOfDay, endOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRBAC } from "@/hooks/useRBAC";
import { PermissionGate, ProtectedButton } from "@/components/common/PermissionGate";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const Reports = () => {
  const { toast } = useToast();
  const { isAdmin, hasPermission } = useRBAC();
  const { reports, loading: reportsLoading } = useReports();
  const { applications, loading: appsLoading } = useApplications();
  const { payments, loading: paymentsLoading } = usePayments();
  const { verifications, loading: verificationsLoading } = useAIVerifications();

  const [reportType, setReportType] = useState<string>("processing_time");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined, to: undefined,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const loading = reportsLoading || appsLoading || paymentsLoading || verificationsLoading;

  const isWithinDateRange = (dateStr: string | Date | number) => {
    if (!dateRange.from || !dateRange.to) return true;
    const date = new Date(dateStr);
    return date >= startOfDay(dateRange.from) && date <= endOfDay(dateRange.to);
  };

  const filteredApps = useMemo(() => applications.filter(a => isWithinDateRange(a.createdAt)), [applications, dateRange]);
  const filteredPayments = useMemo(() => payments.filter(p => isWithinDateRange(p.createdAt)), [payments, dateRange]);
  const filteredVerifications = useMemo(() => verifications.filter(v => isWithinDateRange(v.timestamp)), [verifications, dateRange]);

  // --- Computed report data (unchanged logic) ---
  const processingTimeData = useMemo(() => {
    const completedApps = filteredApps.filter(app => app.status === "approved");
    const avgDays = completedApps.length > 0
      ? completedApps.reduce((sum, app) => sum + differenceInDays(new Date(), app.createdAt), 0) / completedApps.length
      : 0;
    const pendingApps = filteredApps.filter(a => a.status === "pending");
    const rejectedApps = filteredApps.filter(a => a.status === "rejected");
    const avgPendingDays = pendingApps.length > 0
      ? pendingApps.reduce((sum, a) => sum + differenceInDays(new Date(), a.createdAt), 0) / pendingApps.length : 0;
    const avgRejectedDays = rejectedApps.length > 0
      ? rejectedApps.reduce((sum, a) => sum + differenceInDays(new Date(), a.createdAt), 0) / rejectedApps.length : 0;
    const byStatus = [
      { status: "Pending", count: pendingApps.length, avgDays: Number(avgPendingDays.toFixed(1)) },
      { status: "Approved", count: completedApps.length, avgDays: Number(avgDays.toFixed(1)) },
      { status: "Rejected", count: rejectedApps.length, avgDays: Number(avgRejectedDays.toFixed(1)) },
    ];
    return { averageDays: avgDays.toFixed(1), byStatus, total: filteredApps.length };
  }, [filteredApps]);

  const aiMetricsData = useMemo(() => {
    const total = filteredVerifications.length;
    const autoVerified = filteredVerifications.filter(v => v.overallConfidence >= 0.85 && v.verifiedByAI).length;
    const manualReview = filteredVerifications.filter(v => v.overallConfidence >= 0.7 && v.overallConfidence < 0.85).length;
    const flagged = filteredVerifications.filter(v => v.overallConfidence < 0.7).length;
    const overridden = filteredVerifications.filter(v => v.reviewedByStaff && !v.verifiedByAI).length;
    const avgConfidence = total > 0 ? filteredVerifications.reduce((sum, v) => sum + v.overallConfidence, 0) / total : 0;
    return {
      total, autoVerified,
      autoVerificationRate: total > 0 ? ((autoVerified / total) * 100).toFixed(1) : 0,
      manualReview, flagged, overridden,
      overrideRate: total > 0 ? ((overridden / total) * 100).toFixed(1) : 0,
      avgConfidence: (avgConfidence * 100).toFixed(1),
    };
  }, [filteredVerifications]);

  const rejectionData = useMemo(() => {
    const rejectedApps = filteredApps.filter(a => a.status === "rejected");
    const total = rejectedApps.length;
    if (total === 0) return [];
    const reasons: Record<string, number> = {};
    rejectedApps.forEach(() => {
      const reason = "Application Rejected";
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    return Object.entries(reasons).map(([reason, count]) => ({
      reason, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [filteredApps]);

  const revenueData = useMemo(() => {
    const paidPayments = filteredPayments.filter(p => p.status === "paid");
    const byMethod: Record<string, { revenue: number; count: number }> = {};
    paidPayments.forEach(p => {
      const method = p.method || "Other";
      if (!byMethod[method]) byMethod[method] = { revenue: 0, count: 0 };
      byMethod[method].revenue += p.amount;
      byMethod[method].count += 1;
    });
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];
    return Object.entries(byMethod).map(([method, data], i) => ({
      service: method.charAt(0).toUpperCase() + method.slice(1),
      revenue: data.revenue, count: data.count, color: colors[i % colors.length],
    }));
  }, [filteredPayments]);

  const queueData = useMemo(() => {
    const paidApps = filteredPayments.filter(p => p.status === "paid");
    const unpaidApps = filteredPayments.filter(p => p.status !== "paid");
    const paidAvgWait = paidApps.length > 0
      ? paidApps.reduce((sum, p) => sum + differenceInDays(new Date(), p.createdAt), 0) / paidApps.length : 0;
    const unpaidAvgWait = unpaidApps.length > 0
      ? unpaidApps.reduce((sum, p) => sum + differenceInDays(new Date(), p.createdAt), 0) / unpaidApps.length : 0;
    return {
      priority: paidApps.length, delayed: unpaidApps.length,
      priorityAvgWait: Number(paidAvgWait.toFixed(1)), delayedAvgWait: Number(unpaidAvgWait.toFixed(1)),
    };
  }, [filteredPayments]);

  // --- Actions ---
  const handleGenerateReport = async (rangeType: "weekly" | "monthly" | "all" | "custom") => {
    if (!hasPermission("generate", "reports")) {
      toast({ title: "Permission Denied", description: "Only administrators can generate reports.", variant: "destructive" });
      return;
    }

    const today = new Date();
    if (rangeType === "weekly") {
      setDateRange({ from: subDays(today, 7), to: today });
    } else if (rangeType === "monthly") {
      setDateRange({ from: subDays(today, 30), to: today });
    } else if (rangeType === "all") {
      setDateRange({ from: undefined, to: undefined });
    }

    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
    toast({ title: "Report Generated", description: `Your ${rangeType} report has been generated and is ready for download.` });
  };

  const getReportData = (type: string = reportType) => {
    switch (type) {
      case "processing_time":
        return { title: "Application Processing Time Report", headers: ["Status", "Count", "Avg Days"],
          rows: processingTimeData.byStatus.map(i => [i.status, i.count.toString(), i.avgDays.toString()]),
          summary: `Average Days to Complete: ${processingTimeData.averageDays}` };
      case "ai_accuracy":
        return { title: "AI Verification Accuracy Report", headers: ["Metric", "Value"],
          rows: [["Total Verifications", aiMetricsData.total.toString()], ["Auto-Verification Rate", `${aiMetricsData.autoVerificationRate}%`],
            ["Human Override Rate", `${aiMetricsData.overrideRate}%`], ["Average Confidence", `${aiMetricsData.avgConfidence}%`],
            ["Auto-Verified", aiMetricsData.autoVerified.toString()], ["Manual Review", aiMetricsData.manualReview.toString()],
            ["Flagged", aiMetricsData.flagged.toString()]],
          summary: `Total verifications processed: ${aiMetricsData.total}` };
      case "rejections":
        return { title: "Rejections by Reason Report", headers: ["Reason", "Count", "Percentage"],
          rows: rejectionData.map(i => [i.reason, i.count.toString(), `${i.percentage}%`]),
          summary: `Total rejections analyzed: ${rejectionData.reduce((s, r) => s + r.count, 0)}` };
      case "revenue":
        return { title: "Revenue by Service Type Report", headers: ["Service", "Count", "Revenue (RM)", "Percentage"],
          rows: revenueData.map(i => { const t = revenueData.reduce((s, r) => s + r.revenue, 0);
            return [i.service, i.count.toString(), `RM${i.revenue.toLocaleString()}`, `${t > 0 ? ((i.revenue/t)*100).toFixed(1) : "0"}%`]; }),
          summary: `Total Revenue: RM${revenueData.reduce((s, r) => s + r.revenue, 0).toLocaleString()}` };
      case "queue":
        return { title: "Queue Priority Performance Report", headers: ["Queue Type", "Count", "Avg Wait (Days)"],
          rows: [["Priority Queue (Paid)", queueData.priority.toString(), queueData.priorityAvgWait.toString()],
            ["Delayed Queue (Cash/Unpaid)", queueData.delayed.toString(), queueData.delayedAvgWait.toString()]],
          summary: `Priority queue is ${((queueData.delayedAvgWait / queueData.priorityAvgWait - 1) * 100).toFixed(0)}% faster` };
      default: return { title: "Report", headers: [], rows: [], summary: "" };
    }
  };

  const downloadCSV = () => {
    const data = getReportData();
    const csvContent = [data.title, "", data.headers.join(","), ...data.rows.map(r => r.join(",")), "", data.summary, "", `Generated: ${format(new Date(), "PPpp")}`].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url;
    link.download = `${reportType}_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const data = getReportData();
    const printContent = `<!DOCTYPE html><html><head><title>${data.title}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{color:#1a1a1a;border-bottom:2px solid #1B3B6F;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:12px;text-align:left}th{background-color:#1B3B6F;color:white}tr:nth-child(even){background-color:#f9f9f9}.summary{background:#E6F3F9;padding:15px;border-radius:8px;margin:20px 0}.footer{margin-top:30px;color:#666;font-size:12px}</style></head><body><h1>${data.title}</h1><p>ThaiDriveSecure Dashboard</p><table><thead><tr>${data.headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${data.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table><div class="summary"><strong>Summary:</strong> ${data.summary}</div><div class="footer">Generated on ${format(new Date(),"PPpp")}</div></body></html>`;
    const w = window.open("","_blank");
    if(w){w.document.write(printContent);w.document.close();w.onload=()=>{w.print()}}
  };

  const handleDownloadAll = (formatType: "pdf" | "csv") => {
    if (!hasPermission("download", "reports")) {
      toast({ title: "Permission Denied", description: "Only administrators can download reports.", variant: "destructive" }); return;
    }
    const types = ["processing_time", "ai_accuracy", "rejections", "revenue", "queue"];
    const allData = types.map(t => getReportData(t));
    
    if (formatType === "csv") {
      let csvContent = "";
      allData.forEach(data => {
          csvContent += [data.title, "", data.headers.join(","), ...data.rows.map(r => r.join(",")), "", data.summary, "", ""].join("\n");
      });
      csvContent += `Generated: ${format(new Date(), "PPpp")}`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url;
      link.download = `comprehensive_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } else {
      let tablesHtml = allData.map(data => `
        <h2>${data.title}</h2>
        <table>
          <thead><tr>${data.headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${data.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
        <div class="summary"><strong>Summary:</strong> ${data.summary}</div>
        <br/>
      `).join("");

      const printContent = `<!DOCTYPE html><html><head><title>Comprehensive Operational Report</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1,h2{color:#1a1a1a;border-bottom:2px solid #1B3B6F;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:12px;text-align:left}th{background-color:#1B3B6F;color:white}tr:nth-child(even){background-color:#f9f9f9}.summary{background:#E6F3F9;padding:15px;border-radius:8px;margin:20px 0}.footer{margin-top:30px;color:#666;font-size:12px}</style></head><body><h1>Comprehensive Operational Report</h1><p>ThaiDriveSecure Dashboard</p>${tablesHtml}<div class="footer">Generated on ${format(new Date(),"PPpp")}</div></body></html>`;
      const w = window.open("","_blank");
      if(w){w.document.write(printContent);w.document.close();w.onload=()=>{w.print()}}
    }
    toast({ title: "Download Complete", description: `Comprehensive ${formatType.toUpperCase()} report has been generated.` });
  };

  const handleDownload = (reportId: string, formatType: "pdf"|"csv") => {
    if (!hasPermission("download", "reports")) {
      toast({ title: "Permission Denied", description: "Only administrators can download reports.", variant: "destructive" }); return;
    }
    try { formatType === "csv" ? downloadCSV() : downloadPDF();
      toast({ title: "Download Complete", description: `${formatType.toUpperCase()} report has been generated.` });
    } catch { toast({ title: "Download Failed", description: "There was an error generating the report.", variant: "destructive" }); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Reports" subtitle="Generate and analyze operational reports" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Reports"
        subtitle="Generate and analyze operational reports"
        actions={
          <div className="flex items-center gap-2">
            <ProtectedButton action="download" resource="reports">
              <Button variant="outline" size="sm" className="h-9" onClick={() => handleDownload("current", "csv")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
              </Button>
            </ProtectedButton>
            <ProtectedButton action="download" resource="reports">
              <Button variant="outline" size="sm" className="h-9" onClick={() => handleDownload("current", "pdf")}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
              </Button>
            </ProtectedButton>
          </div>
        }
      />

      <PermissionGate
        action="view"
        resource="reports"
        showBlockedMessage
        fallback={
          <div className="p-6">
            <Card><CardContent className="p-12 text-center">
              <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
              <p className="text-sm text-muted-foreground">Only administrators can access detailed reports.</p>
            </CardContent></Card>
          </div>
        }
      >
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Applications" value={processingTimeData.total} icon={FileBarChart} iconBg="bg-primary/10" iconColor="text-primary" />
            <StatCard title="Avg. Processing" value={`${processingTimeData.averageDays}d`} icon={Clock} iconBg="bg-accent/10" iconColor="text-accent" />
            <StatCard title="AI Confidence" value={`${aiMetricsData.avgConfidence}%`} icon={Brain} iconBg="bg-success/10" iconColor="text-success" />
            <StatCard title="Total Revenue" value={`RM${revenueData.reduce((s, r) => s + r.revenue, 0).toLocaleString()}`} icon={DollarSign} iconBg="bg-warning/10" iconColor="text-warning" />
          </div>

          {/* Generate Report Controls */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-64 h-9 bg-background">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing_time">Application Processing Time</SelectItem>
                    <SelectItem value="ai_accuracy">AI Verification Accuracy</SelectItem>
                    <SelectItem value="rejections">Rejections by Reason</SelectItem>
                    <SelectItem value="revenue">Revenue by Service</SelectItem>
                    <SelectItem value="queue">Queue Priority Performance</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-64 h-9 justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} – {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : "Pick a date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} />
                  </PopoverContent>
                </Popover>
                <ProtectedButton action="generate" resource="reports">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-9" disabled={isGenerating}>
                        {isGenerating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</> : <><FileBarChart className="h-3.5 w-3.5 mr-1.5" /> Generate Report</>}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleGenerateReport("weekly")}>
                        Weekly Report (Last 7 Days)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGenerateReport("monthly")}>
                        Monthly Report (Last 30 Days)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGenerateReport("all")}>
                        All Time Report
                      </DropdownMenuItem>
                      {dateRange.from && dateRange.to && (
                        <DropdownMenuItem onClick={() => handleGenerateReport("custom")}>
                          Custom Date Range Report
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ProtectedButton>
              </div>
            </CardContent>
          </Card>

          {/* Report Tabs */}
          <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList className="grid w-fit grid-cols-5 gap-1 h-auto p-1">
                <TabsTrigger value="processing_time" className="text-xs gap-1.5 px-3 py-2">
                  <Clock className="h-3.5 w-3.5" /> Processing
                </TabsTrigger>
                <TabsTrigger value="ai_accuracy" className="text-xs gap-1.5 px-3 py-2">
                  <Brain className="h-3.5 w-3.5" /> AI Accuracy
                </TabsTrigger>
                <TabsTrigger value="rejections" className="text-xs gap-1.5 px-3 py-2">
                  <XCircle className="h-3.5 w-3.5" /> Rejections
                </TabsTrigger>
                <TabsTrigger value="revenue" className="text-xs gap-1.5 px-3 py-2">
                  <DollarSign className="h-3.5 w-3.5" /> Revenue
                </TabsTrigger>
                <TabsTrigger value="queue" className="text-xs gap-1.5 px-3 py-2">
                  <TrendingUp className="h-3.5 w-3.5" /> Queue
                </TabsTrigger>
              </TabsList>
              
              <ProtectedButton action="download" resource="reports">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-colors">
                      <Download className="h-4 w-4 mr-2" /> Comprehensive Report
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownloadAll("pdf")}>
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" /> Download as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadAll("csv")}>
                      <FileBarChart className="h-4 w-4 mr-2 text-muted-foreground" /> Download as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ProtectedButton>
            </div>

            {/* Processing Time */}
            <TabsContent value="processing_time">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2 border border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Processing Time by Status</CardTitle>
                    <CardDescription className="text-xs">Average days spent in each status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={processingTimeData.byStatus}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="status" className="text-xs" label={{ value: "Status", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis label={{ value: "Count / Days", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))", style: { textAnchor: "middle" } }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" name="Applications" radius={[4,4,0,0]} />
                        <Bar dataKey="avgDays" fill="hsl(var(--accent))" name="Avg Days" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/8 text-center">
                      <p className="text-3xl font-bold text-primary">{processingTimeData.averageDays}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg. Days to Complete</p>
                    </div>
                    <Separator />
                    {processingTimeData.byStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{item.status}</span>
                        <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Accuracy */}
            <TabsContent value="ai_accuracy">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Verifications" value={aiMetricsData.total} icon={Brain} iconBg="bg-primary/10" iconColor="text-primary" />
                <StatCard title="Auto-Verification" value={`${aiMetricsData.autoVerificationRate}%`} icon={TrendingUp} iconBg="bg-success/10" iconColor="text-success" />
                <StatCard title="Human Override" value={`${aiMetricsData.overrideRate}%`} icon={AlertTriangle} iconBg="bg-warning/10" iconColor="text-warning" />
                <StatCard title="Avg. Confidence" value={`${aiMetricsData.avgConfidence}%`} icon={Brain} iconBg="bg-accent/10" iconColor="text-accent" />
              </div>
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Verification Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-success/8 border border-success/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-success" />
                        <span className="text-sm font-medium">Auto-Verified</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{aiMetricsData.autoVerified}</p>
                      <p className="text-xs text-muted-foreground">≥85% confidence</p>
                    </div>
                    <div className="p-4 rounded-xl bg-warning/8 border border-warning/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                        <span className="text-sm font-medium">Manual Review</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{aiMetricsData.manualReview}</p>
                      <p className="text-xs text-muted-foreground">70-84% confidence</p>
                    </div>
                    <div className="p-4 rounded-xl bg-destructive/8 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                        <span className="text-sm font-medium">Flagged</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{aiMetricsData.flagged}</p>
                      <p className="text-xs text-muted-foreground">&lt;70% confidence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rejections */}
            <TabsContent value="rejections">
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Rejections by Reason</CardTitle>
                  <CardDescription className="text-xs">Analysis of application rejection reasons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={rejectionData} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={100} label>
                            {rejectionData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                            ))}
                          </Pie>
                          <Tooltip /><Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      {rejectionData.map((item) => (
                        <div key={item.reason} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.reason}</span>
                            <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue */}
            <TabsContent value="revenue">
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Revenue by Service Type</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 border-b border-border">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Count</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Revenue (RM)</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueData.map((item) => {
                        const total = revenueData.reduce((sum, r) => sum + r.revenue, 0);
                        const percentage = total > 0 ? ((item.revenue / total) * 100).toFixed(1) : 0;
                        return (
                          <TableRow key={item.service} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                            <TableCell className="text-sm font-medium">{item.service}</TableCell>
                            <TableCell className="text-sm text-right">{item.count}</TableCell>
                            <TableCell className="text-sm text-right font-semibold">RM{item.revenue.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-right text-muted-foreground">{percentage}%</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell className="text-sm">Total</TableCell>
                        <TableCell className="text-sm text-right">{revenueData.reduce((s, r) => s + r.count, 0)}</TableCell>
                        <TableCell className="text-sm text-right">RM{revenueData.reduce((s, r) => s + r.revenue, 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right">100%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Queue */}
            <TabsContent value="queue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Queue Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-4 rounded-xl bg-success/8 border border-success/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-success">Priority Queue</p>
                        <p className="text-xs text-muted-foreground">Paid applications</p>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{queueData.priority}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-warning/8 border border-warning/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-warning">Delayed Queue</p>
                        <p className="text-xs text-muted-foreground">Cash/unpaid applications</p>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{queueData.delayed}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Average Wait Times</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Priority Queue</span>
                        <span className="text-sm font-semibold text-success">{queueData.priorityAvgWait} days</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Delayed Queue</span>
                        <span className="text-sm font-semibold text-warning">{queueData.delayedAvgWait} days</span>
                      </div>
                      <Progress value={70} className="h-2" />
                    </div>
                    <Separator />
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-warning" />
                        Priority queue is {((queueData.delayedAvgWait / queueData.priorityAvgWait - 1) * 100).toFixed(0)}% faster than delayed queue
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PermissionGate>
    </DashboardLayout>
  );
};

export default Reports;
