import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Clock,
  Flag,
  FileText,
  Eye,
  Image,
  History,
  ClipboardList,
} from "lucide-react";
import { useAIVerifications, useApplications } from "@/hooks/useFirestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AIVerification as AIVerificationType, RejectionReason, VerificationAudit } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

// Import new components
import { DocumentReviewModal } from "@/components/verification/DocumentReviewModal";
import { ExtractedDataPanel } from "@/components/verification/ExtractedDataPanel";
import { ConfidenceIndicator } from "@/components/verification/ConfidenceIndicator";
import { AuditTrailPanel } from "@/components/verification/AuditTrailPanel";
import { ReviewActionsPanel } from "@/components/verification/ReviewActionsPanel";

const AIVerification = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { verifications, loading, updateVerification } = useAIVerifications();
  const { applications, updateApplicationStatus } = useApplications();
  const [selectedVerification, setSelectedVerification] = useState<AIVerificationType | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);

  const pendingReview = verifications.filter((v) => !v.reviewedByStaff);
  const lowConfidence = verifications.filter((v) => v.overallConfidence < 0.7);
  const flaggedCount = verifications.filter((v) => v.flagged).length;
  const autoVerified = verifications.filter((v) => v.overallConfidence >= 0.85 && v.verifiedByAI);

  const getApplication = (appId: string) =>
    applications.find((a) => a.id === appId);

  const createAuditEntry = (
    action: VerificationAudit["action"],
    reason?: RejectionReason,
    notes?: string
  ): VerificationAudit => ({
    id: `audit-${Date.now()}`,
    reviewerName: user?.name || "Staff",
    reviewerId: user?.id || "unknown",
    action,
    reason,
    notes,
    timestamp: new Date(),
  });

  const handleApprove = async () => {
    if (!selectedVerification) return;
    try {
      const auditEntry = createAuditEntry("approved");
      const existingAudit = selectedVerification.auditTrail || [];
      
      await updateVerification(selectedVerification.id, {
        reviewedByStaff: true,
        verifiedByAI: true,
        flagged: false,
        reviewedBy: user?.name,
        reviewedAt: new Date(),
        auditTrail: [...existingAudit, auditEntry],
      });

      // Update application status to verified
      await updateApplicationStatus(selectedVerification.applicationId, "approved");

      toast({
        title: "Document Approved",
        description: "The document has been verified and the application status updated.",
      });
      setIsReviewOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve document.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (reason: RejectionReason, notes: string) => {
    if (!selectedVerification) return;
    try {
      const auditEntry = createAuditEntry("rejected", reason, notes);
      const existingAudit = selectedVerification.auditTrail || [];

      await updateVerification(selectedVerification.id, {
        reviewedByStaff: true,
        verifiedByAI: false,
        flagged: true,
        rejectionReason: reason,
        reviewerNotes: notes,
        reviewedBy: user?.name,
        reviewedAt: new Date(),
        auditTrail: [...existingAudit, auditEntry],
      });

      // Update application status to rejected
      await updateApplicationStatus(selectedVerification.applicationId, "rejected");

      toast({
        title: "Document Rejected",
        description: "The document has been rejected and the application status updated.",
        variant: "destructive",
      });
      setIsReviewOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject document.",
        variant: "destructive",
      });
    }
  };

  const handleRequestReUpload = async (notes: string) => {
    if (!selectedVerification) return;
    try {
      const auditEntry = createAuditEntry("re_upload_requested", undefined, notes);
      const existingAudit = selectedVerification.auditTrail || [];

      await updateVerification(selectedVerification.id, {
        reUploadRequested: true,
        reviewerNotes: notes,
        reviewedBy: user?.name,
        auditTrail: [...existingAudit, auditEntry],
      });

      // Update application status to pending
      await updateApplicationStatus(selectedVerification.applicationId, "pending");

      toast({
        title: "Re-upload Requested",
        description: "The customer has been notified to upload a new document.",
      });
      setIsReviewOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request re-upload.",
        variant: "destructive",
      });
    }
  };

  const openReview = (verification: AIVerificationType) => {
    setSelectedVerification(verification);
    setIsReviewOpen(true);
  };

  const openDocumentPreview = (verification: AIVerificationType) => {
    setSelectedVerification(verification);
    setIsDocumentPreviewOpen(true);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return "text-success";
    if (score >= 0.7) return "text-warning";
    return "text-destructive";
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "drivers_license":
        return "Driver's License";
      case "vehicle_registration":
        return "Vehicle Registration";
      case "passport":
        return "Passport";
      default:
        return type;
    }
  };

  const getStatusBadge = (ver: AIVerificationType) => {
    if (ver.reUploadRequested) {
      return <StatusBadge variant="warning">Re-upload Pending</StatusBadge>;
    }
    if (ver.flagged) {
      return <StatusBadge variant="rejected">Rejected</StatusBadge>;
    }
    if (ver.reviewedByStaff && ver.verifiedByAI) {
      return <StatusBadge variant="verified">Verified</StatusBadge>;
    }
    if (ver.overallConfidence >= 0.85 && ver.verifiedByAI) {
      return <StatusBadge variant="approved">Auto-Verified</StatusBadge>;
    }
    if (ver.overallConfidence < 0.7) {
      return <StatusBadge variant="error">High Risk</StatusBadge>;
    }
    return <StatusBadge variant="pending">Pending Review</StatusBadge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header
          title="AI Verification"
          subtitle="Enterprise Document Verification System"
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="AI Verification"
        subtitle="Enterprise Document Verification System"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifications.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-warning/15">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReview.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent/15">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{autoVerified.length}</p>
                <p className="text-sm text-muted-foreground">Auto-Verified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-success/15">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {verifications.filter((v) => v.verifiedByAI && v.reviewedByStaff).length}
                </p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/15">
                <Flag className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{flaggedCount}</p>
                <p className="text-sm text-muted-foreground">Flagged</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confidence Legend */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>≥85%: Auto Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>70-84%: Manual Review Required</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>&lt;70%: Flagged (High Risk)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Document Verifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No verifications found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((ver) => {
                    const app = getApplication(ver.applicationId);
                    return (
                      <TableRow
                        key={ver.id}
                        className={cn(
                          "hover:bg-muted/50 cursor-pointer transition-colors",
                          ver.overallConfidence < 0.7 && !ver.reviewedByStaff && "bg-destructive/5",
                          ver.flagged && "bg-destructive/5"
                        )}
                        onClick={() => openReview(ver)}
                      >
                        <TableCell className="font-mono text-sm">{ver.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ver.applicationId}</p>
                            <p className="text-xs text-muted-foreground">
                              {app?.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getDocumentTypeLabel(ver.documentType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                getConfidenceColor(ver.overallConfidence)
                              )}
                            >
                              {(ver.overallConfidence * 100).toFixed(0)}%
                            </span>
                            {ver.overallConfidence < 0.7 && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(ver)}</TableCell>
                        <TableCell className="text-sm">
                          {ver.reviewedBy || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(ver.timestamp, "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDocumentPreview(ver);
                              }}
                            >
                              <Image className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReview(ver);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Preview Modal */}
      <DocumentReviewModal
        verification={selectedVerification}
        isOpen={isDocumentPreviewOpen}
        onClose={() => setIsDocumentPreviewOpen(false)}
        customerName={
          selectedVerification
            ? getApplication(selectedVerification.applicationId)?.name
            : undefined
        }
      />

      {/* Full Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Verification Review
            </DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <div className="space-y-6 pr-4">
                {/* Document Info Header */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {getDocumentTypeLabel(selectedVerification.documentType)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Document ID: {selectedVerification.documentId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Application: {selectedVerification.applicationId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(selectedVerification)}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(selectedVerification.timestamp, "PPP 'at' p")}
                    </p>
                  </div>
                </div>

                {/* Confidence Indicator */}
                <ConfidenceIndicator
                  confidence={selectedVerification.overallConfidence}
                  size="md"
                />

                <Separator />

                {/* Tabbed Content */}
                <Tabs defaultValue="data" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="data" className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Extracted Data
                    </TabsTrigger>
                    <TabsTrigger value="document" className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Document
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Audit Trail
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="data" className="mt-4">
                    <ExtractedDataPanel
                      fields={selectedVerification.extractedFields}
                      application={getApplication(selectedVerification.applicationId)}
                    />
                  </TabsContent>

                  <TabsContent value="document" className="mt-4">
                    <div className="text-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsReviewOpen(false);
                          setIsDocumentPreviewOpen(true);
                        }}
                        className="mb-4"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Open Full Document Viewer
                      </Button>
                      
                      <div className="relative bg-muted rounded-lg overflow-hidden h-[250px] flex items-center justify-center">
                        {selectedVerification.documentImageUrl ? (
                          <img
                            src={selectedVerification.documentImageUrl}
                            alt="Document preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Document preview not available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <AuditTrailPanel
                      auditTrail={selectedVerification.auditTrail || []}
                    />
                  </TabsContent>
                </Tabs>

                <Separator />

                {/* Review Actions */}
                <ReviewActionsPanel
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRequestReUpload={handleRequestReUpload}
                  isDisabled={false}
                  isReviewed={selectedVerification.reviewedByStaff && !selectedVerification.reUploadRequested}
                />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AIVerification;