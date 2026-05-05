import { CreditCard, Eye, Loader2 } from "lucide-react";
import { Application } from "@/types";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/pricing";
import { useReceiptUrl } from "@/hooks/useReceiptUrl";
import { Section } from "./SectionHeader";

interface Props {
  application: Application;
  onPreview: (preview: { url: string; title: string }) => void;
}

export const PricingSection = ({ application, onPreview }: Props) => {
  const { receiptUrl, loading: receiptLoading } = useReceiptUrl(
    application.orderId || application.id,
    application.id,
    application.receiptUrl
  );

  return (
    <Section icon={CreditCard} title="Pricing">
      <div className="flex justify-between font-semibold">
        <span className="text-foreground">Total Price</span>
        <span className="text-lg text-primary">{formatPrice(application.totalPrice)}</span>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Payment Receipt</p>
        {receiptLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading receipt...
          </div>
        ) : receiptUrl ? (
          <button
            onClick={() => onPreview({ url: receiptUrl, title: "Payment Receipt" })}
            className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            View Receipt
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">No receipt uploaded</p>
        )}
      </div>
    </Section>
  );
};
