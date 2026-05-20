import jsPDF from "jspdf";
import QRCode from "qrcode";
import { format } from "date-fns";
import { Application } from "@/types";
import { loadThaiFonts } from "./fonts";
import { formatPrice } from "./pricing";

const BRAND_BLUE: [number, number, number] = [27, 59, 111];
const ACCENT_GOLD: [number, number, number] = [196, 148, 20];
const TEXT_DARK: [number, number, number] = [33, 37, 41];
const TEXT_MUTED: [number, number, number] = [108, 117, 125];
const LINE_LIGHT: [number, number, number] = [224, 228, 234];

const MARGIN_X = 18;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

interface Cursor { y: number }

const setText = (
  pdf: jsPDF,
  color: [number, number, number],
  size: number,
  style: "normal" | "bold" = "normal"
) => {
  pdf.setTextColor(color[0], color[1], color[2]);
  pdf.setFontSize(size);
  pdf.setFont("Sarabun", style);
};

const infoRow = (
  pdf: jsPDF,
  label: string,
  value: string,
  cursor: Cursor
) => {
  setText(pdf, TEXT_MUTED, 8);
  pdf.text(label, MARGIN_X + 3, cursor.y);
  setText(pdf, TEXT_DARK, 9, "bold");
  pdf.text(value || "-", MARGIN_X + 58, cursor.y);
  cursor.y += 8;
};

export const generateTdacQrPDF = async (
  application: Application
): Promise<Blob> => {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  await loadThaiFonts(pdf);
  
  const cursor: Cursor = { y: 0 };

  // ── Header band ─────────────────────────────────────────────────────
  pdf.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  pdf.rect(0, 0, PAGE_WIDTH, 34, "F");

  setText(pdf, [255, 255, 255], 22, "bold");
  pdf.text("TDAC", MARGIN_X, 15);

  setText(pdf, [200, 220, 255], 10);
  pdf.text("Thailand Driving Authority Certificate", MARGIN_X, 23);

  setText(pdf, [180, 200, 240], 8);
  pdf.text("Cross-Border Vehicle Road Tax Document", MARGIN_X, 30);

  const refNo = `TDAC-${(application.orderId || application.id).toUpperCase().slice(-8)}`;
  setText(pdf, [200, 220, 255], 8);
  pdf.text(`Ref: ${refNo}`, PAGE_WIDTH - MARGIN_X, 23, { align: "right" });
  pdf.text(`Issued: ${format(new Date(), "dd MMM yyyy")}`, PAGE_WIDTH - MARGIN_X, 30, { align: "right" });

  // Gold accent strip
  pdf.setFillColor(ACCENT_GOLD[0], ACCENT_GOLD[1], ACCENT_GOLD[2]);
  pdf.rect(0, 34, PAGE_WIDTH, 2, "F");

  cursor.y = 48;

  // ── Certificate title ────────────────────────────────────────────────
  setText(pdf, BRAND_BLUE, 14, "bold");
  pdf.text("ROAD TAX CLEARANCE CERTIFICATE", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 6;
  setText(pdf, TEXT_MUTED, 9);
  pdf.text("Valid for cross-border travel into the Kingdom of Thailand", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 12;

  // ── Policy information table ─────────────────────────────────────────
  const tableRows = 7;
  const tableH = tableRows * 8 + 4;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(LINE_LIGHT[0], LINE_LIGHT[1], LINE_LIGHT[2]);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN_X, cursor.y - 4, CONTENT_WIDTH, tableH, "FD");

  const depart = application.travel?.departDate
    ? format(application.travel.departDate, "dd MMM yyyy")
    : "-";
  const ret = application.travel?.returnDate
    ? format(application.travel.returnDate, "dd MMM yyyy")
    : "-";
  const duration =
    application.travel?.duration ||
    (application.travel?.days ? `${application.travel.days} Days` : "-");

  cursor.y += 2;
  infoRow(pdf, "Certificate Holder", application.name || "-", cursor);
  infoRow(pdf, "Phone Number", application.phone || "-", cursor);
  infoRow(pdf, "Vehicle Type", application.vehicleType || "-", cursor);
  infoRow(pdf, "Border Checkpoint", application.where || "-", cursor);
  infoRow(pdf, "Entry Date", depart, cursor);
  infoRow(pdf, "Return Date", ret, cursor);
  infoRow(pdf, "Coverage Duration", duration, cursor);
  cursor.y += 6;

  // ── QR Code ──────────────────────────────────────────────────────────
  const verifyUrl = `https://tdac.go.th/verify/${application.orderId || application.id}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1B3B6F", light: "#FFFFFF" },
    });
  } catch {
    qrDataUrl = "";
  }

  const qrSize = 58;
  const qrX = (PAGE_WIDTH - qrSize) / 2;

  // QR card background
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(LINE_LIGHT[0], LINE_LIGHT[1], LINE_LIGHT[2]);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(qrX - 6, cursor.y - 4, qrSize + 12, qrSize + 22, 3, 3, "FD");

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", qrX, cursor.y, qrSize, qrSize);
  }
  cursor.y += qrSize + 4;

  setText(pdf, TEXT_MUTED, 8);
  pdf.text("Scan to verify authenticity", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 4;
  setText(pdf, BRAND_BLUE, 7);
  pdf.text(verifyUrl, PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 14;

  // ── Total premium band ───────────────────────────────────────────────
  pdf.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  pdf.roundedRect(MARGIN_X, cursor.y, CONTENT_WIDTH, 16, 2, 2, "F");
  setText(pdf, [180, 200, 240], 9);
  pdf.text("Total Premium Paid", MARGIN_X + 5, cursor.y + 7);
  setText(pdf, [255, 255, 255], 14, "bold");
  pdf.text(
    formatPrice(application.totalPrice ?? 0),
    PAGE_WIDTH - MARGIN_X - 5,
    cursor.y + 10,
    { align: "right" }
  );
  cursor.y += 24;

  // ── Footer ───────────────────────────────────────────────────────────
  const ph = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(ACCENT_GOLD[0], ACCENT_GOLD[1], ACCENT_GOLD[2]);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, ph - 20, MARGIN_X + CONTENT_WIDTH, ph - 20);

  setText(pdf, TEXT_MUTED, 7);
  pdf.text(
    "Present this certificate at the border checkpoint. This document is auto-generated by ThaiDriveSecure.",
    MARGIN_X,
    ph - 14
  );
  pdf.text("TDAC — Thailand Driving Authority Certificate | tdac.go.th", MARGIN_X, ph - 9);
  pdf.text(
    `Order: ${application.orderId || application.id}`,
    PAGE_WIDTH - MARGIN_X,
    ph - 9,
    { align: "right" }
  );

  return pdf.output("blob");
};
