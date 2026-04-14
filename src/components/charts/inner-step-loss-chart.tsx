"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useLiveInnerSteps } from "@/lib/use-live-metrics";
import { getInnerSteps } from "@/lib/api";

interface InnerStepLossChartProps {
  runId: number | undefined;
  height?: number;
}

export function InnerStepLossChart({
  runId,
  height = 350,
}: InnerStepLossChartProps) {
  const liveData = useLiveInnerSteps(runId);

  const { data: historicalData } = useQuery({
    queryKey: ["inner-steps", runId],
    queryFn: () => getInnerSteps(String(runId!), { limit: 2000 }),
    enabled: runId != null,
  });

  const chartData = useMemo(() => {
    const historicalPoints = (historicalData?.innerSteps ?? []).map((d) => ({
      step: d.globalStep,
      loss: d.loss,
      gradNorm: d.gradNorm,
      lr: d.innerLr,
    }));

    const livePoints = liveData
      .filter((d) => d.loss !== null)
      .map((d) => ({
        step: d.globalStep,
        loss: d.loss,
        gradNorm: d.gradNorm,
        lr: d.innerLr,
      }));

    const seenSteps = new Set(historicalPoints.map((p) => p.step));
    const merged = [
      ...historicalPoints,
      ...livePoints.filter((p) => !seenSteps.has(p.step)),
    ];

    merged.sort((a, b) => a.step - b.step);
    return merged;
  }, [historicalData, liveData]);

  if (chartData.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
        style={{ height }}
      >
        <div className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "#32ffc8" }} />
          <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: "#32ffc8" }} />
        </div>
        <span>Waiting for live training data&hellip;</span>
      </div>
    );
  }

  const latestLoss = chartData[chartData.length - 1]?.loss;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{chartData.length} steps</span>
        <span className="font-mono tabular-nums">
          loss: {latestLoss != null ? latestLoss.toFixed(4) : "\u2014"}
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
            dataKey="step"
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "global step",
              position: "insideBottomRight",
              offset: -4,
              style: { fontSize: 10, fill: "#666" },
            }}
          />
          <YAxis
            yAxisId="loss"
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            width={55}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => v.toPrecision(3)}
          />
          <YAxis
            yAxisId="gradNorm"
            orientation="right"
            tick={{ fontSize: 11, fill: "#8a8a8a" }}
            axisLine={false}
            tickLine={false}
            width={50}
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
            formatter={(value, name) => [
              typeof value === "number"
                ? value.toPrecision(4)
                : String(value ?? ""),
              String(name),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#8a8a8a" }}
          />
          <Line
            yAxisId="loss"
            type="monotone"
            dataKey="loss"
            name="Loss"
            stroke="#32ffc8"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            yAxisId="gradNorm"
            type="monotone"
            dataKey="gradNorm"
            name="Grad Norm"
            stroke="#8a8a8a"
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 2"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
