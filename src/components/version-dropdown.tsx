"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VersionInfo {
  version: string;
  count: number;
  latest: string;
}

interface VersionDropdownProps {
  title: string;
  versions: VersionInfo[];
  currentVersion: string | null;
  latestVersion: string | null;
  isLatest: boolean;
  onSelect: (version: string) => void;
}

export function VersionDropdown({
  title,
  versions,
  currentVersion,
  latestVersion,
  isLatest,
  onSelect,
}: VersionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2"
      >
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <svg
          className={cn(
            "mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:text-foreground",
            open && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
        {!isLatest && (
          <Badge variant="outline" className="text-[10px] text-warning">
            Historical
          </Badge>
        )}
      </button>

      {open && versions.length > 0 && (
        <div className="absolute left-0 z-50 mt-2 min-w-[220px] rounded-md border border-border/60 bg-card p-1 shadow-xl shadow-black/30 backdrop-blur-xl">
          {versions.map((v) => {
            const active = v.version === currentVersion;
            const isLt = v.version === latestVersion;
            return (
              <button
                key={v.version}
                onClick={() => {
                  onSelect(v.version);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <span className="font-mono font-medium">v{v.version}</span>
                {isLt && (
                  <Badge
                    variant="outline"
                    className="ml-auto border-primary/30 text-[9px] text-primary"
                  >
                    latest
                  </Badge>
                )}
                {!isLt && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {v.count} run{v.count !== 1 ? "s" : ""}
                  </span>
                )}
                {active && (
                  <svg
                    className="h-3 w-3 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
