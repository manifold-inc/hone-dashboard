"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

interface Series {
  key: string;
  label: string;
  color?: string;
  /** Render as a dashed line (for reference / band edges). */
  dashed?: boolean;
  /** Lighter stroke (default 1.5). */
  strokeWidth?: number;
}

/**
 * Y-axis unit / formatter hint. Default ("number") preserves the existing
 * heuristic. Use "%" for percentages already in 0-100, "pp" for percentage
 * points (signed deltas, also 0-100 scale), "loss" for cross-entropy losses
 * (more decimals at small values), and "ms" / "s" for timing.
 */
export type YUnit = "number" | "%" | "pp" | "loss" | "ms" | "s" | "bytes";

/**
 * X-axis interpretation:
 *
 *  - ``auto`` (default, backwards-compatible): if the data has ``createdAt``
 *    use it as a timestamp axis; otherwise read ``xKey`` as a numeric/category
 *    field. Existing callers that don't think about the X axis get this.
 *  - ``time``: force timestamp from ``createdAt``, ticks are HH:MM, tooltip
 *    label is locale time.
 *  - ``step``: read ``xKey`` directly and treat as a continuous numeric axis
 *    (training progress). Ticks reuse the number formatter ("142k", "2.1M");
 *    tooltip renders e.g. ``step 142,883``. Use this for loss curves where
 *    wall clock would mask training pauses and rate changes.
 *  - ``category``: read ``xKey`` directly, raw stringified ticks, tooltip
 *    label is ``{xKey} {value}``. Use for benchmark-task-style data where
 *    each X is a discrete window/checkpoint id.
 */
export type XMode = "auto" | "time" | "step" | "category";

interface TimeSeriesChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  series: Series[];
  xKey?: string;
  height?: number;
  yUnit?: YUnit;
  /** Force the Y-domain. Useful for percentages that should hit 0/100. */
  yDomain?: [number | "auto", number | "auto"];
  /** Draw a horizontal reference line (e.g. zero baseline for deltas). */
  referenceY?: number;
  xMode?: XMode;
}

/**
 * Default mint-family palette cycled through unnamed series. All four
 * stay inside the data-viz mint family per the Two-Palette Rule.
 */
const MONO_PALETTE = [
  "oklch(0.886 0.176 169.5)", // signal mint
  "oklch(0.55 0.13 170)", // mint deep
  "oklch(0.74 0.16 167)", // mint true
  "oklch(0.93 0.13 170)", // mint light
];

/**
 * Named emphasis roles for charts. Note ``warning`` lives in coral-rose
 * (hue ~25), deliberately OUTSIDE the action-amber band (hue 62) so it
 * cannot be confused with a clickable element.
 */
const EMPHASIS_COLORS: Record<string, string> = {
  positive: "oklch(0.886 0.176 169.5)",
  negative: "oklch(0.65 0.22 15)",
  warning: "oklch(0.72 0.14 25)",
  random: "oklch(0.7 0.12 220)",
  "random-deep": "oklch(0.55 0.14 220)",
};

function resolveColor(color: string | undefined, index: number): string {
  if (color && EMPHASIS_COLORS[color]) return EMPHASIS_COLORS[color];
  if (color) return color;
  return MONO_PALETTE[index % MONO_PALETTE.length];
}

