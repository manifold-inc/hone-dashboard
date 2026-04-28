"use client";

import * as React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { HealthVerdict, LossTrend } from "@/lib/derived-metrics";

export interface NetworkHealthProps {
  verdict: HealthVerdict;
  /** Validator-side loss reading: the network's headline number. */
  validatorLoss: { value: number | null; trend: LossTrend };
  /** Miner-side aggregated training loss reading. */
  innerLoss: { value: number | null; trend: LossTrend };
  /** Recent loss series for the inline sparkline. Oldest -> newest. */
  sparkline: { value: number | null }[];
  /** What the sparkline plots, for the screen-reader label only. */
  sparklineLabel?: string;
  className?: string;
}

const STATUS_TONE: Record<
  HealthVerdict["status"],
  { dot: string; bar: string; sparkStroke: string }
> = {
  healthy: {
    dot: "bg-signal",
    bar: "bg-signal",
    sparkStroke: "oklch(0.886 0.176 169.5)",
  },
  degraded: {
    dot: "bg-chart-warning",
    bar: "bg-chart-warning",
    sparkStroke: "oklch(0.72 0.14 25)",
  },
  stalled: {
    dot: "bg-negative",
    bar: "bg-negative",
    sparkStroke: "oklch(0.65 0.22 15)",
  },
  unknown: {
    dot: "bg-muted-foreground/40",
    bar: "bg-muted-foreground/30",
    sparkStroke: "oklch(0.55 0 0)",
  },
};

/**
 * Page-level fold-anchor for /network. The loss values ARE the headline:
 * a stranger lands here and sees the actual numbers, color-coded by
 * direction. The single most important thing on the page is whether the
 * model is getting better, so the loss number is the largest object.
 *
 * Anatomy: validator loss as the primary number, inner (miner-aggregated)
 * loss as the secondary number; both color-tinted by their own trend
 * (mint when falling, red when rising, neutral when flat) and both flash
 * briefly on change so the page feels live, not static. The verdict
 * sentence still appears below as supporting context. The sparkline on
 * the right backs the headline visually.
 */
