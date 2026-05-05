import { FileText, Eye } from "lucide-react";
import { Application } from "@/types";
import { Section } from "./SectionHeader";

interface Props {
  application: Application;
  onPreview: (preview: { url: string; title: string }) => void;
}

export const DocumentsSection = ({ application, onPreview }: Props) => (
  <Section icon={FileText} title="Documents">
    {application.documents?.passportUrls && application.documents.passportUrls.length > 0 ? (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Passport Documents</p>
        {application.documents.passportUrls.map((url, index) => (
          <button
            key={index}
            onClick={() => onPreview({ url, title: `Passport ${index + 1}` })}
            className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            Passport {index + 1}
          </button>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No passport documents</p>
    )}

    {application.documents?.vehicleGrantUrl ? (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Vehicle Grant</p>
        <button
          onClick={() => onPreview({ url: application.documents!.vehicleGrantUrl!, title: "Vehicle Grant" })}
          className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" />
          View Vehicle Grant
        </button>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No vehicle grant document</p>
    )}
  </Section>
);