function formatTimeTick(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatY(v: number, unit: YUnit): string {
  if (!Number.isFinite(v)) return "\u2014";
  switch (unit) {
    case "%":
      return `${v.toFixed(v >= 100 || v <= -100 ? 0 : 1)}%`;
    case "pp":
      return `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`;
    case "loss":
      return v.toFixed(v < 1 ? 4 : 3);
    case "ms":
      return `${v.toFixed(0)}ms`;
    case "s":
      return v >= 60 ? `${(v / 60).toFixed(1)}m` : `${v.toFixed(1)}s`;
    case "bytes":
      if (Math.abs(v) >= 1024 * 1024)
        return `${(v / (1024 * 1024)).toFixed(1)}MB`;
      if (Math.abs(v) >= 1024) return `${(v / 1024).toFixed(1)}KB`;
      return `${v.toFixed(0)}B`;
    case "number":
    default:
      if (Math.abs(v) >= 1_000_000)
        return `${(v / 1_000_000).toFixed(1)}M`;
      if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
      return v.toPrecision(4);
  }
}

function formatTooltipValue(v: number, unit: YUnit): string {
  if (!Number.isFinite(v)) return "\u2014";
  switch (unit) {
    case "%":
      return `${v.toFixed(2)}%`;
    case "pp":
      return `${v >= 0 ? "+" : ""}${v.toFixed(2)}pp`;
    case "loss":
      return v.toFixed(5);
    case "ms":
      return `${v.toFixed(2)}ms`;
    case "s":
      return `${v.toFixed(2)}s`;
    case "bytes":
      return formatY(v, "bytes");
    case "number":
    default:
      return v.toPrecision(5);
  }
}

export function TimeSeriesChart({
  data,
  series,
  xKey = "window",
  height = 300,
  yUnit = "number",
  yDomain,
  referenceY,
  xMode = "auto",
}: TimeSeriesChartProps) {
  // Resolve the effective interpretation of the X axis. ``auto`` falls back
  // to the legacy "createdAt wins" behavior so unmigrated callers don't
  // change visually; explicit modes always win.
  const effectiveMode: Exclude<XMode, "auto"> = useMemo(() => {
    if (xMode !== "auto") return xMode;
    return data.length > 0 && data[0]?.createdAt != null ? "time" : "category";
  }, [xMode, data]);

  const chartData = useMemo(() => {
    return data.map((d, i) => {
      let xValue: number;
      if (effectiveMode === "time") {
        xValue = d.createdAt
          ? Math.floor(new Date(d.createdAt).getTime() / 1000)
          : i;
      } else {
        const raw = d[xKey];
        xValue = typeof raw === "number" ? raw : Number(raw ?? i);
      }
      const row: Record<string, unknown> = { _ts: xValue };
      for (const s of series) {
        row[s.key] = d[s.key] ?? null;
      }
      return row;
    });
  }, [data, series, xKey, effectiveMode]);

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const xTickFormatter = (v: number): string => {
    switch (effectiveMode) {
      case "time":
        return formatTimeTick(v);
      case "step":
        // Reuse the Y number formatter so 142k / 2.1M reads consistently.
        return formatY(v, "number");
      case "category":
      default:
        return String(v);
    }
  };

  const xTooltipLabel = (v: number | string): string => {
    switch (effectiveMode) {
      case "time": {
        const d = new Date((v as number) * 1000);
        return d.toLocaleTimeString();
      }
      case "step":
        return typeof v === "number"
          ? `step ${v.toLocaleString()}`
          : `step ${v}`;
      case "category":
      default:
        return `${xKey} ${v}`;
    }
  };

  return (
    <div style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(128,128,128,0.15)"
            vertical={false}
          />
          <XAxis
            dataKey="_ts"
            // ``type=number`` lets Recharts treat the axis as continuous so
            // non-uniform step intervals don't get squashed into equal slots.
            // For category mode we keep the default category axis.
            type={effectiveMode === "category" ? "category" : "number"}
            domain={
              effectiveMode === "category" ? undefined : ["dataMin", "dataMax"]
            }
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={xTickFormatter}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            width={55}
            domain={yDomain ?? ["auto", "auto"]}
            tickFormatter={(v: number) => formatY(v, yUnit)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.18 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "oklch(0.92 0 0)",
            }}
            labelFormatter={(v) => xTooltipLabel(v as number | string)}
            formatter={(value, name) => [
              typeof value === "number"
                ? formatTooltipValue(value, yUnit)
                : String(value ?? ""),
              String(name),
            ]}
          />
          {referenceY !== undefined && (
            <ReferenceLine
              y={referenceY}
              stroke="rgba(180,180,180,0.35)"
              strokeDasharray="4 4"
            />
          )}
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: "11px", color: "#8a8a8a" }} />
          )}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={resolveColor(s.color, i)}
              dot={false}
              strokeWidth={s.strokeWidth ?? 1.5}
              strokeDasharray={s.dashed ? "4 4" : undefined}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
