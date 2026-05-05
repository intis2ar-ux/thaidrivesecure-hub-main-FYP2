import { MapPin, Calendar, Clock, CalendarCheck } from "lucide-react";
import { Application } from "@/types";
import { Section } from "./SectionHeader";

interface Props {
  application: Application;
}

const formatDate = (date?: Date) =>
  date
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

export const TripSection = ({ application }: Props) => {
  const { travel } = application;
  const departLabel = formatDate(travel?.departDate);
  const returnLabel = formatDate(travel?.returnDate);
  const durationLabel =
    travel?.duration ||
    (travel?.days ? `${travel.days} ${travel.days === 1 ? "Day" : "Days"}` : "-");

  return (
    <Section icon={MapPin} title="Trip Details">
      <div className="flex items-start gap-3">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-xs text-muted-foreground">Border Route</p>
          <p className="font-medium text-foreground">{application.where || "-"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Depart Date</p>
            <p className="font-medium text-foreground">{departLabel}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CalendarCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Return Date</p>
            <p className="font-medium text-foreground">{returnLabel}</p>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-medium text-foreground">{durationLabel}</p>
        </div>
      </div>
    </Section>
  );
};
