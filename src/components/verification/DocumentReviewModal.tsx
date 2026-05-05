import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  Maximize2,
} from "lucide-react";
import { AIVerification } from "@/types";
import { cn } from "@/lib/utils";

interface DocumentReviewModalProps {
  verification: AIVerification | null;
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
}

export const DocumentReviewModal = ({
  verification,
  isOpen,
  onClose,
  customerName,
}: DocumentReviewModalProps) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showOCRRegions, setShowOCRRegions] = useState(true);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (verification?.documentImageUrl) {
      const link = document.createElement("a");
      link.href = verification.documentImageUrl;
      link.download = `document_${verification.id}.png`;
      link.click();
    }
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

  if (!verification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Preview - {getDocumentTypeLabel(verification.documentType)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Left Column: Document Preview */}
          <div className="md:col-span-2 space-y-4 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="w-32">
                  <Slider
                    value={[zoom]}
                    onValueChange={(val) => setZoom(val[0])}
                    min={50}
                    max={200}
                    step={10}
                  />
                </div>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">{zoom}%</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant={showOCRRegions ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOCRRegions(!showOCRRegions)}
                  className={showOCRRegions ? "bg-accent text-accent-foreground" : ""}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  OCR Regions
                </Button>
                <Button variant="outline" size="icon" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Document Preview Area */}
            <div className="relative bg-muted rounded-lg overflow-hidden flex-1 flex items-center justify-center min-h-0">
              <div
                className="relative transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              >
                {verification.documentImageUrl ? (
                  <div className="relative">
                    <img
                      src={verification.documentImageUrl}
                      alt="Document"
                      className="max-w-full max-h-[450px] object-contain rounded-lg shadow-lg"
                    />
                    {/* OCR Region Highlights */}
                    {showOCRRegions &&
                      verification.extractedFields &&
                      verification.extractedFields
                        .filter((f) => f.ocrRegion)
                        .map((field, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "absolute border-2 rounded transition-all",
                              field.confidence >= 0.85
                                ? "border-success bg-success/10"
                                : field.confidence >= 0.7
                                ? "border-warning bg-warning/10"
                                : "border-destructive bg-destructive/10"
                            )}
                            style={{
                              left: `${field.ocrRegion!.x}%`,
                              top: `${field.ocrRegion!.y}%`,
                              width: `${field.ocrRegion!.width}%`,
                              height: `${field.ocrRegion!.height}%`,
                            }}
                            title={`${(field as any).label || (field as any).fieldName}: ${(field as any).value || (field as any).extractedValue}`}
                          />
                        ))}
                  </div>
                ) : (
                  <div className="w-80 h-60 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <FileText className="h-10 w-10 text-primary" />
                    </div>
                    <p className="font-semibold text-lg">
                      {getDocumentTypeLabel(verification.documentType)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {customerName || "Document Preview"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ID: {verification.documentId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-success bg-success/10" />
                <span className="text-muted-foreground">High Confidence (≥85%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-warning bg-warning/10" />
                <span className="text-muted-foreground">Medium (70-84%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-destructive bg-destructive/10" />
                <span className="text-muted-foreground">Low (&lt;70%)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Extracted Fields */}
          <div className="md:col-span-1 flex flex-col min-h-0 border-l pl-6 overflow-hidden">
            <h4 className="font-semibold text-base mb-4 shrink-0 flex items-center justify-between">
              Extracted Fields
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {verification.extractedFields?.length || 0} fields
              </span>
            </h4>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-thin">
              {verification.extractedFields && verification.extractedFields.length > 0 ? (
                verification.extractedFields.map((field, idx) => {
                  // Handle both old and new field structures from the database
                  const f = field as any;
                  const label = f.label || f.fieldName || "Unknown Field";
                  const value = f.value || f.extractedValue || "-";
                  const confidence = field.confidence ?? 0;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          {label}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          confidence >= 0.85 ? "bg-success/10 text-success" : 
                          confidence >= 0.7 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                        )}>
                          {(confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-muted/30 rounded-md border p-2 hover:bg-muted/50 transition-colors group">
                        <span className="text-sm font-medium break-all mr-2">{value}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(value);
                          }}
                          title="Copy to clipboard"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No fields extracted</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};