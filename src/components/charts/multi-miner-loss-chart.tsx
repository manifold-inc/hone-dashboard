"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
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
import { getInnerSteps } from "@/lib/api";
import type { TrainingRun } from "@/lib/types";

const MINER_COLORS = [
  "#4ade80",
  "#38bdf8",
  "#fb923c",
  "#c084fc",
  "#f472b6",
  "#facc15",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f87171",
  "#2dd4bf",
  "#e879f9",
];

interface MultiMinerLossChartProps {
  minerRuns: TrainingRun[];
  height?: number;
}

export function MultiMinerLossChart({
  minerRuns,
  height = 350,
}: MultiMinerLossChartProps) {
  const queries = useQueries({
    queries: minerRuns.map((run) => ({
      queryKey: ["inner-steps", run.id],
      queryFn: () => getInnerSteps(String(run.id), { limit: 2000 }),
    })),
  });

  const { chartData, seriesKeys, totalSteps } = useMemo(() => {
    const keys: { key: string; uid: number; color: string }[] = [];
    const stepMap = new Map<number, Record<string, unknown>>();
    const seenUids = new Set<number>();
    let colorIdx = 0;

    for (let i = 0; i < minerRuns.length; i++) {
      const run = minerRuns[i];
      const result = queries[i];
      const steps = result.data?.innerSteps ?? [];
      if (steps.length === 0) continue;

      const uid = run.uid ?? run.id;
      if (seenUids.has(uid)) continue;
      seenUids.add(uid);

      const lossKey = `uid_${uid}`;
      const color = MINER_COLORS[colorIdx % MINER_COLORS.length];
      colorIdx++;
      keys.push({ key: lossKey, uid, color });

      for (const pt of steps) {
        if (pt.loss === null) continue;
        const ts = Math.floor(new Date(pt.createdAt).getTime() / 1000);
        let row = stepMap.get(ts);
        if (!row) {
          row = { ts };
          stepMap.set(ts, row);
        }
        row[lossKey] = pt.loss;
      }
    }

    const data = Array.from(stepMap.values()).sort(
      (a, b) => (a.ts as number) - (b.ts as number)
    );

    let total = 0;
    for (const q of queries) total += q.data?.innerSteps?.length ?? 0;

    return { chartData: data, seriesKeys: keys, totalSteps: total };
  }, [minerRuns, queries]);

  if (chartData.length === 0) {
    const anyLoading = queries.some((q) => q.isLoading);
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
        style={{ height }}
      >
        <div className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </div>
        <span>
          {anyLoading
            ? `Loading data from ${minerRuns.length} miner(s)\u2026`
            : `Waiting for training data from ${minerRuns.length} miner(s)\u2026`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {seriesKeys.length} miner{seriesKeys.length !== 1 ? "s" : ""} &middot;{" "}
          {totalSteps} steps
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
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
            dataKey="ts"
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              const d = new Date(v * 1000);
              return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            width={55}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => v.toPrecision(3)}
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
              const d = new Date((v as number) * 1000);
              return d.toLocaleTimeString();
            }}
            formatter={(value, name) => [
              typeof value === "number"
                ? value.toPrecision(5)
                : String(value ?? ""),
              String(name),
            ]}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#8a8a8a" }} />
          {seriesKeys.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={`UID ${s.uid}`}
              stroke={s.color}
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
