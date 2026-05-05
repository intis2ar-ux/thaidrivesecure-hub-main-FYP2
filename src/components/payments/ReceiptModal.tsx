import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Payment } from "@/types";
import { format } from "date-fns";
import { QrCode, Banknote, CheckCircle, Printer, Download } from "lucide-react";
import { useRef } from "react";
import tdsLogo from "@/assets/tds-memanjang-logo.png";

interface ReceiptModalProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReceiptModal = ({ payment, open, onOpenChange }: ReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${payment.id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 24px; }
            .amount { font-size: 28px; font-weight: 700; }
            .success { color: #16a34a; font-size: 14px; font-weight: 500; }
            .divider { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
            .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; }
            .label { color: #6b7280; }
            .value { font-weight: 500; }
            .mono { font-family: monospace; }
            .total { display: flex; justify-content: space-between; font-weight: 600; font-size: 16px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${tdsLogo}" alt="ThaiDriveSecure by CNT Enterprise" style="height: 48px; margin: 0 auto 12px;" />

            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Payment Receipt</div>
            <div class="amount">RM${payment.amount.toLocaleString()}</div>
            <div class="success">Payment Successful</div>
          </div>
          <hr class="divider" />
          <div class="row"><span class="label">Payment ID</span><span class="value mono">${payment.id}</span></div>
          <div class="row"><span class="label">Customer</span><span class="value">${payment.customerName}</span></div>
          <div class="row"><span class="label">Method</span><span class="value">${payment.method === "qr" ? "QR Payment" : "Cash"}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${format(payment.createdAt, "dd MMM yyyy, HH:mm")}</span></div>
          <div class="row"><span class="label">Status</span><span class="value success">${payment.status}</span></div>
          <hr class="divider" />
          <div class="total"><span>Total Paid</span><span>RM${payment.amount.toLocaleString()}</span></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const text = [
      "ThaiDriveSecure by CNT Enterprise",
      "",
      "PAYMENT RECEIPT",
      "═══════════════════════════════",
      "",
      `Amount: RM${payment.amount.toLocaleString()}`,
      `Status: Payment Successful`,
      "",
      "───────────────────────────────",
      `Payment ID: ${payment.id}`,
      `Customer: ${payment.customerName}`,
      `Method: ${payment.method === "qr" ? "QR Payment" : "Cash"}`,
      `Date: ${format(payment.createdAt, "dd MMM yyyy, HH:mm")}`,
      `Status: ${payment.status}`,
      "───────────────────────────────",
      "",
      `Total Paid: RM${payment.amount.toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${payment.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle className="h-5 w-5 text-success" />
            Payment Receipt
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-4">
          {/* Branding */}
          <div className="text-center">
            <img src={tdsLogo} alt="ThaiDriveSecure by CNT Enterprise" className="h-12 w-auto mx-auto" />
          </div>

          {/* Amount */}
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-foreground">RM{payment.amount.toLocaleString()}</p>
            <p className="text-sm text-success font-medium">Payment Successful</p>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment ID</span>
              <span className="font-mono text-foreground">{payment.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium text-foreground">{payment.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method</span>
              <span className="flex items-center gap-1.5 text-foreground">
                {payment.method === "qr" ? (
                  <QrCode className="h-3.5 w-3.5" />
                ) : (
                  <Banknote className="h-3.5 w-3.5" />
                )}
                {payment.method === "qr" ? "QR Payment" : "Cash"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">{format(payment.createdAt, "dd MMM yyyy, HH:mm")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="text-success font-medium capitalize">{payment.status}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between font-semibold">
            <span className="text-foreground">Total Paid</span>
            <span className="text-foreground">RM{payment.amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
