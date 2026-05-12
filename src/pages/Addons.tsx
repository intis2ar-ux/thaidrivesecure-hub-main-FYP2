import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package, FileText, Truck, Smartphone, Search,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Clock, CheckCircle2, Loader2, MoreVertical, Edit, Trash2,
  Calendar, User, Phone, AlertCircle, Eye,
} from "lucide-react";
import { useAddons } from "@/hooks/useFirestore";
import { AddonType, Addon, AddonStatus } from "@/types";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const Addons = () => {
  const navigate = useNavigate();
  const { addons, loading, updateAddon, deleteAddon } = useAddons();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("desc");

  // Edit State
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Addon>>({});

  // Delete State
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const filteredAddons = addons
    .filter((addon) => typeFilter === "all" || addon.type === typeFilter)
    .filter((addon) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        addon.applicantName?.toLowerCase().includes(q) ||
        addon.applicantPhone?.toLowerCase().includes(q) ||
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

  const getAddonIcon = (type: AddonType) => {
    switch (type) {
      case "towing": return <Truck className="h-4 w-4" />;
      case "tdac": return <FileText className="h-4 w-4" />;
      case "tm2_tm3": return <FileText className="h-4 w-4" />;
      case "authorize_letter": return <FileText className="h-4 w-4" />;
      case "sim_card": return <Smartphone className="h-4 w-4" />;
      case "adapter": return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const addonStats = {
    total: addons.length,
    pending: addons.filter((a) => a.status === "pending").length,
    confirmed: addons.filter((a) => a.status === "confirmed").length,
    completed: addons.filter((a) => a.status === "completed").length,
  };

  const handleEditClick = (addon: Addon) => {
    setEditingAddon(addon);
    setEditForm({
      applicantName: addon.applicantName,
      applicantPhone: addon.applicantPhone,
      pickupDate: addon.pickupDate,
      deliveryMethod: addon.deliveryMethod,
      status: addon.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAddon) return;
    try {
      await updateAddon(editingAddon.id, editForm);
      toast.success("Order updated successfully");
      setIsEditDialogOpen(false);
    } catch (err) {
      toast.error("Failed to update order");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingAddonId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAddonId) return;
    try {
      await deleteAddon(deletingAddonId);
      toast.success("Order deleted successfully");
      setIsDeleteDialogOpen(false);
    } catch (err) {
      toast.error("Failed to delete order");
    }
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
              <SelectItem value="adapter">Adapter</SelectItem>
              <SelectItem value="authorize_letter">Authorize Letter</SelectItem>
              <SelectItem value="sim_card">SIM Card</SelectItem>
              <SelectItem value="tdac">TDAC</SelectItem>
              <SelectItem value="tm2_tm3">TM2/TM3</SelectItem>
              <SelectItem value="towing">Towing</SelectItem>
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
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer group" onClick={toggleSortOrder}>
                        <div className="flex items-center gap-1">
                          CreatedAt {getSortIcon()}
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Applicant</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup/Method</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAddons.map((addon) => {
                      return (
                        <TableRow key={addon.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {addon.createdAt ? format(addon.createdAt, "dd/MM/yy HH:mm") : "-"}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-foreground">{addon.applicantName || "-"}</p>
                            <p className="text-xs text-muted-foreground">{addon.applicantPhone || ""}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              {getAddonIcon(addon.type)}
                              <span className="font-medium">
                                {addon.type === "tdac" ? "TDAC" : 
                                 addon.type === "tm2_tm3" ? "TM2/TM3" : 
                                 addon.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-xs font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" /> {addon.pickupDate || "Not set"}
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Truck className="h-3 w-3" /> {addon.deliveryMethod || "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <StatusBadge variant={addon.status}>{addon.status}</StatusBadge>
                              {addon.status === "cancelled" && addon.cancellationReason && (
                                <p className="text-[10px] text-destructive flex items-center gap-1 max-w-[150px] truncate">
                                  <AlertCircle className="h-2.5 w-2.5" /> {addon.cancellationReason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1.5 text-xs bg-card"
                                onClick={() => navigate(`/addons/${addon.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" /> Manage
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditClick(addon)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteClick(addon.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Add-on Order</DialogTitle>
            <DialogDescription>
              Modify the order details for {editingAddon?.applicantName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Full Name
              </label>
              <Input 
                value={editForm.applicantName || ""} 
                onChange={(e) => setEditForm({ ...editForm, applicantName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </label>
              <Input 
                value={editForm.applicantPhone || ""} 
                onChange={(e) => setEditForm({ ...editForm, applicantPhone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Pickup Date
                </label>
                <Input 
                  value={editForm.pickupDate || ""} 
                  onChange={(e) => setEditForm({ ...editForm, pickupDate: e.target.value })}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" /> Delivery
                </label>
                <Select 
                  value={editForm.deliveryMethod || ""} 
                  onValueChange={(v) => setEditForm({ ...editForm, deliveryMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Delivery">Delivery</SelectItem>
                    <SelectItem value="Self-Pickup">Self-Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Status</label>
              <Select 
                value={editForm.status} 
                onValueChange={(v) => setEditForm({ ...editForm, status: v as AddonStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the add-on order
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Addons;

