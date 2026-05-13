import { FileText, Eye, RefreshCw } from "lucide-react";
import { Application } from "@/types";
import { Section } from "./SectionHeader";
import { Button } from "@/components/ui/button";

interface Props {
  application: Application;
  onPreview: (preview: { url: string; title: string }) => void;
  onReupload: (type: "passport" | "vehicle_grant") => void;
}

export const DocumentsSection = ({ application, onPreview, onReupload }: Props) => (
  <Section icon={FileText} title="Documents">
    <div className="space-y-6">
      {/* Passport Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Passport Documents</p>
          {application.documents?.passportUrls && application.documents.passportUrls.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] text-muted-foreground hover:text-destructive gap-1"
              onClick={() => onReupload("passport")}
            >
              <RefreshCw className="h-3 w-3" />
              Request Re-upload
            </Button>
          )}
        </div>
        
        {application.documents?.passportUrls && application.documents.passportUrls.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {application.documents.passportUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => onPreview({ url, title: `Passport ${index + 1}` })}
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer w-fit"
              >
                <Eye className="h-3.5 w-3.5" />
                Passport {index + 1}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No passport documents uploaded</p>
        )}
      </div>

      {/* Vehicle Grant Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vehicle Grant</p>
          {application.documents?.vehicleGrantUrl && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] text-muted-foreground hover:text-destructive gap-1"
              onClick={() => onReupload("vehicle_grant")}
            >
              <RefreshCw className="h-3 w-3" />
              Request Re-upload
            </Button>
          )}
        </div>

        {application.documents?.vehicleGrantUrl ? (
          <button
            onClick={() => onPreview({ url: application.documents!.vehicleGrantUrl!, title: "Vehicle Grant" })}
            className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer w-fit"
          >
            <Eye className="h-3.5 w-3.5" />
            View Vehicle Grant
          </button>
        ) : (
          <p className="text-sm text-muted-foreground italic">No vehicle grant document uploaded</p>
        )}
      </div>
    </div>
  </Section>
);
