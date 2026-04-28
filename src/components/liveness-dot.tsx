"use client";

import { cn } from "@/lib/utils";
import { useHotkeyLiveness } from "./live-update-provider";

/**
 * Liveness indicator for a node by hotkey. Uses signal-mint when online
 * to match the rest of the live-data palette per DESIGN.md, and respects
 * prefers-reduced-motion: the ping ring fades to opacity-0 instead of
 * animating, color alone still communicates state.
 */
export function LivenessDot({ hotkey, className }: { hotkey: string; className?: string }) {
  const status = useHotkeyLiveness(hotkey);
  const online = status === "online";

  return (
    <span
      className={cn(
        "relative inline-block h-2.5 w-2.5 rounded-full",
        online ? "bg-signal" : "bg-muted-foreground/30",
        className,
      )}
      title={online ? "Connected (live)" : "Offline"}
      aria-label={online ? "Connected, live" : "Offline"}
    >
      {online && (
        <span className="absolute inset-0 rounded-full bg-signal opacity-40 motion-safe:animate-ping motion-reduce:opacity-0" />
      )}
    </span>
  );
}