export function NetworkHealth({
  verdict,
  validatorLoss,
  innerLoss,
  sparkline,
  sparklineLabel = "Validator loss, recent windows",
  className,
}: NetworkHealthProps) {
  const tone = STATUS_TONE[verdict.status];
  const data = React.useMemo(
    () =>
      sparkline.map((p, i) => ({
        i,
        value:
          p.value !== null && Number.isFinite(p.value) ? p.value : null,
      })),
    [sparkline],
  );

  const hasSparkline = data.some((p) => p.value !== null);
  const live = verdict.status !== "unknown" && verdict.status !== "stalled";

  return (
    <section
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 border-b border-border/60 pb-5 pt-1",
        className,
      )}
      aria-labelledby="network-health-label"
    >
      {/* Verdict-status tone bar + caps label + the paired headline values.
          The colored bar links the dot, the label, and the loss number
          into one visual unit. */}
      <div className="flex items-stretch gap-3">
        <span
          className={cn("w-[3px] shrink-0 rounded-full", tone.bar)}
          aria-hidden="true"
        />
        <div>
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            <span className="relative inline-flex h-1.5 w-1.5">
              {live && (
                <span
                  className={cn(
                    "absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping motion-reduce:opacity-0",
                    tone.dot,
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-block h-1.5 w-1.5 rounded-full",
                  tone.dot,
                )}
              />
            </span>
            <span id="network-health-label">Network</span>
          </p>

          {/* Paired headline. Validator loss is the primary number; inner
              loss sits beside it at smaller size. Each gets its own trend
              color and tick-flash, so a glance answers "is each side of
              the network learning right now?" */}
          <div className="mt-1 flex items-baseline gap-x-5 gap-y-1 flex-wrap">
            <FlashingLossValue
              label="Validator loss"
              value={validatorLoss.value}
              trend={validatorLoss.trend}
              size="lg"
            />
            <FlashingLossValue
              label="Miner loss"
              value={innerLoss.value}
              trend={innerLoss.trend}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Sentence column. */}
      <p className="self-center max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
        {verdict.sentence}
      </p>

      {/* Sparkline, right-aligned. */}
      <div
        className="row-span-2 col-start-3 hidden h-12 w-44 sm:block lg:w-60"
        aria-label={sparklineLabel}
      >
        {hasSparkline ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <YAxis hide domain={["auto", "auto"]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={tone.sparkStroke}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-end font-mono text-[10px] text-muted-foreground/60">
            no signal
          </div>
        )}
      </div>

      {/* Diagnostic chips beneath the sentence. */}
      <dl className="col-start-1 col-span-2 mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1 pl-[15px] font-mono text-[11px] text-muted-foreground">
        {verdict.signals.gatherSuccess !== null && (
          <Stat
            label="gather"
            value={`${verdict.signals.gatherSuccess.toFixed(1)}%`}
            valueClassName={
              verdict.signals.gatherSuccess >= 90
                ? "text-signal"
                : verdict.signals.gatherSuccess >= 80
                  ? "text-chart-warning"
                  : "text-negative"
            }
          />
        )}
        {verdict.signals.activeMiners !== null && (
          <Stat
            label="miners"
            value={verdict.signals.activeMiners.toLocaleString()}
          />
        )}
        <Stat
          label="slashes"
          value={
            verdict.signals.slashWindowSpan > 0
              ? `${verdict.signals.slashCount} / ${verdict.signals.slashWindowSpan}w`
              : `${verdict.signals.slashCount}`
          }
          valueClassName={
            verdict.signals.slashCount === 0
              ? "text-foreground"
              : verdict.signals.slashCount >= 5
                ? "text-negative"
                : "text-chart-warning"
          }
        />
      </dl>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FlashingLossValue
// ──────────────────────────────────────────────────────────────────────────────

const TREND_TONE: Record<
  LossTrend,
  { text: string; flashShadow: string; arrow: string | null }
> = {
  improving: {
    text: "text-signal",
    flashShadow: "0 0 18px oklch(0.886 0.176 169.5 / 60%)",
    arrow: "\u2193", // ↓
  },
  rising: {
    text: "text-negative",
    flashShadow: "0 0 18px oklch(0.65 0.22 15 / 65%)",
    arrow: "\u2191", // ↑
  },
  flat: {
    text: "text-foreground",
    flashShadow: "0 0 12px oklch(0.92 0 0 / 30%)",
    arrow: "\u2192", // →
  },
  unknown: {
    text: "text-muted-foreground",
    flashShadow: "none",
    arrow: null,
  },
};

interface FlashingLossValueProps {
  label: string;
  value: number | null;
  trend: LossTrend;
  size: "lg" | "sm";
}

/**
 * A single tabular-number loss readout that briefly glows whenever its
 * value changes (tick-flash). Glow color follows the trend so an incoming
 * worse reading flashes red and a better one flashes mint. Reduced-motion
 * users still get the trend color, just without the glow pulse.
 */
function FlashingLossValue({
  label,
  value,
  trend,
  size,
}: FlashingLossValueProps) {
  const tone = TREND_TONE[trend];
  const prevRef = React.useRef<number | null>(value);
  const [flashing, setFlashing] = React.useState(false);

  React.useEffect(() => {
    const prev = prevRef.current;
    // Only flash on a real value change, not on the first mount or on
    // null<->null transitions.
    if (
      value !== null &&
      prev !== null &&
      Number.isFinite(value) &&
      Number.isFinite(prev) &&
      value !== prev
    ) {
      setFlashing(true);
      const t = window.setTimeout(() => setFlashing(false), 700);
      prevRef.current = value;
      return () => window.clearTimeout(t);
    }
    prevRef.current = value;
  }, [value]);

  const valueText =
    value === null || !Number.isFinite(value)
      ? "\u2014"
      : value.toFixed(value < 1 ? 4 : 3);

  const sizeClass =
    size === "lg"
      ? "text-3xl sm:text-4xl"
      : "text-lg sm:text-xl text-muted-foreground";

  return (
    <div
      className="flex items-baseline gap-1.5"
      aria-live="polite"
      aria-label={`${label}: ${valueText}, ${trend}`}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60">
        {size === "lg" ? label : label.replace("Miner loss", "miner")}
      </span>
      <span
        className={cn(
          "font-mono font-semibold tabular-nums tracking-tight transition-[text-shadow,color] duration-150 motion-reduce:transition-none",
          sizeClass,
          tone.text,
        )}
        style={{
          textShadow: flashing ? tone.flashShadow : undefined,
        }}
      >
        {valueText}
      </span>
      {tone.arrow && (
        <span
          className={cn(
            "font-mono",
            size === "lg" ? "text-base sm:text-lg" : "text-xs sm:text-sm",
            tone.text,
          )}
          aria-hidden="true"
        >
          {tone.arrow}
        </span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="uppercase tracking-[0.15em] text-[9px] text-muted-foreground/70">
        {label}
      </dt>
      <dd className={cn("tabular-nums", valueClassName)}>{value}</dd>
    </div>
  );
}
