"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VersionInfo {
  version: string;
  count: number;
  latest: string;
  modelSize?: string | null;
}

export interface ProjectOption {
  project: string;
  versionCount: number;
}

interface VersionDropdownProps {
  title: string;
  versions: VersionInfo[];
  currentVersion: string | null;
  latestVersion: string | null;
  isLatest: boolean;
  onSelect: (version: string) => void;
  projects?: ProjectOption[];
  currentProject?: string | null;
  onSelectProject?: (project: string) => void;
}

export function VersionDropdown({
  title,
  versions,
  currentVersion,
  latestVersion,
  isLatest,
  onSelect,
  projects,
  currentProject,
  onSelectProject,
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

  const showProjects = !!(projects && projects.length > 0 && onSelectProject);

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

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[320px] rounded-md border border-border/60 bg-card p-2 shadow-xl shadow-black/30 backdrop-blur-xl">
          {showProjects && (
            <div className="mb-2">
              <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Project
              </div>
              <div className="flex flex-wrap gap-1">
                {projects!.map((p) => {
                  const active = p.project === currentProject;
                  return (
                    <button
                      key={p.project}
                      onClick={() => {
                        onSelectProject!(p.project);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1 font-mono text-xs transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {p.project}
                      <span
                        className={cn(
                          "ml-1.5 text-[9px]",
                          active ? "opacity-70" : "opacity-50"
                        )}
                      >
                        {p.versionCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {versions.length > 0 && (
            <div>
              <div className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Version
              </div>
              <div className="max-h-64 overflow-y-auto">
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
                      {v.modelSize && (
                        <span className="text-[10px] text-muted-foreground/80">
                          {v.modelSize}
                        </span>
                      )}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
