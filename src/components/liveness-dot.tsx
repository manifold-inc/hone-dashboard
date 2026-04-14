"use client";

import { cn } from "@/lib/utils";
import { useHotkeyLiveness } from "./live-update-provider";

export function LivenessDot({ hotkey, className }: { hotkey: string; className?: string }) {
  const status = useHotkeyLiveness(hotkey);

  return (
    <span
      className={cn(
        "relative inline-block h-2.5 w-2.5 rounded-full",
        status === "online" ? "bg-positive" : "bg-muted-foreground/30",
        className
      )}
      title={status === "online" ? "Connected (live)" : "Offline"}
    >
      {status === "online" && (
        <span className="absolute inset-0 rounded-full bg-positive animate-ping opacity-40" />
      )}
    </span>
  );
}
