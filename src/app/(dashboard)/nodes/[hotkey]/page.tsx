"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getMinerMetrics,
  getUidDetail,
  getWindows,
} from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MetricCard } from "@/components/metric-card";
import { MetricExplainer } from "@/components/metric-explainer";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { LivenessDot } from "@/components/liveness-dot";
import { RunStatusBadge } from "@/components/run-status-badge";
import { useVersion } from "@/components/version-context";
import { deriveWindowSeries } from "@/lib/derived-metrics";
import { cn } from "@/lib/utils";
import type { TrainingRun } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncatedHotkey(hk: string): string {
  if (hk.length <= 20) return hk;
  return `${hk.slice(0, 10)}...${hk.slice(-8)}`;
}

function MinerRunRow({ run }: { run: TrainingRun }) {
  const { data } = useQuery({
    queryKey: ["miner-metrics", run.id, "latest"],
    queryFn: () => getMinerMetrics(String(run.id), { limit: 1 }),
  });

  const latest = data?.miners?.[0] ?? null;

  return (
    <TableRow className="hover:bg-accent/30">
      <TableCell>
        <RunStatusBadge lastSeenAt={run.lastSeenAt} />
      </TableCell>
      <TableCell>
        <Link
          href={`/runs/${run.id}`}
          className="text-primary hover:underline"
        >
          <span className="font-mono text-xs">#{run.id}</span>
        </Link>
      </TableCell>
      <TableCell>
        {run.version ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            v{run.version}
          </Badge>
        ) : (
          "\u2014"
        )}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.loss?.toFixed(4) ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.tokensPerSec?.toFixed(0) ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.globalStep?.toLocaleString() ?? "\u2014"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(run.startedAt)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {timeAgo(run.lastSeenAt)}
      </TableCell>
    </TableRow>
  );
}

function ValidatorRunRow({ run }: { run: TrainingRun }) {
  const { data } = useQuery({
    queryKey: ["windows", run.id, "summary"],
    queryFn: () => getWindows(String(run.id), { limit: 5000 }),
  });

  const windows = data?.windows ?? [];
  const latest = windows[0] ?? null;
  const windowCount = windows.length;

  return (
    <TableRow className="hover:bg-accent/30">
      <TableCell>
        <RunStatusBadge lastSeenAt={run.lastSeenAt} />
      </TableCell>
      <TableCell>
        <Link
          href={`/runs/${run.id}`}
          className="text-primary hover:underline"
        >
          <span className="font-mono text-xs">#{run.id}</span>
        </Link>
      </TableCell>
      <TableCell>
        {run.version ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            v{run.version}
          </Badge>
        ) : (
          "\u2014"
        )}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.lossOwnAfter?.toFixed(4) ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.gatherSuccessRate != null
          ? `${latest.gatherSuccessRate.toFixed(1)}%`
          : "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.globalStep?.toLocaleString() ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {windowCount}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {timeAgo(run.lastSeenAt)}
      </TableCell>
    </TableRow>
  );
}

