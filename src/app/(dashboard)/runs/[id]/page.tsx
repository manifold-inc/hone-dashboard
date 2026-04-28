"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getRun,
  getWindows,
  getScores,
  getMinerMetrics,
  getGradientStats,
  getSlashEvents,
  getInactivityEvents,
  getGatherStatus,
} from "@/lib/api";
import { MetricCard } from "@/components/metric-card";
import { RunStatusBadge } from "@/components/run-status-badge";
import { LivenessDot } from "@/components/liveness-dot";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { StackedAreaChart } from "@/components/charts/area-chart";
import { InnerStepLossChart } from "@/components/charts/inner-step-loss-chart";
import { ScoresTable } from "@/components/scores-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricExplainer } from "@/components/metric-explainer";
import { deriveWindowSeries } from "@/lib/derived-metrics";
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
  const [showRawLoss, setShowRawLoss] = useState(false);

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

  const { data: slashData } = useQuery({
    queryKey: ["slashes", id],
    queryFn: () => getSlashEvents(id, { limit: 500 }),
    enabled: !!runData && runData.run.role === "validator",
  });

  const { data: inactivityData } = useQuery({
    queryKey: ["inactivity", id],
    queryFn: () => getInactivityEvents(id, { limit: 500 }),
    enabled: !!runData && runData.run.role === "validator",
  });

  const { data: gatherData } = useQuery({
    queryKey: ["gather-status", id],
    queryFn: () => getGatherStatus(id, { limit: 2000 }),
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
  const slashes = slashData?.slashes ?? [];
  const inactivityEvts = inactivityData?.inactivity ?? [];
  const gatherEntries = gatherData?.gatherStatus ?? [];

  const isValidator = run.role === "validator";
  const derivedWindows = deriveWindowSeries(windows);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/nodes/${encodeURIComponent(run.hotkey)}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {run.role === "validator" ? "Validator" : "Miner"}
              {run.uid !== null ? ` #${run.uid}` : ""}
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-xl font-semibold tracking-tight">
              Run #{run.id}
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
          <LivenessDot hotkey={run.hotkey} />
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
          {isValidator && <TabsTrigger value="gather">Gather</TabsTrigger>}
          <TabsTrigger value="timing">Timing</TabsTrigger>
          {isValidator && <TabsTrigger value="gradients">Gradients</TabsTrigger>}
          {isValidator && <TabsTrigger value="events">Events</TabsTrigger>}
          {!isValidator && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        {/* ──── Training Tab ──── */}
        {/* Order is high-level (per-window aggregates) -> low-level
            (per-step / system) so the page reads top-down. */}
        <TabsContent value="training" className="space-y-6">
          {/* Headline: per-window training loss / validator anti-overfit */}
          {isValidator && windows.length > 0 && (
            <MetricExplainer
              title="Validator Anti-Overfitting Check"
              plainSubtitle={"Each window the validator simulates applying every miner's gradient and measures the resulting loss change \u2014 once on the data the miner says it trained on (own), once on independent random data."}
              info={
                <div className="space-y-2">
                  <p>
                    Source:{" "}
                    <span className="font-mono">
                      windows.{"{lossOwnBefore,lossOwnAfter,lossRandomBefore,lossRandomAfter}"}
                    </span>{" "}
                    averaged across all evaluated peers per window.
                  </p>
                  <p>
                    <strong>Gradient Quality</strong> tells you the gradients
                    are doing real work; <strong>Generalization Gap</strong>{" "}
                    tells you they aren&rsquo;t just memorizing the
                    miner&rsquo;s chosen data slice.
                  </p>
                </div>
              }
              action={
                <button
                  type="button"
                  onClick={() => setShowRawLoss((s) => !s)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {showRawLoss ? "Hide raw losses" : "Show raw losses"}
                </button>
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Gradient Quality
                  </p>
                  <TimeSeriesChart
                    data={derivedWindows}
                    series={[
                      {
                        key: "gradientQuality",
                        label: "Quality",
                        color: "positive",
                      },
                    ]}
                    yUnit="%"
                    referenceY={0}
                    height={200}
                  />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Generalization Gap
                  </p>
                  <TimeSeriesChart
                    data={derivedWindows}
                    series={[
                      {
                        key: "generalizationGap",
                        label: "Gap (own \u2212 random)",
                        color: "warning",
                      },
                    ]}
                    yUnit="pp"
                    referenceY={0}
                    height={200}
                  />
                </div>
              </div>

              {showRawLoss && (
                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Raw losses (per window, averaged across peers)
                  </p>
                  <TimeSeriesChart
                    data={windows}
                    series={[
                      {
                        key: "lossOwnBefore",
                        label: "Own \u2014 before",
                        color: "#1a9977",
                        dashed: true,
                      },
                      {
                        key: "lossOwnAfter",
                        label: "Own \u2014 after",
                        color: "#32ffc8",
                      },
                      {
                        key: "lossRandomBefore",
                        label: "Random \u2014 before",
                        color: "#fbbf24",
                        dashed: true,
                      },
                      {
                        key: "lossRandomAfter",
                        label: "Random \u2014 after",
                        color: "#f59e0b",
                      },
                    ]}
                    yUnit="loss"
                    height={220}
                  />
                </div>
              )}
            </MetricExplainer>
          )}

          {!isValidator && miners.length > 0 && (
            <MetricExplainer
              title="Training Loss"
              plainSubtitle="Per-window training loss reported by this miner."
              info="Source: miner_metrics.loss. One point per training window."
              headlineValue={
                miners[miners.length - 1]?.loss?.toFixed(4) ?? null
              }
            >
              <TimeSeriesChart
                data={miners}
                series={[{ key: "loss", label: "Loss", color: "#32ffc8" }]}
                yUnit="loss"
                height={260}
              />
            </MetricExplainer>
          )}

          {/* Per-inner-step live loss -- lower-level than the per-window curves above */}
          <MetricExplainer
            title="Live Loss (per inner step)"
            plainSubtitle="Per mini-batch loss inside the current window. Streams live; useful for catching divergence the moment it happens."
            info="Source: inner_steps.loss. Many inner steps roll up into one outer (global) step at the end of each window."
            className="ring-1 ring-signal/20"
          >
            <InnerStepLossChart runId={run.id} />
          </MetricExplainer>

          {isValidator && windows.length > 0 && (
            <MetricExplainer
              title="Learning Rate"
              plainSubtitle="Outer (global) and inner (per-batch) learning rates over time."
            >
              <TimeSeriesChart
                data={windows}
                series={[
                  { key: "outerLr", label: "Outer LR" },
                  { key: "innerLr", label: "Inner LR" },
                ]}
                height={200}
              />
            </MetricExplainer>
          )}

          {!isValidator && miners.length > 0 && (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                <MetricExplainer
                  title="Norms"
                  plainSubtitle="Gradient and weight norms. Spikes can indicate instability."
                >
                  <TimeSeriesChart
                    data={miners}
                    series={[
                      { key: "gradNorm", label: "Grad Norm" },
                      { key: "weightNorm", label: "Weight Norm" },
                    ]}
                    height={200}
                  />
                </MetricExplainer>

                <MetricExplainer
                  title="Throughput"
                  plainSubtitle="Tokens processed per second."
                  headlineValue={
                    miners[miners.length - 1]?.tokensPerSec != null
                      ? `${miners[miners.length - 1].tokensPerSec!.toFixed(0)} tok/s`
                      : null
                  }
                >
                  <TimeSeriesChart
                    data={miners}
                    series={[
                      {
                        key: "tokensPerSec",
                        label: "Tokens/sec",
                      },
                    ]}
                    height={200}
                  />
                </MetricExplainer>
              </div>

              {/* Outer step diagnostics */}
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Outer Step Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {miners.slice(-50).map((m, i) => (
                        <div
                          key={i}
                          title={`Window ${m.window}: ${m.outerStepApplied ? "applied" : "skipped"}`}
                          className={`w-3 h-3 rounded-sm ${
                            m.outerStepApplied
                              ? "bg-emerald-500"
                              : m.outerStepApplied === false
                                ? "bg-red-500"
                                : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last {Math.min(miners.length, 50)} windows
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Compressed Size (MB)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={miners.filter((m) => m.compressedSizeMb != null)}
                      series={[
                        { key: "compressedSizeMb", label: "Size (MB)" },
                      ]}
                      height={180}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Skipped Peers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={miners.filter((m) => m.skippedPeers != null)}
                      series={[
                        { key: "skippedPeers", label: "Skipped" },
                      ]}
                      height={180}
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

        {/* ──── Gather Tab ──── */}
        {isValidator && (
          <TabsContent value="gather" className="space-y-6">
            {gatherEntries.length > 0 ? (
              (() => {
                const latestWindow = Math.max(
                  ...gatherEntries.map((g) => g.window),
                );
                const latestEntries = gatherEntries.filter(
                  (g) => g.window === latestWindow,
                );
                const successCount = latestEntries.filter(
                  (g) => g.status === "success",
                ).length;
                const total = latestEntries.length;
                const byStatus = latestEntries.reduce(
                  (acc, g) => {
                    acc[g.status] = (acc[g.status] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                return (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricCard
                        label="Gathered"
                        value={`${successCount}/${total}`}
                      />
                      {Object.entries(byStatus)
                        .filter(([s]) => s !== "success")
                        .map(([status, count]) => (
                          <MetricCard
                            key={status}
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            value={count}
                          />
                        ))}
                      <MetricCard
                        label="Window"
                        value={latestWindow}
                      />
                    </div>
                    <Card className="bg-card/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Per-UID Gather Status (window {latestWindow})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border border-border overflow-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                  UID
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                  Status
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                  Reason
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {latestEntries
                                .sort((a, b) => a.uid - b.uid)
                                .map((g) => (
                                  <tr
                                    key={g.id}
                                    className="border-b border-border/50"
                                  >
                                    <td className="px-3 py-1.5 font-mono">
                                      {g.uid}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <Badge
                                        variant="outline"
                                        className={
                                          g.status === "success"
                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0"
                                            : g.status === "skipped"
                                              ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0"
                                              : "bg-red-500/15 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0"
                                        }
                                      >
                                        {g.status}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-1.5 text-muted-foreground">
                                      {g.reason ?? "\u2014"}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No gather data recorded yet
              </p>
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

        {/* ──── Events Tab (Validator) ──── */}
        {isValidator && (
          <TabsContent value="events" className="space-y-6">
            {slashes.length > 0 || inactivityEvts.length > 0 ? (
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Slash &amp; Inactivity Events ({slashes.length + inactivityEvts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border overflow-auto max-h-[500px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-card">
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Window</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">UID</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Before</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">After</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...slashes.map((s) => ({ ...s, evType: "slash" as const })),
                          ...inactivityEvts.map((e) => ({ ...e, evType: "inactivity" as const, reason: null as string | null })),
                        ]
                          .sort((a, b) => b.window - a.window)
                          .map((ev, i) => (
                            <tr key={`${ev.evType}-${ev.window}-${i}`} className="border-b border-border/50">
                              <td className="px-3 py-1.5 font-mono">{ev.window}</td>
                              <td className="px-3 py-1.5">
                                <Badge variant={ev.evType === "slash" ? "destructive" : "outline"} className="text-[10px]">
                                  {ev.evType}
                                </Badge>
                              </td>
                              <td className="px-3 py-1.5 font-mono">
                                {ev.uid}
                              </td>
                              <td className="px-3 py-1.5 font-mono">{ev.scoreBefore?.toFixed(4) ?? "\u2014"}</td>
                              <td className="px-3 py-1.5 font-mono">{ev.scoreAfter?.toFixed(4) ?? "\u2014"}</td>
                              <td className="px-3 py-1.5 text-muted-foreground max-w-48 truncate">
                                {ev.reason ?? "\u2014"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No events recorded yet
              </p>
            )}
          </TabsContent>
        )}

        {/* ──── System Tab (Miner) ──── */}
        {!isValidator && (
          <TabsContent value="system" className="space-y-6">
            {miners.length > 0 ? (
              <>
                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      GPU Memory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={miners}
                      series={[
                        { key: "gpuMemoryAllocated", label: "Allocated (MB)", color: "#d4d4d4" },
                        { key: "gpuMemoryCached", label: "Cached (MB)", color: "#737373" },
                      ]}
                      height={220}
                    />
                  </CardContent>
                </Card>

                {miners.some((m) => m.gradientL2Norm !== null) && (
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Gradient Fingerprint L2 Norm
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeSeriesChart
                        data={miners}
                        series={[
                          { key: "gradientL2Norm", label: "L2 Norm", color: "#a3a3a3" },
                        ]}
                        height={200}
                      />
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Throughput
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSeriesChart
                      data={miners}
                      series={[
                        { key: "tokensPerSec", label: "Tokens/sec", color: "#d4d4d4" },
                      ]}
                      height={200}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No system metrics recorded yet
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
