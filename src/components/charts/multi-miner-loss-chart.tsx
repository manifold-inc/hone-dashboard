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
import { ChartSkeleton } from "./chart-skeleton";

/**
 * Constrained mint-family palette for multi-miner overlays. Per the
 * Two-Palette Rule the entire chart stays in the data-viz mint family;
 * differentiation among miners comes from a 6-step lightness ramp first,
 * then from line styles (dashed -> dotted -> dot-dash) for series 7+.
 *
 * If you need to plot more than ~18 miners cleanly, the right answer is
 * a "show top N" UX rather than more colors. Twelve-color rainbows are
 * what Wandb does; we explicitly don't.
 */
const MINER_HUES = [
  "oklch(0.886 0.176 169.5)", // signal mint (brightest)
  "oklch(0.55 0.13 170)", // mint deep
  "oklch(0.93 0.13 170)", // mint light
  "oklch(0.74 0.16 167)", // mint true
  "oklch(0.42 0.11 172)", // mint dark
  "oklch(0.97 0.07 170)", // mint pale
] as const;

const MINER_DASHES: (string | undefined)[] = [
  undefined, // solid
  "5 4", // dashed
  "2 3", // dotted
];

function minerStrokeFor(idx: number): {
  stroke: string;
  strokeDasharray: string | undefined;
} {
  const cycleStage = Math.floor(idx / MINER_HUES.length);
  return {
    stroke: MINER_HUES[idx % MINER_HUES.length],
    strokeDasharray: MINER_DASHES[cycleStage % MINER_DASHES.length],
  };
}

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
    // Group every run by its UID so a UID with multiple restarts has a
    // single line whose data spans every run. Without this, a miner
    // restart silently drops all inner-step history reported under the
    // previous run id.
    const queriesByUid = new Map<
      number,
      { results: typeof queries }
    >();
    for (let i = 0; i < minerRuns.length; i++) {
      const run = minerRuns[i];
      const uid = run.uid ?? run.id;
      let bucket = queriesByUid.get(uid);
      if (!bucket) {
        bucket = { results: [] };
        queriesByUid.set(uid, bucket);
      }
      bucket.results.push(queries[i]);
    }

    const keys: {
      key: string;
      uid: number;
      stroke: string;
      strokeDasharray: string | undefined;
    }[] = [];
    const stepMap = new Map<number, Record<string, unknown>>();
    let colorIdx = 0;
    let total = 0;

    // Sort UIDs so palette assignment is stable across renders even when
    // run order shuffles.
    const sortedUids = Array.from(queriesByUid.keys()).sort((a, b) => a - b);

    for (const uid of sortedUids) {
      const bucket = queriesByUid.get(uid)!;
      // Dedupe inner steps within a UID by globalStep, preferring the
      // most recently reported value when two runs both saw the same
      // step (a restart re-reading from a checkpoint).
      const stepsByGlobal = new Map<
        number,
        { ts: number; loss: number; createdAt: string }
      >();
      for (const result of bucket.results) {
        const steps = result.data?.innerSteps ?? [];
        total += steps.length;
        for (const pt of steps) {
          if (pt.loss === null) continue;
          const ts = Math.floor(new Date(pt.createdAt).getTime() / 1000);
          const existing = stepsByGlobal.get(pt.globalStep);
          if (!existing || existing.createdAt < pt.createdAt) {
            stepsByGlobal.set(pt.globalStep, {
              ts,
              loss: pt.loss,
              createdAt: pt.createdAt,
            });
          }
        }
      }
      if (stepsByGlobal.size === 0) continue;

      const lossKey = `uid_${uid}`;
      const { stroke, strokeDasharray } = minerStrokeFor(colorIdx);
      colorIdx++;
      keys.push({ key: lossKey, uid, stroke, strokeDasharray });

      for (const point of stepsByGlobal.values()) {
        let row = stepMap.get(point.ts);
        if (!row) {
          row = { ts: point.ts };
          stepMap.set(point.ts, row);
        }
        row[lossKey] = point.loss;
      }
    }

    const data = Array.from(stepMap.values()).sort(
      (a, b) => (a.ts as number) - (b.ts as number)
    );

    return { chartData: data, seriesKeys: keys, totalSteps: total };
  }, [minerRuns, queries]);

  if (chartData.length === 0) {
    const anyLoading = queries.some((q) => q.isLoading);
    return (
      <ChartSkeleton
        height={height}
        variant={anyLoading ? "loading" : "empty"}
        status={
          anyLoading
            ? `Loading ${minerRuns.length} miner${minerRuns.length === 1 ? "" : "s"}`
            : `Awaiting first window from ${minerRuns.length} miner${minerRuns.length === 1 ? "" : "s"}`
        }
        hint={anyLoading ? undefined : "no data yet"}
      />
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
      <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
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
              backgroundColor: "oklch(0.18 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "oklch(0.92 0 0)",
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
              stroke={s.stroke}
              strokeDasharray={s.strokeDasharray}
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
