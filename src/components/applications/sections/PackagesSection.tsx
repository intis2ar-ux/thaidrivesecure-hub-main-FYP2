import { Shield, Package } from "lucide-react";
import { Application } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Section } from "./SectionHeader";

interface Props {
  application: Application;
}

export const PackagesSection = ({ application }: Props) => (
  <Section icon={Shield} title="Packages">
    {application.packages && application.packages.length > 0 ? (
      <div className="space-y-2">
        {application.packages.map((pkg) => (
          <div key={pkg} className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-accent" />
            <Badge variant="outline" className="border-accent text-accent bg-accent/5">
              {pkg}
            </Badge>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No packages</p>
    )}
  </Section>
);
