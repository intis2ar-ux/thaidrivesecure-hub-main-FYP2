import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Package, Shield, FileText, Truck, Smartphone, 
  Clock, CheckCircle2, Loader2, ArrowLeft,
  ExternalLink, CreditCard, Calendar, User, Phone, XCircle,
  AlertCircle, Check, MapPin,
} from "lucide-react";
import { useAddon } from "@/hooks/useFirestore";
import { AddonType, AddonStatus } from "@/types";
import { toast } from "sonner";
import { formatPrice } from "@/lib/pricing";

// Progress Tracker Component
const OrderProgress = ({ status }: { status: AddonStatus }) => {
  const steps = [
    { id: "applied", label: "Applied", sub: "Order submitted", icon: Package },
    { id: "pending", label: "Pending", sub: "Awaiting review", icon: Clock },
    { id: "confirmed", label: "Confirmed", sub: "Order verified", icon: Shield },
    { id: "completed", label: "Completed", sub: "Service ready", icon: CheckCircle2 },
  ];

  const getStatusIndex = (s: string) => {
    if (s === "completed") return 3;
    if (s === "confirmed") return 2;
    if (s === "pending") return 1;
    return 0; // applied
  };

  const currentIndex = getStatusIndex(status);

  if (status === "cancelled") {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-8 flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <h4 className="text-lg font-bold text-destructive uppercase tracking-wider">Order Cancelled</h4>
          <p className="text-sm text-muted-foreground mt-1">This order has been permanently cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-6 pb-10 max-w-2xl mx-auto">
      {/* Progress Line */}
      <div className="absolute top-[50px] left-[10%] right-[10%] h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative flex justify-between">
        {steps.map((step, idx) => {
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center w-1/4">
              <div 
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                  isActive 
                    ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/30" 
                    : "bg-background border-muted text-muted-foreground"
                )}
              >
                {isActive && idx < currentIndex ? (
                  <Check className="h-6 w-6 stroke-[3px]" />
                ) : (
                  <StepIcon className={cn("h-6 w-6", isCurrent && "animate-pulse")} />
                )}
              </div>
              <div className="mt-4 text-center">
                <p className={cn(
                  "text-xs font-black uppercase tracking-widest transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium opacity-80">
                  {step.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AddonDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addon, loading, error, updateStatus } = useAddon(id);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const getAddonIcon = (type: AddonType) => {
    switch (type) {
      case "towing": return <Truck className="h-5 w-5" />;
      case "tdac": return <FileText className="h-5 w-5" />;
      case "tm2_tm3": return <FileText className="h-5 w-5" />;
      case "authorize_letter": return <FileText className="h-5 w-5" />;
      case "sim_card": return <Smartphone className="h-5 w-5" />;
      case "adapter": return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const handleQuickStatusUpdate = async (status: AddonStatus, reason?: string) => {
    try {
      await updateStatus(status, reason);
      toast.success(`Order marked as ${status}`);
      if (status === "cancelled") {
        setIsCancelling(false);
        setCancelReason("");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !addon) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Error Loading Add-on</h2>
          <p className="text-muted-foreground">{error || "Order not found"}</p>
          <Button onClick={() => navigate("/addons")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Add-ons
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-background min-h-screen">
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
          {/* Header Action */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/addons")} className="hover:bg-muted group">
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" /> Back to List
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded-full border border-border">ID: {addon.id}</span>
              <StatusBadge variant={addon.status as any}>{addon.status}</StatusBadge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Progress & Info */}
            <div className="lg:col-span-7 space-y-8">
              {/* Progress Tracker Card */}
              <Card className="border border-border shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin-slow" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-tighter">Live Order Tracker</h3>
                </div>
                <CardContent className="p-8">
                  <OrderProgress status={addon.status as AddonStatus} />
                </CardContent>
              </Card>

              {/* Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border border-border rounded-xl bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Applicant</p>
                        <h4 className="text-base font-bold">{addon.applicantName}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Contact</p>
                        <h4 className="text-sm font-medium">{addon.applicantPhone}</h4>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border rounded-xl bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3 text-accent">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pickup Schedule</p>
                        <h4 className="text-base font-bold">{addon.pickupDate || "Not Set"}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Delivery Mode</p>
                        <h4 className="text-sm font-medium">{addon.deliveryMethod || "N/A"}</h4>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Card */}
              <Card className="border border-border rounded-2xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Administrative Controls</h4>
                  <Clock className="h-4 w-4 text-muted-foreground opacity-50" />
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button 
                      className="h-14 bg-accent hover:bg-accent/90 border-none shadow-lg shadow-accent/20 flex flex-col items-center justify-center gap-0.5" 
                      onClick={() => handleQuickStatusUpdate("confirmed")}
                      disabled={addon.status === "confirmed" || addon.status === "completed" || addon.status === "cancelled"}
                    >
                      <Shield className="h-5 w-5" />
                      <span className="text-[10px] font-bold">Confirm Order</span>
                    </Button>
                    <Button 
                      className="h-14 bg-success hover:bg-success/90 border-none shadow-lg shadow-success/20 flex flex-col items-center justify-center gap-0.5" 
                      onClick={() => handleQuickStatusUpdate("completed")}
                      disabled={addon.status === "completed" || addon.status === "cancelled"}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-[10px] font-bold">Mark Ready</span>
                    </Button>
                    
                    {!isCancelling ? (
                      <Button 
                        variant="outline" 
                        className="h-14 text-destructive border-dashed hover:bg-destructive/5 flex flex-col items-center justify-center gap-0.5" 
                        onClick={() => setIsCancelling(true)}
                        disabled={addon.status === "cancelled"}
                      >
                        <XCircle className="h-5 w-5" />
                        <span className="text-[10px] font-bold">Cancel</span>
                      </Button>
                    ) : (
                      <div className="col-span-full sm:col-span-3 space-y-3 p-4 bg-destructive/5 rounded-xl border border-destructive/20 animate-in zoom-in-95 duration-200">
                        <label className="text-[10px] font-black uppercase tracking-widest text-destructive">Cancellation Reason Required</label>
                        <Textarea 
                          placeholder="Why is this order being cancelled?" 
                          className="min-h-[100px] bg-background border-destructive/20 focus:border-destructive"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="destructive" 
                            className="flex-1 font-bold h-10"
                            disabled={!cancelReason.trim()}
                            onClick={() => handleQuickStatusUpdate("cancelled", cancelReason)}
                          >
                            Confirm Cancellation
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-10 px-6"
                            onClick={() => { setIsCancelling(false); setCancelReason(""); }}
                          >
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Receipt Preview */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border border-border rounded-2xl overflow-hidden sticky top-8">
                <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Transaction Receipt</h4>
                  </div>
                  {addon.payment?.status && (
                    <StatusBadge variant={(addon.payment.status || "pending").toLowerCase() as any}>
                      {addon.payment.status}
                    </StatusBadge>
                  )}
                </div>
                <CardContent className="p-6">
                  {addon.payment?.receiptUrl ? (
                    <div className="space-y-4">
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-border bg-muted/20 group shadow-2xl ring-1 ring-border/50">
                        <img 
                          src={addon.payment.receiptUrl} 
                          alt="Receipt" 
                          className="object-contain w-full h-full p-4 hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <a 
                            href={addon.payment.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="h-14 w-14 bg-background rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all border-4 border-primary/20"
                          >
                            <ExternalLink className="h-6 w-6 text-primary" />
                          </a>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor Integration</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{addon.vendorName || "TDS System"}</span>
                          <span className="text-lg font-black text-primary">{formatPrice(addon.cost)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] w-full rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border bg-muted/5 p-8 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <h4 className="text-sm font-bold text-muted-foreground">No Receipt Attached</h4>
                      <p className="text-xs text-muted-foreground/60 mt-2">The customer hasn't uploaded a payment verification yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddonDetails;