export default function NodeDetailPage({
  params,
}: {
  params: Promise<{ hotkey: string }>;
}) {
  const { hotkey: encodedHotkey } = use(params);
  const hotkey = decodeURIComponent(encodedHotkey);
  const { allRuns } = useVersion();

  const runs = useMemo(() => {
    return allRuns
      .filter((r) => r.hotkey === hotkey)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
  }, [allRuns, hotkey]);

  // Auto-detect role from runs (validators win the tie since they're rarer)
  const role: "miner" | "validator" | null = useMemo(() => {
    if (runs.some((r) => r.role === "validator")) return "validator";
    if (runs.some((r) => r.role === "miner")) return "miner";
    return null;
  }, [runs]);

  const latestRun = runs[0];
  const uid = latestRun?.uid;

  const versions = useMemo(() => {
    const vset = new Set<string>();
    for (const r of runs) {
      if (r.version) vset.add(r.version);
    }
    return Array.from(vset).sort().reverse();
  }, [runs]);

  // Miner-side: score history from validator's perspective
  const { data: uidData } = useQuery({
    queryKey: ["uid-detail", uid],
    queryFn: () => getUidDetail(uid!, { limit: 500 }),
    enabled: uid != null && role === "miner",
  });

  const latestScore = uidData?.latestScore ?? null;
  const scoresSorted = useMemo(
    () => [...(uidData?.scores ?? [])].reverse(),
    [uidData?.scores]
  );

  // Validator-side: training windows
  const latestValidatorRunId = useMemo(
    () => runs.find((r) => r.role === "validator")?.id,
    [runs]
  );
  const { data: vWindowsData } = useQuery({
    queryKey: ["validator-windows-detail", latestValidatorRunId],
    queryFn: () =>
      getWindows(String(latestValidatorRunId!), { limit: 1000 }),
    enabled: latestValidatorRunId != null && role === "validator",
  });
  const validatorWindows = useMemo(
    () => (vWindowsData?.windows ?? []).slice().reverse(),
    [vWindowsData?.windows]
  );
  const derivedValidator = useMemo(
    () => deriveWindowSeries(validatorWindows),
    [validatorWindows]
  );

  // Miner-side latest training metrics from this hotkey's most recent run
  const minerLatestRunId = useMemo(
    () => runs.find((r) => r.role === "miner")?.id,
    [runs]
  );
  const { data: minerLatestData } = useQuery({
    queryKey: ["miner-metrics-detail", minerLatestRunId],
    queryFn: () =>
      getMinerMetrics(String(minerLatestRunId!), { limit: 500 }),
    enabled: minerLatestRunId != null && role === "miner",
  });
  const minerLatest = useMemo(
    () => (minerLatestData?.miners ?? []).slice().reverse(),
    [minerLatestData?.miners]
  );
  const lastMiner = minerLatest[minerLatest.length - 1];

  if (runs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/nodes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; All nodes
          </Link>
          <h1 className="font-heading mt-3 text-2xl font-bold tracking-tight">
            Node not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No runs registered for this hotkey on the current version.
          </p>
        </div>
      </div>
    );
  }

  const titleLabel =
    role === "validator"
      ? "Validator"
      : role === "miner"
        ? "Miner"
        : "Node";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/nodes" className="hover:text-foreground">
            Nodes
          </Link>
          <span>/</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {titleLabel}{" "}
            {uid !== null && uid !== undefined ? `#${uid}` : ""}
          </h1>
          {latestRun && <LivenessDot hotkey={latestRun.hotkey} />}
          {role && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                role === "validator"
                  ? "border-foreground/40 text-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              {role}
            </Badge>
          )}
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono" title={hotkey}>
              {truncatedHotkey(hotkey)}
            </span>
            <button
              className="text-[10px] text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(hotkey)}
            >
              Copy
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {runs.length} run{runs.length !== 1 ? "s" : ""}
            </span>
            <span className="text-border">|</span>
            <span>
              {versions.length} version{versions.length !== 1 ? "s" : ""}
              {versions.length > 0 && ` (${versions.join(", ")})`}
            </span>
            {runs.length > 0 && (
              <>
                <span className="text-border">|</span>
                <span>
                  First seen{" "}
                  {formatDate(runs[runs.length - 1].startedAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {role === "miner" && (
            <TabsTrigger value="training">Training</TabsTrigger>
          )}
          {role === "validator" && (
            <TabsTrigger value="validation">Validation</TabsTrigger>
          )}
          <TabsTrigger value="runs">
            Runs <span className="ml-1.5 text-muted-foreground">({runs.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          {role === "miner" && (
            <>
              {/* KPI cards */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Final Score"
                  value={fmt(latestScore?.finalScore)}
                />
                <MetricCard
                  label="Weight"
                  value={
                    latestScore?.weight != null
                      ? `${(latestScore.weight * 100).toFixed(2)}%`
                      : "\u2014"
                  }
                />
                <MetricCard
                  label="Loss"
                  value={fmt(lastMiner?.loss)}
                />
                <MetricCard
                  label="Tokens/sec"
                  value={
                    lastMiner?.tokensPerSec?.toFixed(0) ?? "\u2014"
                  }
                />
              </div>

              {/* Score history split into 3 mini-charts so weight (0-1) and
                  openskill (~0-50) don't crush each other on one Y axis. */}
              {scoresSorted.length > 0 && (
                <div className="grid gap-3 lg:grid-cols-3">
                  <MetricExplainer
                    title="Performance Scores"
                    plainSubtitle="The validator's read on this miner: Final blends gradient quality and sync; Gradient is per-window quality; Sync penalizes peers that drift from the shared model."
                    info="Source: scores.{finalScore, gradientScore, syncScore}. Higher is better; values can go negative when the miner's gradient hurts loss."
                    headlineValue={fmt(latestScore?.finalScore)}
                  >
                    <TimeSeriesChart
                      data={scoresSorted}
                      series={[
                        {
                          key: "finalScore",
                          label: "Final",
                          color: "#32ffc8",
                        },
                        {
                          key: "gradientScore",
                          label: "Gradient",
                          color: "#1a9977",
                        },
                        {
                          key: "syncScore",
                          label: "Sync",
                          color: "#0dcc9e",
                        },
                      ]}
                      referenceY={0}
                      height={200}
                    />
                  </MetricExplainer>

                  <MetricExplainer
                    title="OpenSkill Rating"
                    plainSubtitle="Bayesian skill rating across many windows; smooths out single-window noise. Higher is better."
                    info="Ordinal = mu - 3*sigma. The validator uses this for long-running ranking decisions independent of any one window's score."
                    headlineValue={
                      latestScore?.openskillOrdinal != null
                        ? latestScore.openskillOrdinal.toFixed(2)
                        : null
                    }
                  >
                    <TimeSeriesChart
                      data={scoresSorted}
                      series={[
                        {
                          key: "openskillOrdinal",
                          label: "Ordinal",
                          color: "positive",
                        },
                      ]}
                      height={200}
                    />
                  </MetricExplainer>

                  <MetricExplainer
                    title="Weight"
                    plainSubtitle="Fraction of validator stake this miner will earn next epoch. Capped at 100% in aggregate across the subnet."
                    info="Source: scores.weight. Derived from finalScore via the validator's weighting rule."
                    headlineValue={
                      latestScore?.weight != null
                        ? `${(latestScore.weight * 100).toFixed(2)}%`
                        : null
                    }
                  >
                    <TimeSeriesChart
                      data={scoresSorted.map((s) => ({
                        ...s,
                        weightPct:
                          s.weight != null ? s.weight * 100 : null,
                      }))}
                      series={[
                        {
                          key: "weightPct",
                          label: "Weight",
                          color: "#5dffd6",
                        },
                      ]}
                      yUnit="%"
                      yDomain={[0, "auto"]}
                      height={200}
                    />
                  </MetricExplainer>
                </div>
              )}
            </>
          )}

          {role === "validator" && (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Validator Runs"
                  value={runs.length}
                />
                <MetricCard
                  label="Windows"
                  value={validatorWindows.length.toLocaleString()}
                />
                <MetricCard
                  label="Latest Step"
                  value={
                    validatorWindows[
                      validatorWindows.length - 1
                    ]?.globalStep?.toLocaleString() ?? "\u2014"
                  }
                />
                <MetricCard
                  label="Gather %"
                  value={
                    validatorWindows[
                      validatorWindows.length - 1
                    ]?.gatherSuccessRate != null
                      ? `${validatorWindows[
                          validatorWindows.length - 1
                        ].gatherSuccessRate!.toFixed(1)}%`
                      : "\u2014"
                  }
                />
              </div>
            </>
          )}
        </TabsContent>

        {role === "miner" && (
          <TabsContent value="training" className="space-y-6 pt-4">
            {minerLatest.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No training data recorded yet for this miner&apos;s most
                recent run.
              </p>
            ) : (
              <>
                <MetricExplainer
                  title="Training Loss"
                  plainSubtitle="Per-window training loss reported by this miner. The shared model the network is training."
                  info="Source: miner_metrics.loss. One point per training window."
                  headlineValue={fmt(lastMiner?.loss)}
                >
                  <TimeSeriesChart
                    data={minerLatest}
                    series={[
                      { key: "loss", label: "Loss", color: "#32ffc8" },
                    ]}
                    yUnit="loss"
                    height={240}
                  />
                </MetricExplainer>

                <div className="grid gap-3 lg:grid-cols-2">
                  <MetricExplainer
                    title="Throughput"
                    plainSubtitle="Tokens processed per second."
                    headlineValue={
                      lastMiner?.tokensPerSec != null
                        ? `${lastMiner.tokensPerSec.toFixed(0)} tok/s`
                        : null
                    }
                  >
                    <TimeSeriesChart
                      data={minerLatest}
                      series={[
                        {
                          key: "tokensPerSec",
                          label: "Tokens/sec",
                          color: "#32ffc8",
                        },
                      ]}
                      height={200}
                    />
                  </MetricExplainer>

                  <MetricExplainer
                    title="Norms"
                    plainSubtitle="Gradient and weight norms across training. Spikes can indicate instability."
                  >
                    <TimeSeriesChart
                      data={minerLatest}
                      series={[
                        {
                          key: "gradNorm",
                          label: "Grad Norm",
                          color: "#32ffc8",
                        },
                        {
                          key: "weightNorm",
                          label: "Weight Norm",
                          color: "#1a9977",
                        },
                      ]}
                      height={200}
                    />
                  </MetricExplainer>
                </div>
              </>
            )}
          </TabsContent>
        )}

        {role === "validator" && (
          <TabsContent value="validation" className="space-y-6 pt-4">
            {derivedValidator.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No window data recorded yet for this validator.
              </p>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <MetricExplainer
                    title="Gradient Quality"
                    plainSubtitle="% loss reduction this validator measured on miners' claimed data after applying their gradients. Higher is better."
                    info="(loss_own_before - loss_own_after) / loss_own_before, averaged across all peers evaluated in the window."
                  >
                    <TimeSeriesChart
                      data={derivedValidator}
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
                  </MetricExplainer>

                  <MetricExplainer
                    title="Generalization Gap"
                    plainSubtitle={"improvement_own \u2212 improvement_random. Near zero is healthy; large positive means peers are overfitting."}
                  >
                    <TimeSeriesChart
                      data={derivedValidator}
                      series={[
                        {
                          key: "generalizationGap",
                          label: "Gap",
                          color: "warning",
                        },
                      ]}
                      yUnit="pp"
                      referenceY={0}
                      height={200}
                    />
                  </MetricExplainer>
                </div>

                <MetricExplainer
                  title="Gather Success"
                  plainSubtitle="% of peers whose gradients this validator collected each window."
                >
                  <TimeSeriesChart
                    data={validatorWindows}
                    series={[
                      {
                        key: "gatherSuccessRate",
                        label: "Success %",
                        color: "positive",
                      },
                    ]}
                    yUnit="%"
                    yDomain={[0, 100]}
                    height={200}
                  />
                </MetricExplainer>
              </>
            )}
          </TabsContent>
        )}

        <TabsContent value="runs" className="pt-4">
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Version</TableHead>
                  {role === "validator" ? (
                    <>
                      <TableHead>Loss (own)</TableHead>
                      <TableHead>Gather %</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Windows</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Loss</TableHead>
                      <TableHead>Tok/s</TableHead>
                      <TableHead>Step</TableHead>
                    </>
                  )}
                  <TableHead>Started</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) =>
                  role === "validator" ? (
                    <ValidatorRunRow key={run.id} run={run} />
                  ) : (
                    <MinerRunRow key={run.id} run={run} />
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function fmt(v: number | null | undefined, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}
