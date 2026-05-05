import { User, Phone, Car, Users } from "lucide-react";
import { Application } from "@/types";
import { Section } from "./SectionHeader";

interface Props {
  application: Application;
}

const Field = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | number }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value || "-"}</p>
    </div>
  </div>
);

export const CustomerSection = ({ application }: Props) => (
  <Section icon={User} title="Customer Details">
    <Field icon={User} label="Full Name" value={application.name} />
    <Field icon={Phone} label="Phone Number" value={application.phone || "-"} />
    <Field icon={Car} label="Vehicle Type" value={application.vehicleType || "-"} />
    <Field icon={Users} label="Passengers" value={application.passengers} />
  </Section>
);
