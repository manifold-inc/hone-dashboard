import { Badge } from "@/components/ui/badge";

function getStatus(lastSeenAt: string): "active" | "stale" | "offline" {
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < 5 * 60 * 1000) return "active";
  if (diff < 30 * 60 * 1000) return "stale";
  return "offline";
}

const styles = {
  active: "bg-positive/15 text-positive border-positive/20",
  stale: "bg-warning/15 text-warning border-warning/20",
  offline: "bg-muted text-muted-foreground border-border",
} as const;

export function RunStatusBadge({ lastSeenAt }: { lastSeenAt: string }) {
  const status = getStatus(lastSeenAt);
  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  );
}
