"use client";

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface AreaSeries {
  key: string;
  label: string;
  color: string;
}

interface StackedAreaChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  series: AreaSeries[];
  xKey?: string;
  height?: number;
}

export function StackedAreaChart({
  data,
  series,
  xKey = "window",
  height = 300,
}: StackedAreaChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(128,128,128,0.15)"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#8a8a8a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#8a8a8a" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#262626",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#e5e5e5",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px", color: "#8a8a8a" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="1"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.3}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
