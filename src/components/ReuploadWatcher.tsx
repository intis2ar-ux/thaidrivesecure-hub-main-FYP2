import { useCallback } from "react";
import { useReuploadNotifications } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

/**
 * ReuploadWatcher
 * Mount this once inside the authenticated layout so it listens globally.
 * It fires a toast notification whenever a customer re-uploads a document
 * for an order that had status = REUPLOAD_REQUIRED.
 */
export const ReuploadWatcher = () => {
  const { toast } = useToast();

  const handleReuploadReceived = useCallback(
    (
      _orderId: string,
      orderRef: string,
      customerName: string,
      docType: string
    ) => {
      toast({
        title: `📄 Document Re-uploaded`,
        description: `${customerName} (${orderRef}) has re-uploaded their ${docType}. Please review and verify.`,
        duration: 8000,
      });
    },
    [toast]
  );

  useReuploadNotifications(handleReuploadReceived);

  // Renders nothing — pure side-effect component
  return null;
};
