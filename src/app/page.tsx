"use client";

import { useQuery } from "@tanstack/react-query";
import { getNetworkStats } from "@/lib/api";
import { MetricCard } from "@/components/metric-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["network-stats"],
    queryFn: getNetworkStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-muted-foreground">
          Unable to connect to API &mdash; ensure hone-api is running
        </p>
      </div>
    );
  }

  const lw = data.latestWindow;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hone network training statistics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active Runs" value={data.activeRuns} />
        <MetricCard label="Validators" value={data.activeValidators} />
        <MetricCard label="Miners" value={data.activeMiners} />
        <MetricCard label="Total Windows" value={data.totalWindows.toLocaleString()} />
      </div>

      {lw && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Latest Loss (own)"
            value={lw.lossOwnAfter?.toFixed(4) ?? "\u2014"}
            subValue={
              lw.lossOwnImprovement !== null
                ? `${(lw.lossOwnImprovement * 100).toFixed(2)}% improvement`
                : undefined
            }
            trend={
              lw.lossOwnImprovement !== null
                ? lw.lossOwnImprovement > 0
                  ? "up"
                  : "down"
                : "neutral"
            }
          />
          <MetricCard
            label="Gather Success"
            value={`${lw.gatherSuccessRate?.toFixed(1) ?? 0}%`}
          />
          <MetricCard
            label="Global Step"
            value={lw.globalStep.toLocaleString()}
          />
          <MetricCard
            label="Active Miners"
            value={lw.activeMiners ?? 0}
          />
        </div>
      )}

      {data.recentLoss.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loss Over Recent Windows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={data.recentLoss}
              series={[
                { key: "lossOwnBefore", label: "Before", color: "#737373" },
                { key: "lossOwnAfter", label: "After", color: "#d4d4d4" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>
      )}

      {data.recentLoss.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gather Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={data.recentLoss}
              series={[
                {
                  key: "gatherSuccessRate",
                  label: "Success %",
                  color: "#a3a3a3",
                },
              ]}
              height={200}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
