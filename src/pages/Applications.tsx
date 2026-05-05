import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Search,
  Filter,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  AlertTriangle,
  CheckCircle,
  FileText as FileTextIcon,
  Trash2,
  Pencil,
  Check,
  X,
  Truck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationDetailPanel } from "@/components/applications/ApplicationDetailPanel";
import { EditOrderModal, EditOrderFormValues } from "@/components/applications/EditOrderModal";
import { ApplicationsKpiStrip } from "@/components/applications/ApplicationsKpiStrip";
import { useApplications } from "@/hooks/useFirestore";
import { useDebounce } from "@/hooks/useDebounce";
import { Application, ApplicationStatus } from "@/types";
import { format } from "date-fns";
import { formatPrice } from "@/lib/pricing";

const ITEMS_PER_PAGE = 10;

type SortKey = "createdAt" | "name" | "travel" | "totalPrice";
type SortDir = "asc" | "desc";

const Applications = () => {
  const { applications, loading, updateApplicationStatus, updateApplicationFields, deleteApplication } = useApplications();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL-driven state
  const statusFilter = searchParams.get("status") || "all";
  const urlSearch = searchParams.get("q") || "";
  const sortKey = (searchParams.get("sort") as SortKey) || "createdAt";
  const sortDir = (searchParams.get("dir") as SortDir) || "desc";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 250);

  // Sync debounced search → URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("q", debouncedSearch);
    else next.delete("q");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>("pending");
  const [statusNotes, setStatusNotes] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingApp, setDeletingApp] = useState<Application | null>(null);
  const [editingFieldsApp, setEditingFieldsApp] = useState<Application | null>(null);
  const [isEditFieldsOpen, setIsEditFieldsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<null | "approve" | "reject" | "delete">(null);
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const handleUpdateStatus = async () => {
    if (!editingApp) return;
    try {
      await updateApplicationStatus(editingApp.id, newStatus, {
        previousStatus: editingApp.status,
        notes: statusNotes,
        performedBy: user?.name || user?.email || "Unknown",
      });
      toast({
        title: "Status Updated",
        description: `Order ${editingApp.orderId} set to ${newStatus}.`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
    setIsEditOpen(false);
    setIsConfirmOpen(false);
    setEditingApp(null);
    setStatusNotes("");
  };

  const handleSelectStatus = () => {
    if (newStatus === "approved" || newStatus === "rejected") {
      setIsEditOpen(false);
      setIsConfirmOpen(true);
    } else {
      handleUpdateStatus();
    }
  };

  const openEditDialog = (app: Application, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingApp(app);
    setNewStatus(app.status);
    setIsEditOpen(true);
  };

  const openDetailPanel = (app: Application) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const openDeleteDialog = (app: Application, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingApp(app);
    setIsDeleteOpen(true);
  };

  const handleDeleteApplication = async () => {
    if (!deletingApp) return;
    try {
      await deleteApplication(deletingApp.id);
      toast({
        title: "Application Deleted",
        description: `Order ${deletingApp.orderId} has been deleted.`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to delete application.", variant: "destructive" });
    }
    setIsDeleteOpen(false);
    setDeletingApp(null);
  };

  const openEditFieldsDialog = (app: Application, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFieldsApp(app);
    setIsEditFieldsOpen(true);
  };

  const handleSaveEditFields = async (values: EditOrderFormValues) => {
    if (!editingFieldsApp) return;
    try {
      await updateApplicationFields(
        editingFieldsApp.id,
        values,
        user?.name || user?.email || "Unknown",
      );
      toast({
        title: "Order Updated",
        description: `Order ${editingFieldsApp.orderId} has been updated.`,
      });
      setEditingFieldsApp(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
      throw new Error("save failed");
    }
  };

  // Quick approve/reject for pending rows
  const quickStatusChange = async (
    app: Application,
    target: "approved" | "rejected",
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    try {
      await updateApplicationStatus(app.id, target, {
        previousStatus: app.status,
        notes: `Quick ${target} from list view`,
        performedBy: user?.name || user?.email || "Unknown",
      });
      toast({
        title: target === "approved" ? "Approved" : "Rejected",
        description: `Order ${app.orderId} set to ${target}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const filteredApplications = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    return applications
      .filter((app) => {
        const matchesSearch =
          !term ||
          app.name.toLowerCase().includes(term) ||
          app.orderId.toLowerCase().includes(term) ||
          app.phone.includes(term) ||
          (app.userId || "").toLowerCase().includes(term) ||
          (app.vehicleType || "").toLowerCase().includes(term) ||
          (app.where || "").toLowerCase().includes(term);
        const matchesStatus = statusFilter === "all" || app.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "name":
            return a.name.localeCompare(b.name) * dir;
          case "totalPrice":
            return ((a.totalPrice || 0) - (b.totalPrice || 0)) * dir;
          case "travel": {
            const ta = a.travel?.departDate?.getTime() ?? 0;
            const tb = b.travel?.departDate?.getTime() ?? 0;
            return (ta - tb) * dir;
          }
          case "createdAt":
          default: {
            const ca = a.createdAt?.getTime() ?? 0;
            const cb = b.createdAt?.getTime() ?? 0;
            return (ca - cb) * dir;
          }
        }
      });
  }, [applications, debouncedSearch, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      const next = new URLSearchParams(searchParams);
      next.set("sort", key);
      next.set("dir", "desc");
      setSearchParams(next, { replace: true });
    } else {
      const newDir = sortDir === "desc" ? "asc" : "desc";
      const next = new URLSearchParams(searchParams);
      next.set("sort", key);
      next.set("dir", newDir);
      setSearchParams(next, { replace: true });
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDir === "desc" ? (
      <ArrowDown className="h-3.5 w-3.5" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5" />
    );
  };

  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedApplications = filteredApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sortKey, sortDir]);

  // Bulk selection helpers
  const visibleSelectedCount = paginatedApplications.filter((a) =>
    selectedIds.has(a.id),
  ).length;
  const allVisibleSelected =
    paginatedApplications.length > 0 &&
    visibleSelectedCount === paginatedApplications.length;

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedApplications.forEach((a) => {
        if (checked) next.add(a.id);
        else next.delete(a.id);
      });
      return next;
    });
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedApplications = useMemo(
    () => applications.filter((a) => selectedIds.has(a.id)),
    [applications, selectedIds],
  );

  const performBulkAction = async () => {
    if (!bulkAction || selectedApplications.length === 0) return;
    setBulkProcessing(true);
    const performedBy = user?.name || user?.email || "Unknown";
    let success = 0;
    let failed = 0;

    for (const app of selectedApplications) {
      try {
        if (bulkAction === "delete") {
          await deleteApplication(app.id);
        } else {
          await updateApplicationStatus(app.id, bulkAction === "approve" ? "approved" : "rejected", {
            previousStatus: app.status,
            notes: bulkNotes || `Bulk ${bulkAction}`,
            performedBy,
          });
        }
        success += 1;
      } catch {
        failed += 1;
      }
    }

    setBulkProcessing(false);
    setBulkAction(null);
    setBulkNotes("");
    clearSelection();

    toast({
      title: `Bulk ${bulkAction} complete`,
      description: `${success} succeeded${failed > 0 ? `, ${failed} failed` : ""}.`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Applications" subtitle="Review and manage submitted insurance applications" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="Applications" subtitle="Review and manage submitted insurance applications" />

      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <ApplicationsKpiStrip applications={applications} />

        {/* Filters */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, order ID, vehicle, or route..."
                  className="pl-9 bg-background border h-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => updateParam("status", v)}>
                <SelectTrigger className="w-40 bg-background h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-2 z-20 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 backdrop-blur px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-background">
                {selectedIds.size} selected
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8">
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-success/40 text-success hover:bg-success/10"
                onClick={() => setBulkAction("approve")}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setBulkAction("reject")}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setBulkAction("delete")}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                All Applications{" "}
                <span className="text-muted-foreground font-normal">
                  ({filteredApplications.length} of {applications.length})
                </span>
              </h3>
            </div>
            {filteredApplications.length === 0 ? (
              <div className="py-16 text-center">
                <FileTextIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No applications found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {debouncedSearch || statusFilter !== "all"
                    ? "Try clearing your filters."
                    : "Submitted applications will appear here for review."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1280px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={(v) => togglePageSelection(Boolean(v))}
                            aria-label="Select all on page"
                          />
                        </TableHead>
                        <TableHead className="text-xs font-semibold">Order ID</TableHead>
                        <TableHead
                          className="text-xs font-semibold cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => toggleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Customer Name
                            {renderSortIcon("name")}
                          </div>
                        </TableHead>
                        <TableHead className="text-xs font-semibold">Phone</TableHead>
                        <TableHead className="text-xs font-semibold">Vehicle Type</TableHead>
                        <TableHead className="text-xs font-semibold">Border Route</TableHead>
                        <TableHead
                          className="text-xs font-semibold cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => toggleSort("travel")}
                        >
                          <div className="flex items-center gap-1">
                            Travel Day
                            {renderSortIcon("travel")}
                          </div>
                        </TableHead>
                        <TableHead className="text-xs font-semibold">Packages</TableHead>
                        <TableHead className="text-xs font-semibold">Passengers</TableHead>
                        <TableHead
                          className="text-xs font-semibold cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => toggleSort("totalPrice")}
                        >
                          <div className="flex items-center gap-1">
                            Total Price
                            {renderSortIcon("totalPrice")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-xs font-semibold cursor-pointer hover:bg-muted/50 transition-colors select-none"
                          onClick={() => toggleSort("createdAt")}
                        >
                          <div className="flex items-center gap-1">
                            Created At
                            {renderSortIcon("createdAt")}
                          </div>
                        </TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedApplications.map((app) => {
                        const isSelected = selectedIds.has(app.id);
                        return (
                          <TableRow
                            key={app.id}
                            data-state={isSelected ? "selected" : undefined}
                            className="hover:bg-muted/40 transition-colors border-b border-border"
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(v) => toggleRowSelection(app.id, Boolean(v))}
                                aria-label={`Select order ${app.orderId}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-semibold text-primary">{app.orderId}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-foreground">{app.name}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">
                                {app.phone || <span className="text-muted-foreground italic">-</span>}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">
                                {app.vehicleType || <span className="text-muted-foreground italic">-</span>}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium">{app.where || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">{app.when || "-"}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {app.packages && app.packages.length > 0 ? (
                                  app.packages.map((pkg) => (
                                    <Badge
                                      key={pkg}
                                      variant="outline"
                                      className="text-xs py-0.5 px-2 border-accent text-accent bg-accent/5"
                                    >
                                      {pkg}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">{app.passengers}</p>
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {formatPrice(app.totalPrice)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {app.createdAt ? format(app.createdAt, "dd MMM yyyy, HH:mm") : "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge variant={app.status}>{app.status}</StatusBadge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                {app.status === "pending" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-success hover:bg-success/10 hover:text-success"
                                      onClick={(e) => quickStatusChange(app, "approved", e)}
                                      aria-label={`Quick approve ${app.orderId}`}
                                      title="Quick approve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => quickStatusChange(app, "rejected", e)}
                                      aria-label={`Quick reject ${app.orderId}`}
                                      title="Quick reject"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  onClick={() => openDetailPanel(app)}
                                  aria-label={`View details ${app.orderId}`}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-accent"
                                  onClick={(e) => openEditFieldsDialog(app, e)}
                                  aria-label={`Edit order ${app.orderId}`}
                                  title="Edit order details"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/order-status/${app.id}`);
                                  }}
                                  aria-label={`Track status ${app.orderId}`}
                                  title="Track status"
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => openDeleteDialog(app, e)}
                                  aria-label={`Delete order ${app.orderId}`}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + ITEMS_PER_PAGE, filteredApplications.length)} of{" "}
                  {filteredApplications.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Status Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Application Status</DialogTitle>
              <DialogDescription>
                {editingApp?.orderId} - {editingApp?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSelectStatus}>
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Approve/Reject */}
        <Dialog open={isConfirmOpen} onOpenChange={(open) => { if (!open) { setIsConfirmOpen(false); setStatusNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {newStatus === "approved" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                Confirm {newStatus === "approved" ? "Approval" : "Rejection"}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to {newStatus === "approved" ? "approve" : "reject"} order <strong>{editingApp?.orderId}</strong> for <strong>{editingApp?.name}</strong>?
                {newStatus === "approved" && " This means the customer has paid."}
                {newStatus === "rejected" && " This will deny the application."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2">
              <label className="text-sm font-medium text-foreground">Notes (optional)</label>
              <Textarea
                placeholder={newStatus === "rejected" ? "Reason for rejection..." : "Any notes about this approval..."}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsConfirmOpen(false); setIsEditOpen(true); }}>
                Back
              </Button>
              <Button
                variant={newStatus === "rejected" ? "destructive" : "default"}
                onClick={handleUpdateStatus}
              >
                {newStatus === "approved" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open) { setIsDeleteOpen(false); setDeletingApp(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Application
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete order <strong>{deletingApp?.orderId}</strong> for <strong>{deletingApp?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeletingApp(null); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteApplication}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Action Confirmation Dialog */}
        <Dialog
          open={bulkAction !== null}
          onOpenChange={(open) => {
            if (!open && !bulkProcessing) {
              setBulkAction(null);
              setBulkNotes("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {bulkAction === "delete" ? (
                  <Trash2 className="h-5 w-5 text-destructive" />
                ) : bulkAction === "approve" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                Bulk {bulkAction === "approve" ? "Approve" : bulkAction === "reject" ? "Reject" : "Delete"}
              </DialogTitle>
              <DialogDescription>
                You are about to {bulkAction} <strong>{selectedIds.size}</strong> application
                {selectedIds.size === 1 ? "" : "s"}. This action will be logged.
              </DialogDescription>
            </DialogHeader>
            {bulkAction !== "delete" && (
              <div className="py-2 space-y-2">
                <label className="text-sm font-medium text-foreground">Notes (optional)</label>
                <Textarea
                  placeholder={`Reason for bulk ${bulkAction}...`}
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkAction(null);
                  setBulkNotes("");
                }}
                disabled={bulkProcessing}
              >
                Cancel
              </Button>
              <Button
                variant={bulkAction === "approve" ? "default" : "destructive"}
                onClick={performBulkAction}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? "Processing..." : `Confirm ${bulkAction}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Application Detail Panel */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="right" className="w-full sm:w-[480px] p-0">
            {selectedApp && (
              <ApplicationDetailPanel
                application={selectedApp}
                onClose={() => setIsDetailOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Edit Order Fields Modal */}
        <EditOrderModal
          open={isEditFieldsOpen}
          onOpenChange={(open) => {
            setIsEditFieldsOpen(open);
            if (!open) setEditingFieldsApp(null);
          }}
          application={editingFieldsApp}
          onSave={handleSaveEditFields}
        />
      </div>
    </DashboardLayout>
  );
};

export default Applications;
