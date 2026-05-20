import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useOrderStatus } from "@/hooks/useOrderStatus";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Upload,
  FileCheck,
  Clock,
  CheckCircle2,
  Download,
  AlertCircle,
  FileText,
  ArrowLeft,
  Loader2,
  ImageIcon,
  Shield,
  Truck,
  ChevronRight,
  History,
  User,
  MapPin,
  Car,
  Package,
  CreditCard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplicationStatus } from "@/types";
import { formatPrice } from "@/lib/pricing";

// Status flow steps for the progress indicator
const STATUS_STEPS: { key: ApplicationStatus; label: string; icon: React.ElementType; description: string }[] = [
  { key: "applied", label: "Applied", icon: Upload, description: "Application submitted" },
  { key: "pending", label: "Pending", icon: Clock, description: "Awaiting review" },
  { key: "approved", label: "Approved", icon: Shield, description: "Application approved" },
  { key: "completed", label: "Completed", icon: CheckCircle2, description: "Insurance ready" },
];

const getStepIndex = (status: ApplicationStatus): number => {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (status === "document_generated") return 3; // Document generated = completed
  if (status === "processing") return 2; // Processing = approved stage
  if (status === "rejected") return -1; // Special case
  return idx >= 0 ? idx : 0;
};

const OrderStatus = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { order, statusLogs, loading, error, uploadReceiptAndApply } = useOrderStatus(orderId);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCompleted = order?.status === "completed" || order?.status === "document_generated";
  const isRejected = order?.status === "rejected";
  const currentStepIndex = order ? getStepIndex(order.status) : -1;

  const handleFileSelect = useCallback((file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPEG, PNG, WebP, or PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile || !orderId) return;
    setUploading(true);
    try {
      await uploadReceiptAndApply(selectedFile, user?.id || "anonymous", orderId);
      toast.success("Receipt uploaded successfully! Your application is being processed.");
      clearFile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Application Status" subtitle="Track your application progress" />
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <DashboardLayout>
        <Header title="Application Status" subtitle="Track your application progress" />
        <div className="p-6 max-w-3xl mx-auto">
          <Card className="border-destructive/30">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">Order Not Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {error || "The requested order could not be found. Please check your order ID and try again."}
              </p>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="Application Status" subtitle={`Order: ${order.orderId}`} />

      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => navigate("/applications")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Button>

        {/* Status Progress Card */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className={cn(
            "h-1.5 w-full",
            isRejected ? "bg-destructive" :
            isCompleted ? "bg-success" :
            "bg-gradient-to-r from-primary via-primary to-primary/30"
          )} style={!isRejected && !isCompleted ? { backgroundSize: `${Math.max(((currentStepIndex + 1) / STATUS_STEPS.length) * 100, 15)}% 100%`, backgroundRepeat: "no-repeat" } : {}} />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Application Progress
              </CardTitle>
              <StatusBadge variant={order.status}>{order.status.replace("_", " ")}</StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            {/* Rejected banner */}
            {isRejected && (
              <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Application Rejected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your application has been rejected. Please contact support for details.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step Progress Indicator */}
            {!isRejected && (
              <div className="grid grid-cols-4 gap-0">
                {STATUS_STEPS.map((step, idx) => {
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="relative flex flex-col items-center group">
                      {/* Connector line */}
                      {idx > 0 && (
                        <div
                          className={cn(
                            "absolute top-5 -left-1/2 w-full h-0.5 transition-colors duration-500",
                            idx <= currentStepIndex ? "bg-primary" : "bg-border"
                          )}
                        />
                      )}

                      {/* Step circle */}
                      <div
                        className={cn(
                          "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                          isCurrent
                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110"
                            : isActive
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        {isActive && !isCurrent ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <StepIcon className={cn("h-5 w-5", isCurrent && "animate-pulse")} />
                        )}
                      </div>

                      {/* Label */}
                      <p
                        className={cn(
                          "mt-2 text-xs font-medium text-center transition-colors",
                          isCurrent ? "text-primary font-semibold" : isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground text-center mt-0.5 hidden sm:block">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow icon={User} label="Customer" value={order.customerName} />
              <DetailRow icon={Car} label="Vehicle Type" value={order.vehicleType || "-"} />
              <DetailRow icon={MapPin} label="Border Route" value={order.borderRoute || "-"} />
              <DetailRow icon={CreditCard} label="Total Price" value={order.totalPrice ? formatPrice(order.totalPrice) : "-"} />
              <DetailRow icon={Clock} label="Submitted" value={order.createdAt ? format(order.createdAt, "dd MMM yyyy, HH:mm") : "-"} />
              {order.approvedAt && (
                <DetailRow icon={CheckCircle2} label="Approved" value={format(order.approvedAt, "dd MMM yyyy, HH:mm")} />
              )}
            </div>
            {order.packages.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Packages</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {order.packages.map((pkg) => (
                    <Badge key={pkg} variant="outline" className="text-xs py-0.5 px-2 border-accent text-accent bg-accent/5">
                      {pkg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Upload Section */}
        {false && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Upload Payment Receipt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Please upload your payment receipt to proceed with your insurance application.
                Accepted formats: JPEG, PNG, WebP, or PDF (max 10MB).
              </p>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                  dragActive
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : selectedFile
                    ? "border-success/50 bg-success/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    {previewUrl ? (
                      <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden border border-border">
                        <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FileCheck className="h-10 w-10 text-success mx-auto" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Drop your receipt here or <span className="text-primary">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG, WebP, or PDF • Max 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              {selectedFile && (
                <Button
                  className="w-full mt-4 gap-2"
                  onClick={handleSubmit}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Submit Receipt
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Receipt Already Uploaded */}
        {false && (
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Receipt Uploaded</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your payment receipt has been submitted. Our team is reviewing your application.
                  </p>
                </div>
                <a
                  href={order.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    View
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insurance Document Download (Completed) */}
        {isCompleted && order.insuranceDocumentUrl && (
          <Card className="border border-success/30 bg-success/5 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-7 w-7 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Insurance Document Ready</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your insurance document has been generated. Download and keep it accessible during your trip.
                  </p>
                </div>
                <a
                  href={order.insuranceDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button className="gap-2 bg-success hover:bg-success/90 text-white shadow-md shadow-success/20">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status History */}
        {statusLogs.length > 0 && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {statusLogs.map((log, idx) => (
                  <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Timeline connector */}
                    {idx < statusLogs.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                    )}

                    {/* Dot */}
                    <div
                      className={cn(
                        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        idx === 0 ? "bg-primary/15 border-2 border-primary" : "bg-muted border border-border"
                      )}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          idx === 0 ? "bg-primary" : "bg-muted-foreground/50"
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {format(log.timestamp, "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>
                      )}
                      {log.performedBy && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          by {log.performedBy}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

// Helper component for detail rows
const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  </div>
);

export default OrderStatus;
