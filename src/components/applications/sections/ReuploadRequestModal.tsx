import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface ReuploadRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: "passport" | "vehicle_grant";
  onSubmit: (reason: string, notes: string) => Promise<void>;
}

export const ReuploadRequestModal = ({
  isOpen,
  onClose,
  documentType,
  onSubmit,
}: ReuploadRequestModalProps) => {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(reason, notes);
      onClose();
    } catch (error) {
      console.error("Error submitting re-upload request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const docLabel = documentType === "passport" ? "Passport" : "Vehicle Grant";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <RefreshCw className="h-5 w-5" />
            Request Re-upload
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg text-orange-800 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              This will notify the customer that their <strong>{docLabel}</strong> needs to be re-uploaded. 
              The application status will be set to "Re-upload Required".
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docType">Document Type</Label>
            <div className="p-2 border rounded-md bg-muted/50 text-sm font-medium">
              {docLabel}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Re-upload</Label>
            <Select onValueChange={setReason} value={reason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Blurry image">Blurry image</SelectItem>
                <SelectItem value="Missing information">Missing information</SelectItem>
                <SelectItem value="Incorrect document">Incorrect document</SelectItem>
                <SelectItem value="Expired document">Expired document</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Please upload a clearer image of the bottom right corner..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Send Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
