import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, TrendingUp, TrendingDown, Clock, Brain, DollarSign,
  Sparkles, AlertTriangle, CheckCircle, Info, Search, CalendarIcon,
  ChevronRight, ArrowUpRight, ArrowDownRight, Zap, ShieldAlert,
  BarChart3, PieChart as PieChartIcon, Activity, Package,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAnalyticsDashboard, AIInsight } from "@/hooks/useAnalyticsDashboard";

const insightIcons: Record<AIInsight["type"], React.ElementType> = {
  positive: CheckCircle,
  warning: AlertTriangle,
  critical: ShieldAlert,
  info: Info,
};

const insightColors: Record<AIInsight["type"], string> = {
  positive: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
  info: "text-primary",
};

const insightBgColors: Record<AIInsight["type"], string> = {
  positive: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  critical: "bg-destructive/10 border-destructive/20",
  info: "bg-primary/10 border-primary/20",
};

const Analytics = () => {
  const navigate = useNavigate();
  const {
    loading, kpis, applicationsOverTime, statusDistribution,
    ocrDistribution, revenueTrend, insights, tableData,
    addonDistribution, addonStatusDistribution,
    filters, setFilters,
  } = useAnalyticsDashboard();

  const chartTooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    boxShadow: "0 8px 32px -8px rgba(0,0,0,0.15)",
    fontSize: "12px",
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Analytics" subtitle="AI-Powered Business Intelligence" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="Analytics" subtitle="AI-Powered Business Intelligence" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl">
                <CalendarIcon className="h-4 w-4" />
                {filters.dateRange.from && filters.dateRange.to
                  ? `${format(filters.dateRange.from, "MMM dd")} – ${format(filters.dateRange.to, "MMM dd")}`
                  : "Select date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                onSelect={(range) => setFilters((f) => ({ ...f, dateRange: { from: range?.from, to: range?.to } }))}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}
          >
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon={FileText}
            title="Total Applications"
            value={kpis.totalApplications.toLocaleString()}
            trend={kpis.trends.apps}
            color="primary"
          />
          <KPICard
            icon={TrendingUp}
            title="Approval Rate"
            value={`${kpis.approvalRate}%`}
            trend={kpis.trends.approval}
            color="success"
          />
          <KPICard
            icon={Clock}
            title="Avg Processing"
            value={kpis.avgProcessingTime}
            trend={-5}
            invertTrend
            color="warning"
          />
          <KPICard
            icon={Brain}
            title="OCR Accuracy"
            value={`${kpis.ocrAccuracy}%`}
            trend={kpis.trends.ocr}
            color="accent"
          />
          <KPICard
            icon={DollarSign}
            title="Total Revenue"
            value={`RM${kpis.totalRevenue.toLocaleString()}`}
            trend={kpis.trends.revenue}
            color="primary"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Applications Over Time */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Applications Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={applicationsOverTime}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Date", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} allowDecimals={false} label={{ value: "Applications", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))", style: { textAnchor: "middle" } }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#totalGrad)" name="Total" />
                  <Area type="monotone" dataKey="approved" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#approvedGrad)" name="Approved" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Application Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-4">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OCR Confidence Distribution */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                OCR Confidence Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ocrDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Confidence Range", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} allowDecimals={false} label={{ value: "No. of Documents", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))", style: { textAnchor: "middle" } }} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [value, "Documents"]} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>
                    {ocrDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Revenue (RM)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))", style: { textAnchor: "middle" } }} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`RM${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Add-on Analytics Section */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Add-on Service Analytics</h3>
              <p className="text-sm text-muted-foreground">Performance and distribution of supplementary services</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add-on Service Distribution */}
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-accent" />
                  Service Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="60%" height={260}>
                    <PieChart>
                      <Pie
                        data={addonDistribution}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {addonDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {addonDistribution.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold">{item.value}</span>
                      </div>
                    ))}
                    {addonDistribution.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No data available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add-on Status Breakdown */}
            <Card className="rounded-2xl shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Service Fulfillment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={addonStatusDistribution} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800}>
                      {addonStatusDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Insights Panel */}
        <Card className="rounded-2xl shadow-md border-accent/20" style={{ backdropFilter: "blur(16px)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              AI-Powered Insights
              <Badge variant="secondary" className="ml-2 text-xs font-medium">Auto-generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((insight) => {
                const Icon = insightIcons[insight.type];
                return (
                  <div
                    key={insight.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
                      insightBgColors[insight.type]
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", insightColors[insight.type])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-foreground truncate">{insight.title}</h4>
                          {insight.metric && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">{insight.metric}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Drill-Down Data Table */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Application Details
              <Badge variant="secondary" className="ml-2 text-xs">{tableData.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Application ID</TableHead>
                    <TableHead className="text-xs font-semibold">Customer Name</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">OCR Confidence</TableHead>
                    <TableHead className="text-xs font-semibold">Amount</TableHead>
                    <TableHead className="text-xs font-semibold">Submitted</TableHead>
                    <TableHead className="text-xs font-semibold w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No applications found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableData.slice(0, 20).map((app) => (
                      <TableRow
                        key={app.id}
                        className="cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => navigate("/applications")}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {app.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium text-sm">{app.name}</TableCell>
                        <TableCell>
                          <StatusBadge variant={app.status}>{app.status}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          {app.ocrConfidence !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    app.ocrConfidence >= 90 ? "bg-success" :
                                    app.ocrConfidence >= 70 ? "bg-accent" :
                                    app.ocrConfidence >= 50 ? "bg-warning" : "bg-destructive"
                                  )}
                                  style={{ width: `${app.ocrConfidence}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-medium",
                                app.ocrConfidence < 70 && "text-destructive"
                              )}>
                                {app.ocrConfidence}%
                              </span>
                              {app.ocrConfidence < 70 && (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">RM{(app.totalPrice || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(app.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// KPI Card Component
interface KPICardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  trend: number;
  color: "primary" | "success" | "warning" | "accent";
  invertTrend?: boolean;
}

const colorMap = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  accent: { bg: "bg-accent/10", text: "text-accent" },
};

const KPICard = ({ icon: Icon, title, value, trend, color, invertTrend }: KPICardProps) => {
  const isPositive = invertTrend ? trend < 0 : trend > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const c = colorMap[color];

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2.5 rounded-xl", c.bg)}>
            <Icon className={cn("h-5 w-5", c.text)} />
          </div>
          {trend !== 0 && (
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full",
              isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
};

export default Analytics;
