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
} from "recharts";

interface Series {
  key: string;
  label: string;
  color?: string;
}

interface TimeSeriesChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  series: Series[];
  xKey?: string;
  height?: number;
}

const MONO_PALETTE = ["#32ffc8", "#1a9977", "#0dcc9e", "#5dffd6"];

const EMPHASIS_COLORS: Record<string, string> = {
  positive: "#32ffc8",
  negative: "#f87171",
  warning: "#fbbf24",
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

export function TimeSeriesChart({
  data,
  series,
  xKey = "window",
  height = 300,
}: TimeSeriesChartProps) {
  const chartData = useMemo(() => {
    return data.map((d, i) => {
      const ts = d.createdAt
        ? Math.floor(new Date(d.createdAt).getTime() / 1000)
        : d[xKey] ?? i;
      const row: Record<string, unknown> = { _ts: ts };
      for (const s of series) {
        row[s.key] = d[s.key] ?? null;
      }
      return row;
    });
  }, [data, series, xKey]);

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

  const hasTimestamps =
    data.length > 0 && data[0].createdAt != null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
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
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={hasTimestamps ? formatTimeTick : (v) => String(v)}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            width={55}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000
                ? `${(v / 1000).toFixed(1)}k`
                : v.toPrecision(4)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#262626",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#e5e5e5",
            }}
            labelFormatter={(v) => {
              if (hasTimestamps) {
                const d = new Date((v as number) * 1000);
                return d.toLocaleTimeString();
              }
              return `${xKey}: ${v}`;
            }}
            formatter={(value, name) => [
              typeof value === "number"
                ? value.toPrecision(5)
                : String(value ?? ""),
              String(name),
            ]}
          />
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
              strokeWidth={1.5}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
