import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaff } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserCircle, 
  Shield, 
  Mail, 
  Calendar,
  Loader2,
  AlertCircle,
  Phone,
  Key,
  UserMinus,
  CheckCircle2,
  Filter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserRole, UserStatus, StaffAccount } from "@/types";
import { cn } from "@/lib/utils";

export default function StaffManagement() {
  const { user: currentUser } = useAuth();
  const { staff, loading, error, createStaff, updateStaff, deleteStaff } = useStaff(currentUser?.id);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "staff" as UserRole,
    phoneNumber: "",
    status: "active" as UserStatus
  });

  // Analytics / Summary
  const stats = useMemo(() => {
    return {
      total: staff.length,
      active: staff.filter(s => s.status === "active").length,
      admins: staff.filter(s => s.role === "admin").length,
      members: staff.filter(s => s.role === "staff").length,
    };
  }, [staff]);

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, searchTerm, roleFilter, statusFilter]);

  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">Only administrators can manage staff accounts.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createStaff({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        status: formData.status,
        createdBy: currentUser.name
      });
      toast.success("Staff account created successfully");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setIsSubmitting(true);
    try {
      await updateStaff(selectedStaff.uid, {
        fullName: formData.fullName,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        status: formData.status
      });
      toast.success("Staff account updated");
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to update staff account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    if (selectedStaff.uid === currentUser.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await deleteStaff(selectedStaff.uid);
      toast.success("Staff record deleted");
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to delete staff record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (member: StaffAccount) => {
    if (member.uid === currentUser.id) {
      toast.error("You cannot disable your own account");
      return;
    }
    const newStatus = member.status === "active" ? "disabled" : "active";
    try {
      await updateStaff(member.uid, { status: newStatus });
      toast.success(`Account ${newStatus === "active" ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const openEditDialog = (member: StaffAccount) => {
    setSelectedStaff(member);
    setFormData({
      fullName: member.fullName,
      email: member.email,
      password: "",
      role: member.role,
      phoneNumber: member.phoneNumber || "",
      status: member.status
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "staff",
      phoneNumber: "",
      status: "active"
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen bg-background">
        <Header 
          title="Staff Management" 
          subtitle="Manage your team's access and administrative privileges." 
          actions={
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Staff Member
            </Button>
          }
        />

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Staff"
              value={stats.total}
              icon={Users}
              iconColor="text-primary"
              iconBg="bg-primary/10"
            />
            <StatCard
              title="Active Staff"
              value={stats.active}
              icon={CheckCircle2}
              iconColor="text-success"
              iconBg="bg-success/10"
            />
            <StatCard
              title="Admins"
              value={stats.admins}
              icon={Shield}
              iconColor="text-accent"
              iconBg="bg-accent/10"
            />
            <StatCard
              title="Staff Members"
              value={stats.members}
              icon={UserCircle}
              iconColor="text-muted-foreground"
              iconBg="bg-muted"
            />
          </div>

          {/* Search & Filter */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px] h-10">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Role" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-10">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>

                  {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card className="border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-16">
                        <div className="flex items-center space-x-4 animate-pulse">
                          <div className="rounded-full bg-muted h-10 w-10" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-1/4" />
                            <div className="h-3 bg-muted rounded w-1/3" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                        <p>No staff members found matching your criteria.</p>
                        <Button variant="link" onClick={clearFilters}>Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((member) => (
                    <TableRow key={member.uid} className="hover:bg-muted/30 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <UserCircle className="h-6 w-6 text-primary/60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{member.fullName}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{member.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"} className="capitalize gap-1 text-[11px] font-medium">
                          <Shield className="h-3 w-3" />
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "capitalize text-[11px] font-medium border-0",
                            member.status === "active" ? "bg-success/15 text-success hover:bg-success/20" : "bg-destructive/15 text-destructive hover:bg-destructive/20"
                          )}
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {member.phoneNumber || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {member.lastLogin ? format(member.lastLogin, "MMM dd, yyyy") : "Never"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {member.createdAt ? format(member.createdAt, "MMM dd, yyyy") : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEditDialog(member)} className="gap-2">
                              <Edit2 className="h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Password reset link sent to " + member.email)} className="gap-2">
                              <Key className="h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(member)} className="gap-2">
                              {member.status === "active" ? (
                                <>
                                  <UserMinus className="h-4 w-4 text-warning-foreground" />
                                  Disable Account
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                  Enable Account
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => { setSelectedStaff(member); setIsDeleteDialogOpen(true); }}
                              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                              disabled={member.uid === currentUser.id}
                            >
                              <Trash2 className="h-4 w-4" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Modals */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleAddStaff}>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new account with specific administrative privileges.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName"
                    placeholder="e.g. John Doe" 
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="john@thaidrive.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Initial Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="••••••••" 
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Account Role</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff Member</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone"
                      placeholder="+60..." 
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Active Status</Label>
                    <p className="text-[11px] text-muted-foreground">Allow immediate dashboard access</p>
                  </div>
                  <Switch 
                    checked={formData.status === "active"} 
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "disabled" })}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Create Staff Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleUpdateStaff}>
              <DialogHeader>
                <DialogTitle>Edit Staff Account</DialogTitle>
                <DialogDescription>
                  Modify team member details or adjust permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input 
                    id="edit-fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 opacity-60">
                  <Label htmlFor="edit-email">Email Address (Primary Identifier)</Label>
                  <Input id="edit-email" value={formData.email} disabled className="bg-muted cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Account Role</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                    >
                      <SelectTrigger id="edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff Member</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone Number</Label>
                    <Input 
                      id="edit-phone"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Account Status</Label>
                    <p className="text-[11px] text-muted-foreground">Enable or disable dashboard access</p>
                  </div>
                  <Switch 
                    checked={formData.status === "active"} 
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "disabled" })}
                    disabled={selectedStaff?.uid === currentUser.id}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Confirm Account Deletion
              </DialogTitle>
              <DialogDescription className="pt-2 text-foreground/80">
                This action will permanently delete <strong>{selectedStaff?.fullName}</strong> from the staff directory and revoke all access.
                <br /><br />
                <span className="text-xs text-muted-foreground font-medium">Note: Their Firebase Auth account will remain but they won't be able to log in.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="h-9">Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteStaff} disabled={isSubmitting} className="h-9">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
