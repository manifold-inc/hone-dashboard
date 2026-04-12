"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getRun,
  getWindows,
  getScores,
  getMinerMetrics,
  getGradientStats,
} from "@/lib/api";
import { MetricCard } from "@/components/metric-card";
import { RunStatusBadge } from "@/components/run-status-badge";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { StackedAreaChart } from "@/components/charts/area-chart";
import { ScoresTable } from "@/components/scores-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function truncateHotkey(hotkey: string): string {
  if (hotkey.length <= 16) return hotkey;
  return `${hotkey.slice(0, 8)}...${hotkey.slice(-6)}`;
}

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ["run", id],
    queryFn: () => getRun(id),
  });

  const { data: windowData } = useQuery({
    queryKey: ["windows", id],
    queryFn: () => getWindows(id, { limit: 500 }),
    enabled: !!runData,
  });

  const { data: scoreData } = useQuery({
    queryKey: ["scores", id],
    queryFn: () => getScores(id, { limit: 2000 }),
    enabled: !!runData && runData.run.role === "validator",
  });

  const { data: minerData } = useQuery({
    queryKey: ["miner-metrics", id],
    queryFn: () => getMinerMetrics(id, { limit: 500 }),
    enabled: !!runData && runData.run.role === "miner",
  });

  const { data: gradData } = useQuery({
    queryKey: ["gradients", id],
    queryFn: () => getGradientStats(id, { limit: 500 }),
    enabled: !!runData && runData.run.role === "validator",
  });

  if (runLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!runData) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-muted-foreground">Run not found</p>
      </div>
    );
  }

  const { run, latestWindow, latestMiner } = runData;
  const windows = windowData?.windows?.slice().reverse() ?? [];
  const scores = scoreData?.scores ?? [];
  const miners = minerData?.miners?.slice().reverse() ?? [];
  const gradients = gradData?.gradients?.slice().reverse() ?? [];

  const isValidator = run.role === "validator";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/runs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Runs
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-xl font-semibold tracking-tight">
              {run.role === "validator" ? "Validator" : "Miner"}{" "}
              {run.uid !== null ? `#${run.uid}` : ""}
            </h1>
          </div>
          <p
            className="mt-1 font-mono text-xs text-muted-foreground"
            title={run.hotkey}
          >
            {truncateHotkey(run.hotkey)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {run.role}
          </Badge>
          <RunStatusBadge lastSeenAt={run.lastSeenAt} />
          {run.version && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              v{run.version}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isValidator && latestWindow && (
          <>
            <MetricCard
              label="Loss (own after)"
              value={latestWindow.lossOwnAfter?.toFixed(4) ?? "\u2014"}
              trend={
                latestWindow.lossOwnImprovement
                  ? latestWindow.lossOwnImprovement > 0
                    ? "up"
                    : "down"
                  : "neutral"
              }
            />
            <MetricCard
              label="Gather Success"
              value={`${latestWindow.gatherSuccessRate?.toFixed(1) ?? 0}%`}
            />
            <MetricCard
              label="Global Step"
              value={latestWindow.globalStep.toLocaleString()}
            />
            <MetricCard
              label="Evaluated UIDs"
              value={latestWindow.evaluatedUids ?? 0}
            />
          </>
        )}
        {!isValidator && latestMiner && (
          <>
            <MetricCard
              label="Loss"
              value={latestMiner.loss?.toFixed(4) ?? "\u2014"}
            />
            <MetricCard
              label="Tokens/sec"
              value={latestMiner.tokensPerSec?.toFixed(0) ?? "\u2014"}
            />
            <MetricCard
              label="Global Step"
              value={latestMiner.globalStep.toLocaleString()}
            />
            <MetricCard
              label="Gather Peers"
              value={latestMiner.gatherPeers ?? 0}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="training" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="training">Training</TabsTrigger>
          {isValidator && <TabsTrigger value="network">Network</TabsTrigger>}
          {isValidator && <TabsTrigger value="scores">Scores</TabsTrigger>}
          <TabsTrigger value="timing">Timing</TabsTrigger>
          {isValidator && <TabsTrigger value="gradients">Gradients</TabsTrigger>}
        </TabsList>

        {/* ──── Training Tab ──── */}
        <TabsContent value="training" className="space-y-6">
          {isValidator && windows.length > 0 && (
            <>
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Loss (Own Data)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart
                    data={windows}
                    series={[
                      { key: "lossOwnBefore", label: "Before" },
                      { key: "lossOwnAfter", label: "After" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Loss (Random Data)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart
                    data={windows}
                    series={[
                      { key: "lossRandomBefore", label: "Before" },
                      { key: "lossRandomAfter", label: "After" },
                    ]}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Improvement %
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={windows}
                      series={[
                        {
                          key: "lossOwnImprovement",
                          label: "Own",
                          color: "positive",
                        },
                        {
                          key: "lossRandomImprovement",
                          label: "Random",
                        },
                      ]}
                      height={240}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Learning Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={windows}
                      series={[
                        { key: "outerLr", label: "Outer LR" },
                        { key: "innerLr", label: "Inner LR" },
                      ]}
                      height={240}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!isValidator && miners.length > 0 && (
            <>
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Training Loss
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart
                    data={miners}
                    series={[{ key: "loss", label: "Loss" }]}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Throughput (tokens/sec)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={miners}
                      series={[
                        { key: "tokensPerSec", label: "Tokens/sec" },
                      ]}
                      height={240}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Norms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={miners}
                      series={[
                        { key: "gradNorm", label: "Grad Norm" },
                        { key: "weightNorm", label: "Weight Norm" },
                      ]}
                      height={240}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {((isValidator && windows.length === 0) ||
            (!isValidator && miners.length === 0)) && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No training data recorded yet
            </p>
          )}
        </TabsContent>

        {/* ──── Network Tab ──── */}
        {isValidator && (
          <TabsContent value="network" className="space-y-6">
            {windows.length > 0 ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Miners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={windows}
                        series={[
                          {
                            key: "activeMiners",
                            label: "Active Miners",
                          },
                        ]}
                        height={240}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Gather Success Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={windows}
                        series={[
                          {
                            key: "gatherSuccessRate",
                            label: "Success %",
                            color: "positive",
                          },
                        ]}
                        height={240}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Peer Counts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={windows}
                        series={[
                          { key: "gatherPeers", label: "Gather Peers" },
                          { key: "evaluatedUids", label: "Evaluated UIDs" },
                        ]}
                        height={240}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Index Overlap
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={windows}
                        series={[
                          {
                            key: "overlapMean",
                            label: "Mean",
                          },
                          {
                            key: "overlapMax",
                            label: "Max",
                            color: "warning",
                          },
                        ]}
                        height={240}
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No network data yet
              </p>
            )}
          </TabsContent>
        )}

        {/* ──── Scores Tab ──── */}
        {isValidator && (
          <TabsContent value="scores" className="space-y-6">
            <ScoresTable scores={scores} />

            {scores.length > 0 && (
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Final Scores Over Time (all UIDs)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart
                    data={aggregateScoresByWindow(scores)}
                    series={[
                      { key: "avgFinalScore", label: "Avg Final" },
                      { key: "maxFinalScore", label: "Max Final" },
                    ]}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ──── Timing Tab ──── */}
        <TabsContent value="timing" className="space-y-6">
          {isValidator && windows.length > 0 && (
            <>
              <StackedAreaChart
                data={windows}
                series={[
                  {
                    key: "timingGather",
                    label: "Gather",
                    color: "#b0b0b0",
                  },
                  {
                    key: "timingEvaluation",
                    label: "Evaluation",
                    color: "#787878",
                  },
                  {
                    key: "timingModelUpdate",
                    label: "Model Update",
                    color: "#525252",
                  },
                  {
                    key: "timingPeerUpdate",
                    label: "Peer Update",
                    color: "#3a3a3a",
                  },
                ]}
                height={350}
              />

              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Window Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart
                    data={windows}
                    series={[
                      {
                        key: "timingWindowTotal",
                        label: "Total (s)",
                      },
                    ]}
                    height={200}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {!isValidator && miners.length > 0 && (
            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Miner Timing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  data={miners.map((m) => ({
                    window: m.window,
                    ...(m.timing ?? {}),
                  }))}
                  series={[
                    { key: "training", label: "Training" },
                    { key: "gather", label: "Gather" },
                    { key: "compression", label: "Compression" },
                    { key: "model_update", label: "Model Update" },
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ──── Gradients Tab ──── */}
        {isValidator && (
          <TabsContent value="gradients" className="space-y-6">
            {gradients.length > 0 ? (
              <>
                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Gradient Norms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={gradients}
                      series={[
                        { key: "meanGradNorm", label: "Mean" },
                        { key: "medianGradNorm", label: "Median" },
                        { key: "maxGradNorm", label: "Max" },
                        { key: "minGradNorm", label: "Min" },
                      ]}
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Gradient Norm Std Dev
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={gradients}
                        series={[
                          { key: "gradNormStd", label: "Std Dev" },
                        ]}
                        height={240}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Grad-to-Weight Ratio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={gradients}
                        series={[
                          {
                            key: "gradToWeightRatio",
                            label: "Ratio",
                            color: "warning",
                          },
                        ]}
                        height={240}
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No gradient data recorded yet
              </p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function aggregateScoresByWindow(
  scores: { window: number; finalScore: number | null }[]
) {
  const byWindow = new Map<
    number,
    { sum: number; max: number; count: number }
  >();

  for (const s of scores) {
    if (s.finalScore === null) continue;
    const existing = byWindow.get(s.window);
    if (existing) {
      existing.sum += s.finalScore;
      existing.max = Math.max(existing.max, s.finalScore);
      existing.count++;
    } else {
      byWindow.set(s.window, {
        sum: s.finalScore,
        max: s.finalScore,
        count: 1,
      });
    }
  }

  return Array.from(byWindow.entries())
    .sort(([a], [b]) => a - b)
    .map(([window, { sum, max, count }]) => ({
      window,
      avgFinalScore: sum / count,
      maxFinalScore: max,
    }));
}
