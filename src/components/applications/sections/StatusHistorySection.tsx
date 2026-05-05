import { useEffect, useState } from "react";
import { History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Section } from "./SectionHeader";

interface StatusLog {
  id: string;
  action: string;
  previousStatus: string;
  notes: string;
  performedBy: string;
  timestamp: Date;
}

interface Props {
  applicationId: string;
}

export const StatusHistorySection = ({ applicationId }: Props) => {
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "orders", applicationId, "status_logs"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: StatusLog[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            action: data.action || "",
            previousStatus: data.previousStatus || "",
            notes: data.notes || "",
            performedBy: data.performedBy || "",
            timestamp:
              data.timestamp instanceof Timestamp
                ? data.timestamp.toDate()
                : new Date(data.timestamp),
          };
        });
        setStatusLogs(logs);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [applicationId]);

  return (
    <Section icon={History} title="Status History">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : statusLogs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No status changes recorded</p>
      ) : (
        <div className="space-y-3">
          {statusLogs.map((log) => (
            <div key={log.id} className="relative pl-4 border-l-2 border-border pb-3 last:pb-0">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-primary" />
              <div className="flex items-center gap-2 flex-wrap">
                {log.previousStatus && (
                  <>
                    <StatusBadge variant={log.previousStatus as any}>{log.previousStatus}</StatusBadge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </>
                )}
                <StatusBadge variant={log.action as any}>{log.action}</StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                by <span className="font-medium text-foreground">{log.performedBy}</span>
                {" · "}
                {format(log.timestamp, "dd MMM yyyy, HH:mm")}
              </p>
              {log.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic bg-muted/50 rounded px-2 py-1">
                  "{log.notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};
