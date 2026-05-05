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

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
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
          <div className="relative bg-muted rounded-lg overflow-hidden h-[400px] flex items-center justify-center">
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
                    className="max-w-full max-h-[350px] object-contain rounded-lg shadow-lg"
                  />
                  {/* OCR Region Highlights */}
                  {showOCRRegions &&
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
                          title={`${field.label}: ${field.value}`}
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
          <div className="flex items-center justify-center gap-6 text-sm">
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
      </DialogContent>
    </Dialog>
  );
};