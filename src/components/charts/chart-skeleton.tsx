"use client";

import { cn } from "@/lib/utils";

export interface ChartSkeletonProps {
  /** Container height. Matches the height the actual chart will render at. */
  height?: number;
  /** Top-left state copy ("Loading 4 miners…", etc.). */
  status?: string;
  /** Optional lower caption. */
  hint?: string;
  /** Visual mode. ``loading`` shimmers; ``empty`` is static. */
  variant?: "loading" | "empty";
  className?: string;
}

const BAR_HEIGHTS = [38, 62, 48, 70, 55, 80, 60, 72, 50, 78, 65, 82];

/**
 * Skeleton state for chart components. Looks like a chart's silhouette so
 * the user understands what's coming, instead of a generic spinner. The
 * shimmer respects prefers-reduced-motion.
 *
 * Per the Pulse-Means-Live Rule (DESIGN.md), a pulsing mint dot is
 * reserved for *confirmed live data*. Loading is a different state; it
 * gets its own visual.
 */
export function ChartSkeleton({
  height = 240,
  status,
  hint,
  variant = "loading",
  className,
}: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-md",
        className,
      )}
      style={{ height }}
      role={variant === "loading" ? "status" : undefined}
      aria-live={variant === "loading" ? "polite" : undefined}
      aria-label={
        variant === "loading"
          ? status ?? "Loading chart data"
          : status ?? "No data"
      }
    >
      <div className="flex items-end gap-1 px-1 pb-3 pt-1 flex-1">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm bg-foreground/[0.045]",
              variant === "loading" &&
                "motion-safe:animate-[chart-skeleton-pulse_1.6s_ease-in-out_infinite]",
            )}
            style={{
              height: `${h}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-1 pb-1 text-[10px] font-mono text-muted-foreground/70">
        {status && (
          <span className="uppercase tracking-[0.15em]">{status}</span>
        )}
        {hint && <span>{hint}</span>}
      </div>
      <style>{`
        @keyframes chart-skeleton-pulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
