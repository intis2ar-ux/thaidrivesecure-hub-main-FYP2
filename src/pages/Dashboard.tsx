import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Package,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useApplications, usePayments, useAnalytics } from "@/hooks/useFirestore";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/pricing";

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { applications, loading } = useApplications();
  const { payments } = usePayments();

  const { analytics, chartData } = useAnalytics();

  const pendingApps = applications.filter((a) => a.status === "pending" || a.status === "applied").length;
  const approvedApps = applications.filter((a) => a.status === "approved").length;
  const rejectedApps = applications.filter((a) => a.status === "rejected").length;

  const pendingPayments = payments.filter((p) =>
    p.status === "paid" &&
    (
      p.verificationStatus === "pending_verification" ||
      p.verificationStatus === "awaiting_cash_payment" ||
      p.verificationStatus === "collection_scheduled" ||
      p.verificationStatus === "cash_received"
    )
  ).length;
  const verifiedPayments = payments.filter((p) => p.verificationStatus === "verified").length;



  const recentApplications = applications.slice(0, 5);

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Dashboard" subtitle="Operational overview" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="Dashboard" subtitle="Operational overview" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Applications"
            value={applications.length}
            icon={FileText}
            iconColor="text-primary"
            iconBg="bg-primary/8"
            subtitle={`${pendingApps} pending review`}
          />
          <StatCard
            title="Approved"
            value={approvedApps}
            icon={CheckCircle}
            iconColor="text-success"
            iconBg="bg-success/8"
            subtitle={`${rejectedApps} rejected`}
          />
          <StatCard
            title="Payments Verified"
            value={verifiedPayments}
            icon={ShieldCheck}
            iconColor="text-accent"
            iconBg="bg-accent/8"
            subtitle={`${pendingPayments} awaiting verification`}
          />
          <StatCard
            title="Total Revenue"
            value={formatPrice(analytics.totalRevenue)}
            icon={DollarSign}
            iconColor="text-success"
            iconBg="bg-success/8"
          />
        </div>

        {/* Pipeline Progress */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Operations Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: "Applications",
                  subtitle: "Stage 1 — Review",
                  icon: FileText,
                  iconColor: "text-primary",
                  iconBg: "bg-primary/8",
                  stats: [
                    { icon: Clock, value: pendingApps, label: "Pending", color: "text-warning-foreground" },
                    { icon: CheckCircle, value: approvedApps, label: "Approved", color: "text-success" },
                  ],
                  href: "/applications",
                },
                {
                  label: "Payments",
                  subtitle: "Stage 2 — Verification",
                  icon: CreditCard,
                  iconColor: "text-accent",
                  iconBg: "bg-accent/8",
                  stats: [
                    { icon: Clock, value: pendingPayments, label: "Pending", color: "text-warning-foreground" },
                    { icon: ShieldCheck, value: verifiedPayments, label: "Verified", color: "text-success" },
                  ],
                  href: "/payments",
                },
                {
                  label: "Add-ons",
                  subtitle: "Stage 3 — Services",
                  icon: Package,
                  iconColor: "text-success",
                  iconBg: "bg-success/8",
                  stats: [
                    { icon: Clock, value: analytics.addonStatusDistribution.pending || 0, label: "Pending", color: "text-warning-foreground" },
                    { icon: Shield, value: analytics.addonStatusDistribution.confirmed || 0, label: "Confirmed", color: "text-success" },
                  ],
                  href: "/addons",
                },
              ].map((stage, idx) => (
                <div
                  key={stage.label}
                  className="relative p-4 rounded-lg border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-all duration-200 group"
                  onClick={() => navigate(stage.href)}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn("p-2 rounded-lg", stage.iconBg)}>
                      <stage.icon className={cn("h-4 w-4", stage.iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                      <p className="text-[10px] text-muted-foreground">{stage.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {stage.stats.map((stat) => (
                      <div key={stat.label} className="flex items-center gap-1.5">
                        <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                        <span className="text-sm font-semibold">{stat.value}</span>
                        <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                  {idx < 2 && (
                    <ArrowRight className="hidden lg:block absolute -right-[18px] top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Application Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData.applicationTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Day of Week", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "No. of Applications", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))", style: { textAnchor: "middle" } }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="approved" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: "Revenue (RM)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))", style: { textAnchor: "middle" } }} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatPrice(value), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 3, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentApplications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No applications yet</p>
                ) : (
                  recentApplications.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => navigate("/applications")}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{app.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{app.where}</p>
                        </div>
                      </div>
                      <StatusBadge variant={app.status}>{app.status}</StatusBadge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={chartData.paymentMethods} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {chartData.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {chartData.paymentMethods.map((method, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: method.color }} />
                    <span className="text-[11px] text-muted-foreground">{method.name} ({method.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
