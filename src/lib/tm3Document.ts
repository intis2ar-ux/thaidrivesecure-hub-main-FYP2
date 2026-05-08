import jsPDF from "jspdf";
import { format } from "date-fns";
import { Application, AiVerificationData } from "@/types";

const BRAND_BLUE: [number, number, number] = [27, 59, 111];
const RED_TH: [number, number, number] = [165, 28, 28];
const TEXT_DARK: [number, number, number] = [33, 37, 41];
const TEXT_MUTED: [number, number, number] = [108, 117, 125];
const LINE_LIGHT: [number, number, number] = [224, 228, 234];
const BG_FIELD: [number, number, number] = [250, 251, 253];

const MARGIN_X = 14;
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
  pdf.setFont("helvetica", style);
};

const box = (
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h = 14
) => {
  pdf.setFillColor(BG_FIELD[0], BG_FIELD[1], BG_FIELD[2]);
  pdf.setDrawColor(LINE_LIGHT[0], LINE_LIGHT[1], LINE_LIGHT[2]);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, w, h, "FD");
  setText(pdf, TEXT_MUTED, 7);
  pdf.text(label, x + 2, y + 5);
  setText(pdf, TEXT_DARK, 10, "bold");
  pdf.text(value || "", x + 2, y + 11);
};

const sectionBar = (
  pdf: jsPDF,
  en: string,
  th: string,
  cursor: Cursor
) => {
  pdf.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  pdf.rect(MARGIN_X, cursor.y, CONTENT_WIDTH, 8, "F");
  setText(pdf, [255, 255, 255], 9, "bold");
  pdf.text(en, MARGIN_X + 3, cursor.y + 5.5);
  setText(pdf, [180, 210, 255], 8);
  pdf.text(th, PAGE_WIDTH - MARGIN_X - 3, cursor.y + 5.5, { align: "right" });
  cursor.y += 11;
};

const ocr = (data: Record<string, { value: string }>, keys: string[]): string => {
  for (const k of keys) {
    const v = data[k]?.value;
    if (v && v.trim()) return v.trim();
  }
  return "";
};

