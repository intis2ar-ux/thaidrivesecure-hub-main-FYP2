import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DocumentRequirement {
  name: string;
  description: string;
  required: boolean;
  notes?: string;
}

interface DocumentCategory {
  category: string;
  icon: React.ReactNode;
  documents: DocumentRequirement[];
}

const crossBorderRequirements: DocumentCategory[] = [
  {
    category: "Personal Identification",
    icon: <FileText className="h-4 w-4" />,
    documents: [
      {
        name: "Passport",
        description: "Valid passport with at least 6 months validity",
        required: true,
        notes: "Original and photocopy required at border",
      },
      {
        name: "Driving Licence",
        description: "Valid Malaysian driving licence",
        required: true,
        notes: "International Driving Permit (IDP) recommended for stays over 90 days",
      },
      {
        name: "Thai Driving Licence (if applicable)",
        description: "Required for residents or long-term stays",
        required: false,
        notes: "Must be obtained from Thai DLT office",
      },
    ],
  },
  {
    category: "Vehicle Documents",
    icon: <FileText className="h-4 w-4" />,
    documents: [
      {
        name: "Vehicle Registration (Geran/VOC)",
        description: "Original vehicle registration certificate",
        required: true,
        notes: "Must match the driver's name or have authorization letter",
      },
      {
        name: "Road Tax Disc",
        description: "Valid Malaysian road tax",
        required: true,
        notes: "Must be current and not expired",
      },
      {
        name: "PUSPAKOM Inspection Report",
        description: "Vehicle inspection certificate",
        required: false,
        notes: "May be required for commercial vehicles",
      },
    ],
  },
  {
    category: "Insurance Documents",
    icon: <FileText className="h-4 w-4" />,
    documents: [
      {
        name: "Thai Third-Party Bodily Injury (TPBI) Insurance",
        description: "Mandatory insurance for driving in Thailand",
        required: true,
        notes: "Minimum coverage as per Thai regulations. This is the primary policy issued by ThaiDriveSecure.",
      },
      {
        name: "Malaysian Motor Insurance",
        description: "Existing Malaysian motor insurance policy",
        required: true,
        notes: "Coverage extension may be available for cross-border",
      },
      {
        name: "Personal Accident Insurance",
        description: "Optional coverage for driver and passengers",
        required: false,
        notes: "Recommended for comprehensive protection",
      },
    ],
  },
  {
    category: "Border Crossing Permits",
    icon: <FileText className="h-4 w-4" />,
    documents: [
      {
        name: "Temporary Import Permit (TM2/TM3)",
        description: "Thai customs permit for temporary vehicle import",
        required: true,
        notes: "TM2 for 30 days, TM3 for extended stays. Obtained at border checkpoint.",
      },
      {
        name: "Customs Declaration Form",
        description: "Declaration of vehicle and personal items",
        required: true,
        notes: "Completed at both Malaysian and Thai checkpoints",
      },
      {
        name: "Letter of Authorization",
        description: "Required if vehicle is not registered in driver's name",
        required: false,
        notes: "Must be notarized if owner is not traveling with vehicle",
      },
    ],
  },
];

interface DocumentReferenceProps {
  compact?: boolean;
  highlightMissing?: string[];
}

export const DocumentReference: React.FC<DocumentReferenceProps> = ({
  compact = false,
  highlightMissing = [],
}) => {
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Required Documents Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <Accordion type="single" collapsible className="w-full">
              {crossBorderRequirements.map((category, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span>{category.category}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {category.documents.filter((d) => d.required).length} required
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pl-6">
                      {category.documents.map((doc, docIdx) => {
                        const isMissing = highlightMissing.includes(doc.name);
                        return (
                          <li
                            key={docIdx}
                            className={`text-sm flex items-start gap-2 ${
                              isMissing ? "text-destructive" : ""
                            }`}
                          >
                            {doc.required ? (
                              isMissing ? (
                                <AlertTriangle className="h-3 w-3 mt-1 text-destructive shrink-0" />
                              ) : (
                                <CheckCircle className="h-3 w-3 mt-1 text-success shrink-0" />
                              )
                            ) : (
                              <Info className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                            )}
                            <span>
                              {doc.name}
                              {!doc.required && (
                                <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Required Documents for Malaysia → Thailand Vehicle Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {crossBorderRequirements.map((category, idx) => (
          <div key={idx}>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              {category.icon}
              {category.category}
            </h3>
            <div className="space-y-3">
              {category.documents.map((doc, docIdx) => {
                const isMissing = highlightMissing.includes(doc.name);
                return (
                  <div
                    key={docIdx}
                    className={`p-3 rounded-lg border ${
                      isMissing
                        ? "border-destructive/30 bg-destructive/5"
                        : doc.required
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {doc.required ? (
                          isMissing ? (
                            <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                          )
                        ) : (
                          <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {doc.description}
                          </p>
                          {doc.notes && (
                            <p className="text-xs text-primary mt-1 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              {doc.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={doc.required ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {doc.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            {idx < crossBorderRequirements.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
          <h4 className="font-medium text-sm flex items-center gap-2 text-accent">
            <ExternalLink className="h-4 w-4" />
            Additional Resources
          </h4>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>• Thai Immigration Bureau: www.immigration.go.th</li>
            <li>• Malaysian Immigration Department: www.imi.gov.my</li>
            <li>• Thai Customs: www.customs.go.th</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentReference;
