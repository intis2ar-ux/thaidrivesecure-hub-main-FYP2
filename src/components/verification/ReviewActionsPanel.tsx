import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { RejectionReason } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewActionsPanelProps {
  onApprove: () => Promise<void>;
  onReject: (reason: RejectionReason, notes: string) => Promise<void>;
  onRequestReUpload: (notes: string) => Promise<void>;
  isDisabled?: boolean;
  isReviewed?: boolean;
}

const rejectionReasons: { value: RejectionReason; label: string }[] = [
  { value: "blurred", label: "Document is blurred" },
  { value: "mismatch", label: "Data mismatch with application" },
  { value: "expired", label: "Document has expired" },
  { value: "unclear", label: "Information is unclear" },
  { value: "incomplete", label: "Document is incomplete" },
  { value: "fraudulent", label: "Suspected fraudulent document" },
];

export const ReviewActionsPanel = ({
  onApprove,
  onReject,
  onRequestReUpload,
  isDisabled = false,
  isReviewed = false,
}: ReviewActionsPanelProps) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<RejectionReason | "">("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReason) return;
    setIsLoading(true);
    try {
      await onReject(selectedReason, notes);
      setShowRejectForm(false);
      setSelectedReason("");
      setNotes("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReUpload = async () => {
    setIsLoading(true);
    try {
      await onRequestReUpload(notes);
      setNotes("");
    } finally {
      setIsLoading(false);
    }
  };

  if (isReviewed) {
    return (
      <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
        <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
        <p className="text-sm font-medium">Document Already Reviewed</p>
        <p className="text-xs text-muted-foreground mt-1">
          This document has been processed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Review Actions</h4>

      {!showRejectForm ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={handleApprove}
            disabled={isDisabled || isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectForm(true)}
            disabled={isDisabled || isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="outline"
            className="col-span-2"
            onClick={handleReUpload}
            disabled={isDisabled || isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Request Re-upload
          </Button>
        </div>
      ) : (
        <div className="space-y-4 p-4 rounded-lg bg-destructive/5 border border-destructive/30">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rejection Reason *</Label>
            <Select
              value={selectedReason}
              onValueChange={(v) => setSelectedReason(v as RejectionReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {rejectionReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-3 w-3" />
              Reviewer Notes
            </Label>
            <Textarea
              placeholder="Add additional notes for the rejection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!selectedReason || isLoading}
              className="flex-1"
            >
              Confirm Rejection
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectForm(false);
                setSelectedReason("");
                setNotes("");
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};