// ─────────────────────────────────────────────────────────────────────────────
export const generateTm3PDF = (
  application: Application,
  ocrData?: AiVerificationData
): Blob => {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const cursor: Cursor = { y: 0 };

  const vg = ocrData?.vehicleGrantData || {};
  const p  = ocrData?.passportData    || {};

  // ── Thai flag header ─────────────────────────────────────────────────
  const stripes: [number, number, number][] = [
    RED_TH, [255, 255, 255], BRAND_BLUE, [255, 255, 255], RED_TH,
  ];
  stripes.forEach((col, i) => {
    pdf.setFillColor(col[0], col[1], col[2]);
    pdf.rect(0, i * 7, PAGE_WIDTH, 7, "F");
  });

  // TM.3 badge
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(PAGE_WIDTH - 40, 4, 26, 16, 2, 2, "F");
  setText(pdf, BRAND_BLUE, 16, "bold");
  pdf.text("TM.3", PAGE_WIDTH - 27, 15, { align: "center" });

  cursor.y = 44;

  // ── Title ────────────────────────────────────────────────────────────
  setText(pdf, BRAND_BLUE, 16, "bold");
  pdf.text("VEHICLE ENTRY DECLARATION", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 6;
  setText(pdf, TEXT_MUTED, 10);
  pdf.text("Customs Vehicle Entry Form", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 5;
  setText(pdf, TEXT_MUTED, 8);
  pdf.text("Customs Department • Royal Thai Government", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  cursor.y += 12;

  // ── Extract fields ───────────────────────────────────────────────────
  // Driver (from passport OCR → application name fallback)
  const givenName  = ocr(p, ["Given Name", "First Name", "Given Names"]);
  const familyName = ocr(p, ["Family Name", "Last Name", "Surname"]);
  const driverName = (givenName && familyName) ? `${givenName} ${familyName}` : application.name;

  // Vehicle (from vehicle grant OCR)
  const regNumber = ocr(vg, [
    "Registration Number", "Plate Number", "Vehicle Registration", "Reg No",
    "License Plate", "No. Pendaftaran", "No Pendaftaran",
  ]);
  const chassisNo = ocr(vg, [
    "Chassis Number", "VIN", "Frame Number", "No. Casis", "No Casis",
    "Engine Number", "No. Enjin", "No Enjin",
  ]);
  const engineNo  = ocr(vg, [
    "Engine Number", "No. Enjin", "No Enjin",
  ]);
  const vehicleMake = ocr(vg, ["Make", "Brand", "Manufacturer", "Jenama"]);
  const vehicleModel = ocr(vg, ["Model", "Type", "Jenis"]);
  const vehicleColor = ocr(vg, ["Colour", "Color", "Warna"]);

  const entryDate  = application.travel?.departDate
    ? format(application.travel.departDate, "dd/MM/yyyy")
    : "";
  const returnDate = application.travel?.returnDate
    ? format(application.travel.returnDate, "dd/MM/yyyy")
    : "";
  const duration   =
    application.travel?.duration ||
    (application.travel?.days ? `${application.travel.days} Days` : "");
  const borderRoute = application.where || "";

  const halfW  = (CONTENT_WIDTH - 4) / 2;
  const thirdW = (CONTENT_WIDTH - 8) / 3;

  // ── SECTION 1: Driver Information ────────────────────────────────────
  sectionBar(pdf, "SECTION 1 — DRIVER INFORMATION", "", cursor);

  box(pdf, "Driver Full Name", driverName, MARGIN_X, cursor.y, CONTENT_WIDTH);
  cursor.y += 16;

  const passportNo = ocr(p, ["Passport Number", "Document Number", "Passport No", "Number"]);
  const nationality = ocr(p, ["Nationality", "Country"]) || "Malaysian";
  box(pdf, "Passport No.", passportNo, MARGIN_X, cursor.y, halfW);
  box(pdf, "Nationality", nationality, MARGIN_X + halfW + 4, cursor.y, halfW);
  cursor.y += 16;

  // ── SECTION 2: Vehicle Details ────────────────────────────────────────
  sectionBar(pdf, "SECTION 2 — VEHICLE DETAILS", "", cursor);

  box(pdf, "Vehicle Type", application.vehicleType || "", MARGIN_X, cursor.y, thirdW);
  box(pdf, "Make", vehicleMake, MARGIN_X + thirdW + 4, cursor.y, thirdW);
  box(pdf, "Model", vehicleModel, MARGIN_X + (thirdW + 4) * 2, cursor.y, thirdW);
  cursor.y += 16;

  box(pdf, "Registration No.", regNumber, MARGIN_X, cursor.y, halfW);
  box(pdf, "Colour", vehicleColor, MARGIN_X + halfW + 4, cursor.y, halfW);
  cursor.y += 16;

  box(pdf, "Chassis / Frame No.", chassisNo, MARGIN_X, cursor.y, halfW);
  box(pdf, "Engine No.", engineNo, MARGIN_X + halfW + 4, cursor.y, halfW);
  cursor.y += 16;

  box(pdf, "Country of Registration", "Malaysia", MARGIN_X, cursor.y, halfW);
  box(pdf, "Passengers", String(application.passengers ?? 1), MARGIN_X + halfW + 4, cursor.y, halfW);
  cursor.y += 16;

  // ── SECTION 3: Entry Details ──────────────────────────────────────────
  sectionBar(pdf, "SECTION 3 — ENTRY DETAILS", "", cursor);

  box(pdf, "Border Checkpoint", borderRoute, MARGIN_X, cursor.y, halfW);
  box(pdf, "Date of Entry", entryDate, MARGIN_X + halfW + 4, cursor.y, halfW);
  cursor.y += 16;

  box(pdf, "Expected Return Date", returnDate, MARGIN_X, cursor.y, halfW);
  box(pdf, "Period of Stay", duration, MARGIN_X + halfW + 4, cursor.y, halfW);
  cursor.y += 16;

  // Purpose checkboxes
  setText(pdf, TEXT_MUTED, 8);
  pdf.text("Purpose of Entry:", MARGIN_X, cursor.y + 1);
  cursor.y += 7;
  const purposes = ["☑ Tourism", "☐ Business", "☐ Transit", "☐ Other"];
  const pw = CONTENT_WIDTH / 4;
  purposes.forEach((label, i) => {
    setText(pdf, TEXT_DARK, 9);
    pdf.text(label, MARGIN_X + i * pw, cursor.y);
  });
  cursor.y += 12;

  // ── SECTION 4: Declaration ────────────────────────────────────────────
  sectionBar(pdf, "SECTION 4 — DECLARATION", "", cursor);

  setText(pdf, TEXT_MUTED, 8);
  pdf.text(
    "I hereby declare that the above information is true and correct. I understand that providing false information is an offence.",
    MARGIN_X,
    cursor.y,
    { maxWidth: CONTENT_WIDTH }
  );
  cursor.y += 12;

  const sigW = 70;
  pdf.setDrawColor(LINE_LIGHT[0], LINE_LIGHT[1], LINE_LIGHT[2]);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_X, cursor.y + 10, MARGIN_X + sigW, cursor.y + 10);
  pdf.line(PAGE_WIDTH - MARGIN_X - sigW, cursor.y + 10, PAGE_WIDTH - MARGIN_X, cursor.y + 10);
  setText(pdf, TEXT_MUTED, 8);
  pdf.text("Driver Signature", MARGIN_X, cursor.y + 14);
  pdf.text("Date", PAGE_WIDTH - MARGIN_X - sigW, cursor.y + 14);

  // ── Footer ────────────────────────────────────────────────────────────
  const ph = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(RED_TH[0], RED_TH[1], RED_TH[2]);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, ph - 18, MARGIN_X + CONTENT_WIDTH, ph - 18);

  setText(pdf, TEXT_MUTED, 7);
  pdf.text(
    "This form is auto-generated by ThaiDriveSecure for cross-border vehicle entry documentation.",
    MARGIN_X,
    ph - 12
  );
  pdf.text(
    `Order Ref: ${application.orderId || application.id} | Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`,
    MARGIN_X,
    ph - 7
  );

  return pdf.output("blob");
};
