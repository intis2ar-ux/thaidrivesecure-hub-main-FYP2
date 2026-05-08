import jsPDF from "jspdf";

let sarabunRegularBase64: string | null = null;
let sarabunBoldBase64: string | null = null;

const fetchFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load font from ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const loadThaiFonts = async (pdf: jsPDF) => {
  if (!sarabunRegularBase64) {
    // Determine base URL, works for both dev server and production
    const baseUrl = window.location.origin;
    sarabunRegularBase64 = await fetchFontAsBase64(`${baseUrl}/fonts/Sarabun-Regular.ttf`);
    sarabunBoldBase64 = await fetchFontAsBase64(`${baseUrl}/fonts/Sarabun-Bold.ttf`);
  }
  
  if (sarabunRegularBase64 && sarabunBoldBase64) {
    pdf.addFileToVFS("Sarabun-Regular.ttf", sarabunRegularBase64);
    pdf.addFont("Sarabun-Regular.ttf", "Sarabun", "normal", "Identity-H");
    
    pdf.addFileToVFS("Sarabun-Bold.ttf", sarabunBoldBase64);
    pdf.addFont("Sarabun-Bold.ttf", "Sarabun", "bold", "Identity-H");
  }
};
