import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

export const Section = ({ icon: Icon, title, children }: SectionHeaderProps) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {title}
    </h3>
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">{children}</div>
  </div>
);
