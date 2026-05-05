import { useState } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Package, Shield, FileText, Truck, Smartphone, Search,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Clock, CheckCircle2, Loader2,
} from "lucide-react";
import { useAddons, useApplications } from "@/hooks/useFirestore";
import { AddonType } from "@/types";

const ITEMS_PER_PAGE = 10;

const Addons = () => {
  const { addons, loading } = useAddons();
  const { applications } = useApplications();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("desc");

  const filteredAddons = addons
    .filter((addon) => typeFilter === "all" || addon.type === typeFilter)
    .filter((addon) => {
      if (!searchQuery) return true;
      const app = getApplication(addon.applicationId);
      const q = searchQuery.toLowerCase();
      return (
        app?.name?.toLowerCase().includes(q) ||
        app?.phone?.toLowerCase().includes(q) ||
        addon.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortOrder) return 0;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : prev === "asc" ? null : "desc"));
    setCurrentPage(1);
  };

  const getSortIcon = () => {
    if (sortOrder === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
    if (sortOrder === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
    return <ArrowUpDown className="h-3.5 w-3.5" />;
  };

  const totalPages = Math.ceil(filteredAddons.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAddons = filteredAddons.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function getApplication(appId: string) {
    const orderId = appId.includes("_addon_") ? appId.split("_addon_")[0] : appId;
    return applications.find((a) => a.id === orderId);
  }

  const getAddonIcon = (type: AddonType) => {
    switch (type) {
      case "insurance": return <Shield className="h-4 w-4" />;
      case "tdac": return <FileText className="h-4 w-4" />;
      case "towing": return <Truck className="h-4 w-4" />;
      case "sim_card": return <Smartphone className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const addonStats = {
    total: addons.length,
    pending: addons.filter((a) => a.status === "pending").length,
    confirmed: addons.filter((a) => a.status === "confirmed").length,
    completed: addons.filter((a) => a.status === "completed").length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Add-ons" subtitle="Manage addon services and vendor integrations" />
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
      <Header title="Add-ons" subtitle="Manage addon services and vendor integrations" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Add-ons" value={addonStats.total} icon={Package} iconBg="bg-primary/10" iconColor="text-primary" />
          <StatCard title="Pending" value={addonStats.pending} icon={Clock} iconBg="bg-warning/10" iconColor="text-warning" />
          <StatCard title="Confirmed" value={addonStats.confirmed} icon={Loader2} iconBg="bg-accent/10" iconColor="text-accent" />
          <StatCard title="Completed" value={addonStats.completed} icon={CheckCircle2} iconBg="bg-success/10" iconColor="text-success" />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 bg-background"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-40 h-9 bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="tdac">TDAC</SelectItem>
              <SelectItem value="towing">Towing</SelectItem>
              <SelectItem value="sim_card">SIM Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0">
            {filteredAddons.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No add-ons found"
                description="Add-on records linked to applications will appear here."
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Applicant</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</TableHead>
                      <TableHead
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                        onClick={toggleSortOrder}
                      >
                        <div className="flex items-center gap-1">
                          Created At
                          {getSortIcon()}
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAddons.map((addon) => {
                      const app = getApplication(addon.applicationId);
                      return (
                        <TableRow key={addon.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                          <TableCell>
                            <p className="text-sm font-medium text-foreground">{app?.name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{app?.phone || ""}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              {getAddonIcon(addon.type)}
                              <span className="capitalize">{addon.type.replace("_", " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{app?.vehicleType ? app.vehicleType.replace("_", " ") : "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {addon.createdAt ? format(addon.createdAt, "dd MMM yyyy, HH:mm") : "-"}
                          </TableCell>
                          <TableCell><StatusBadge variant={addon.status}>{addon.status}</StatusBadge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredAddons.length)} of {filteredAddons.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>
                          {page}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Addons;
