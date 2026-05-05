import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export const DocumentPreviewModal = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}: DocumentPreviewModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setZoom(1);
      setRotation(0);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex items-center justify-between p-3 pr-10 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} disabled={zoom <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} disabled={zoom >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-auto flex items-center justify-center bg-black/5 min-h-[400px] max-h-[calc(90vh-60px)]">
          <img
            src={imageUrl}
            alt={title}
            className="transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: zoom <= 1 ? "100%" : "none",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                '<p class="text-sm text-muted-foreground p-8">Unable to load image. The file may not be accessible.</p>';
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
