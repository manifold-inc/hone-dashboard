"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getLeaderboard,
  getWindows,
  getMinerMetrics,
  getSlashEvents,
  getInactivityEvents,
  getEvalResults,
  getLatestEvalScores,
} from "@/lib/api";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { MultiMinerLossChart } from "@/components/charts/multi-miner-loss-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveContext } from "@/components/live-update-provider";
import { cn } from "@/lib/utils";
import { useVersion } from "@/components/version-context";
import { VersionHeader } from "@/components/version-header";
import { TrainingProgressBar } from "@/components/training-progress-bar";
import { MetricExplainer } from "@/components/metric-explainer";
import { Glossary } from "@/components/glossary";
import { NodeAvatar } from "@/components/node-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  aggregateMinerLossByWindow,
  computeTrend,
  deriveWindowSeries,
  gradientQuality,
  generalizationGap,
  networkHealth,
} from "@/lib/derived-metrics";
import { NetworkHealth } from "@/components/network-health";

/**
 * StatTile follows the Two-Palette Rule from DESIGN.md: the value text is
 * never amber (amber = action, not data). The optional ``live`` prop tints
 * the value with the mint signal color to mark "this is a streaming /
 * live-updating reading".
 */
function StatTile({
  label,
  value,
  sub,
  trend,
  live,
  tooltip,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  live?: boolean;
  tooltip?: string;
  className?: string;
}) {
  const labelEl = (
    <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
      {live && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-signal"
          aria-label="live"
        />
      )}
      <span>{label}</span>
    </p>
  );
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card/60 px-4 py-3",
        live && "ring-1 ring-signal/15",
        className
      )}
    >
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger className="cursor-help text-left">
            {labelEl}
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        labelEl
      )}
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-xl font-semibold tabular-nums tracking-tight",
            live ? "text-signal" : "text-foreground"
          )}
        >
          {value}
        </span>
        {trend && trend !== "neutral" && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-positive",
              trend === "down" && "text-negative"
            )}
          >
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
      {sub && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function LiveDot() {
  return (
    <span
      className="relative mr-1.5 inline-flex h-2 w-2"
      aria-label="live"
    >
      <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-signal opacity-50 motion-reduce:opacity-0" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
    </span>
  );
}

function fmtNumber(v: number | null | undefined, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}

/**
 * Distinguishes the three reasons /network can render blank. Riley
 * (stress-tester persona) and the auditor both bail on a generic
 * "Waiting for data" message; this routes them to the right action.
 */
function NetworkEmptyState({
  connected,
  totalRuns,
  versionRuns,
  currentVersion,
}: {
  connected: boolean;
  totalRuns: number;
  versionRuns: number;
  currentVersion: string | null;
}) {
  let kind: "offline" | "no-runs" | "no-data-for-version";
  let label: string;
  let body: React.ReactNode;
  let action: React.ReactNode = null;

  if (totalRuns === 0 && !connected) {
    kind = "offline";
    label = "API unreachable";
    body = (
      <>
        Cannot reach <span className="font-mono">hone-api</span>. Verify the
        server is running and the dashboard&rsquo;s{" "}
        <span className="font-mono">API_URL</span> /{" "}
        <span className="font-mono">NEXT_PUBLIC_WS_URL</span> environment
        variables point to it.
      </>
    );
  } else if (totalRuns === 0) {
    kind = "no-runs";
    label = "No runs registered";
    body = (
      <>
        The API is responding but no training runs have ever reported in.
        Start a validator or miner; the dashboard will populate as soon as
        the first heartbeat arrives.
      </>
    );
  } else if (versionRuns === 0 && currentVersion) {
    kind = "no-data-for-version";
    label = `No data for v${currentVersion}`;
    body = (
      <>
        No miners or validators are running on{" "}
        <span className="font-mono">v{currentVersion}</span> yet. Switch
        versions via the header dropdown to inspect a different run, or
        wait for the first window to arrive on this one.
      </>
    );
    action = (
      <span className="text-[10px] text-muted-foreground/70">
        version selector is in the page header above
      </span>
    );
  } else {
    kind = "no-data-for-version";
    label = "Waiting for first window";
    body = (
      <>
        Runs are registered for this version but neither validators nor
        miners have reported a window of metrics yet. The first window
        usually lands within a minute of a node coming online.
      </>
    );
  }

  const dotColor = connected ? "bg-signal" : "bg-muted-foreground/40";

  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
            dotColor,
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {kind === "offline"
              ? "Connection"
              : kind === "no-runs"
                ? "Network"
                : "This version"}
          </p>
          <p className="mt-1 font-heading text-base text-foreground">
            {label}
          </p>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            {body}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground/70">
            <span>
              websocket:{" "}
              <span
                className={cn(
                  connected ? "text-signal" : "text-muted-foreground"
                )}
              >
                {connected ? "live" : "disconnected"}
              </span>
            </span>
            <span>
              runs total: <span className="text-foreground">{totalRuns}</span>
            </span>
            {currentVersion && (
              <span>
                v{currentVersion}:{" "}
                <span className="text-foreground">{versionRuns}</span>
              </span>
            )}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export default function NetworkPage() {
  const { connected, onlineCount } = useLiveContext();
  const { allRuns, currentVersion } = useVersion();
  const [showRawLoss, setShowRawLoss] = useState(false);

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard-preview"],
    queryFn: () => getLeaderboard({ limit: 10 }),
  });

  const runs = currentVersion
    ? allRuns.filter((r) => r.version === currentVersion)
    : allRuns;

  const validatorRun = runs.find((r) => r.role === "validator");

  const minerRunsByUid = new Map<number, (typeof runs)[0]>();
  for (const r of runs) {
    if (r.role !== "miner" || r.uid === null) continue;
    const existing = minerRunsByUid.get(r.uid);
    if (!existing || new Date(r.lastSeenAt) > new Date(existing.lastSeenAt)) {
      minerRunsByUid.set(r.uid, r);
    }
  }
  const minerRuns = Array.from(minerRunsByUid.values());
  const minerRun = minerRuns[0];

  const validatorRunId = validatorRun?.id;
  const minerRunId = minerRun?.id;

  const { data: windowsData } = useQuery({
    queryKey: ["windows-full", validatorRunId],
    queryFn: () => getWindows(String(validatorRunId!), { limit: 2000 }),
    enabled: validatorRunId != null,
  });

  const { data: minerData } = useQuery({
    queryKey: ["miner-metrics-network", minerRunId],
    queryFn: () => getMinerMetrics(String(minerRunId!), { limit: 2000 }),
    enabled: minerRunId != null,
  });

  // Pull metrics for ALL miner runs so the headline loss can be aggregated
  // across the network. We use a single secondary query per miner; React
  // Query dedupes since most pages have a small number of miners.
  const minerRunIds = useMemo(
    () => minerRuns.map((r) => r.id).join(","),
    [minerRuns]
  );
  const { data: networkLossData } = useQuery({
    queryKey: ["network-miner-loss", minerRunIds],
    queryFn: async () => {
      const all = await Promise.all(
        minerRuns.map((r) =>
          getMinerMetrics(String(r.id), { limit: 500 }).then(
            (d) => d.miners ?? [],
          ),
        ),
      );
      return all.flat();
    },
    enabled: minerRuns.length > 0,
  });

  const { data: slashData } = useQuery({
    queryKey: ["slashes-network", validatorRunId],
    queryFn: () => getSlashEvents(String(validatorRunId!), { limit: 30 }),
    enabled: validatorRunId != null,
  });

  const { data: inactivityData } = useQuery({
    queryKey: ["inactivity-network", validatorRunId],
    queryFn: () => getInactivityEvents(String(validatorRunId!), { limit: 30 }),
    enabled: validatorRunId != null,
  });

  const { data: evalResultsData } = useQuery({
    queryKey: ["eval-results", currentVersion],
    queryFn: () =>
      getEvalResults({
        version: currentVersion ?? undefined,
        metric: "acc_norm",
        limit: 5000,
      }),
    enabled: !!currentVersion,
  });
  const { data: latestEvalsData } = useQuery({
    queryKey: ["eval-latest", currentVersion],
    queryFn: () => getLatestEvalScores(currentVersion!, "acc_norm"),
    enabled: !!currentVersion,
  });

  const allWindows = (windowsData?.windows ?? []).slice().reverse();
  const allMinerMetrics = (minerData?.miners ?? []).slice().reverse();
  const networkAggregated = useMemo(
    () => aggregateMinerLossByWindow(networkLossData ?? []),
    [networkLossData]
  );
  const derivedWindows = useMemo(
    () => deriveWindowSeries(allWindows),
    [allWindows]
  );

  const latestMiner = allMinerMetrics[allMinerMetrics.length - 1];
  const latestWindow = allWindows[allWindows.length - 1] ?? null;
  const lw = latestWindow;

  const versionMinerCount = minerRuns.length;
  const versionValidatorCount = runs.filter((r) => r.role === "validator").length;

  const currentStep = latestWindow?.globalStep ?? latestMiner?.globalStep ?? null;
  const currentWindowNum = latestWindow?.window ?? latestMiner?.window ?? null;

  const cfg = (validatorRun?.config ?? minerRun?.config ?? null) as
    | { target_batch_size?: number; sequence_length?: number }
    | null;
  const tbs = cfg?.target_batch_size ?? null;
  const seq = cfg?.sequence_length ?? null;
  const tokensDone =
    currentStep != null && tbs != null && seq != null
      ? currentStep * tbs * seq
      : null;

  // Group eval results by task for the per-task mini cards
  const evalByTask: Record<
    string,
    { window: number; score: number; createdAt: string }[]
  > = {};
  for (const r of evalResultsData?.results ?? []) {
    if (r.metricName !== "acc_norm") continue;
    (evalByTask[r.task] ??= []).push({
      window: r.window,
      score: r.score,
      createdAt: r.createdAt,
    });
  }
  for (const k of Object.keys(evalByTask)) {
    evalByTask[k].sort((a, b) => a.window - b.window);
  }
  const evalTasks = Object.keys(evalByTask).sort();
  const latestByTask = useMemo(
    () => latestEvalsData?.latest ?? {},
    [latestEvalsData]
  );

  const validatorVersion = validatorRun?.version ?? null;
  const recentEvents = [
    ...(slashData?.slashes ?? []).map((s) => ({
      ...s,
      evType: "slash" as const,
      reason: s.reason,
      version: validatorVersion,
    })),
    ...(inactivityData?.inactivity ?? []).map((e) => ({
      ...e,
      evType: "inactivity" as const,
      reason: null as string | null,
      version: validatorVersion,
    })),
  ]
    .sort((a, b) => b.window - a.window)
    .slice(0, 15);

  const hasValidatorData = allWindows.length > 0;
  const hasMinerData = networkAggregated.length > 0 || allMinerMetrics.length > 0;

  // Page fold-anchor: validator and miner loss as the headline numbers,
  // each with its own trend so the readout color-codes by direction
  // (mint = falling, red = climbing). Sentence + diagnostic chips come
  // from networkHealth(), which builds them from the same inputs the
  // section charts plot.
  const healthVerdict = useMemo(
    () =>
      networkHealth({
        windows: allWindows,
        slashes: slashData?.slashes ?? [],
        connected,
        lookback: 30,
      }),
    [allWindows, slashData?.slashes, connected]
  );

  const healthSparkline = useMemo(
    () =>
      allWindows.slice(-30).map((w) => ({ value: w.lossRandomAfter })),
    [allWindows]
  );

  const validatorLoss = useMemo(() => {
    const recent = allWindows.slice(-30);
    const latest = recent[recent.length - 1]?.lossRandomAfter ?? null;
    const { trend } = computeTrend(recent.map((w) => w.lossRandomAfter));
    return { value: latest, trend };
  }, [allWindows]);

  const innerLoss = useMemo(() => {
    const recent = networkAggregated.slice(-30);
    const latest = recent[recent.length - 1]?.loss ?? null;
    const { trend } = computeTrend(recent.map((p) => p.loss));
    return { value: latest, trend };
  }, [networkAggregated]);

  const topMiners =
    leaderboardData?.leaderboard
      ?.slice()
      .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
      .slice(0, 5) ?? [];

  // Headline derived figures
  const latestQuality = lw ? gradientQuality(lw) : null;
  const latestGap = lw ? generalizationGap(lw) : null;
  const latestEvalAccNorm = useMemo(() => {
    const tasks = Object.values(latestByTask);
    if (tasks.length === 0) return null;
    return (
      tasks.reduce((sum, t) => sum + t.score, 0) / tasks.length
    );
  }, [latestByTask]);

  return (
    <div className="space-y-5">
      <TrainingProgressBar
        tokensDone={tokensDone}
        tokensTarget={2e12}
        version={currentVersion}
        globalStep={currentStep}
      />

      {/* Telemetry header. Title + version selector on the left, monospace
          live-status strip on the right. Reads like an instrument's status
          bar: SUBNET / WINDOW / STEP / connection state, all in mono with
          tabular numbers. */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3 pt-1">
        <VersionHeader title="Hone" />
        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-baseline gap-1.5">
            <dt className="uppercase tracking-[0.15em] text-[9px] text-muted-foreground/70">
              Subnet
            </dt>
            <dd className="tabular-nums text-foreground">5</dd>
          </div>
          {currentWindowNum != null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="uppercase tracking-[0.15em] text-[9px] text-muted-foreground/70">
                Window
              </dt>
              <dd className="tabular-nums text-foreground">
                {currentWindowNum.toLocaleString()}
              </dd>
            </div>
          )}
          {currentStep != null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="uppercase tracking-[0.15em] text-[9px] text-muted-foreground/70">
                Step
              </dt>
              <dd className="tabular-nums text-foreground">
                {currentStep.toLocaleString()}
              </dd>
            </div>
          )}
          <div className="flex items-baseline gap-1.5">
            <dt className="uppercase tracking-[0.15em] text-[9px] text-muted-foreground/70">
              Status
            </dt>
            <dd className="flex items-center gap-1.5">
              <LiveDot />
              <span
                className={cn(
                  connected ? "text-signal" : "text-muted-foreground"
                )}
              >
                {connected ? "live" : "reconnecting"}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Page fold-anchor. The validator and miner losses ARE the
          headline; each is colored by its own trend (mint when falling,
          red when climbing) and tick-flashes whenever the value updates.
          Sentence + diagnostic chips come from networkHealth() and
          contextualize the numbers. Hidden when there's no validator
          data yet; the empty-state component below takes over. */}
      {hasValidatorData && (
        <NetworkHealth
          verdict={healthVerdict}
          validatorLoss={validatorLoss}
          innerLoss={innerLoss}
          sparkline={healthSparkline}
        />
      )}

      {/* Secondary KPI strip. Same numbers, smaller visual weight; reads
          as "details on the verdict" rather than competing primary
          signals. ``live`` marks tiles whose value updates each window.
          Per the Two-Palette Rule, only mint signals live data; amber is
          reserved for actions and never appears here. */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Global Step"
          value={currentStep != null ? currentStep.toLocaleString() : "\u2014"}
          live
          tooltip="Total number of outer-optimizer updates applied to the shared model."
        />
        <StatTile
          label="Tokens Trained"
          value={
            tokensDone != null
              ? tokensDone >= 1e9
                ? `${(tokensDone / 1e9).toFixed(2)}B`
                : `${(tokensDone / 1e6).toFixed(1)}M`
              : "\u2014"
          }
          tooltip="globalStep \u00d7 target_batch_size \u00d7 sequence_length."
        />
        <StatTile
          label="Miners"
          value={versionMinerCount}
          sub={`${onlineCount} online`}
          tooltip="Unique miner UIDs registered for this version."
        />
        <StatTile
          label="Validators"
          value={versionValidatorCount}
          tooltip="Validator nodes for this version."
        />
        <StatTile
          label="Gather Success"
          value={
            lw?.gatherSuccessRate != null
              ? `${lw.gatherSuccessRate.toFixed(1)}%`
              : "\u2014"
          }
          live={
            lw?.gatherSuccessRate != null && lw.gatherSuccessRate > 90
          }
          tooltip="Last window: % of peers whose gradients were successfully collected."
        />
        <StatTile
          label="Eval (acc_norm avg)"
          value={
            latestEvalAccNorm != null
              ? latestEvalAccNorm.toFixed(3)
              : "\u2014"
          }
          tooltip="Mean of latest acc_norm across all benchmark tasks."
        />
      </div>

      {/* Headline: shared model loss as measured by the validator on
          independent random data each window, after applying a typical
          peer's gradient. Random data (not the miner's own data) is the
          unbiased control -- own data can be cherry-picked by miners,
          which is what the Generalization Gap card next to it is for.
          Falls back to the miner-aggregated training loss only when the
          validator hasn't reported any windows yet. */}
      {hasValidatorData ? (
        <MetricExplainer
          title="Model Loss"
          plainSubtitle={"The validator's loss on independent held-out data after applying a typical peer's gradient \u2014 the unbiased read on whether the shared model is actually getting better. Lower is better. X axis is global step (training progress, not wall time)."}
          info={
            <>
              <p>
                Source:{" "}
                <span className="font-mono">windows.lossRandomAfter</span>{" "}
                &mdash; per-window cross-entropy loss measured on
                independent random data after applying each evaluated
                peer&rsquo;s gradient (averaged across peers).
              </p>
              <p className="mt-2">
                Why <em>random</em> not <em>own</em>: miners pick their own
                data, so <span className="font-mono">lossOwnAfter</span> is
                biased and can look great even when the model is
                overfitting. Random data is the validator&rsquo;s unbiased
                control. The gap between the two is what the
                <em> Generalization Gap</em> card below measures.
              </p>
            </>
          }
          headlineValue={lw?.lossRandomAfter?.toFixed(3) ?? null}
        >
          <TimeSeriesChart
            data={allWindows}
            series={[
              {
                key: "lossRandomAfter",
                label: "Validator loss (random data, after gradient)",
                color: "#32ffc8",
              },
            ]}
            yUnit="loss"
            xMode="step"
            xKey="globalStep"
            height={260}
          />
        </MetricExplainer>
      ) : hasMinerData ? (
        <MetricExplainer
          title="Miner Training Loss"
          plainSubtitle={"Validator hasn't reported a window yet \u2014 falling back to the median miner-reported training loss across all active miners. The shaded edges are the 10th\u201390th percentile band. X axis is the training window (training progress, not wall time)."}
          info={
            <>
              <p>
                Source: <span className="font-mono">miner_metrics.loss</span>{" "}
                aggregated by training window across every active miner.
                Each miner sees its own local batches, so this reflects
                per-miner training rather than the shared model directly.
              </p>
            </>
          }
          headlineValue={
            networkAggregated.length > 0
              ? networkAggregated[
                  networkAggregated.length - 1
                ]?.loss?.toFixed(3) ?? null
              : null
          }
        >
          <TimeSeriesChart
            data={
              networkAggregated.length > 0
                ? networkAggregated
                : allMinerMetrics
            }
            series={
              networkAggregated.length > 0
                ? [
                    {
                      key: "lossP10",
                      label: "P10 (best)",
                      color: "#1a9977",
                      dashed: true,
                    },
                    { key: "loss", label: "Median", color: "#32ffc8" },
                    {
                      key: "lossP90",
                      label: "P90 (worst)",
                      color: "#5dffd6",
                      dashed: true,
                    },
                  ]
                : [{ key: "loss", label: "Loss", color: "#32ffc8" }]
            }
            yUnit="loss"
            xMode="step"
            xKey="window"
            height={260}
          />
        </MetricExplainer>
      ) : null}

      {/* Live per-step from each miner */}
      {minerRuns.length > 0 && (
        <MetricExplainer
          title="Live Loss (per inner step)"
          plainSubtitle="Per mini-batch loss from each miner, streaming in real time. Useful for catching divergence the second it happens."
          info={
            <>
              Source: <span className="font-mono">inner_steps.loss</span>{" "}
              streamed per miner. Each colored line is one miner UID. Steps
              within a window roll up into one global step.
            </>
          }
          className="ring-1 ring-signal/20"
        >
          <MultiMinerLossChart minerRuns={minerRuns} height={300} />
        </MetricExplainer>
      )}

      {/* Validator anti-overfitting check */}
      {hasValidatorData && (
        <MetricExplainer
          title="Validator Anti-Overfitting Check"
          plainSubtitle={"The validator simulates applying each miner's gradient and measures the resulting loss change \u2014 once on the data the miner says it trained on (own), once on independent random data. The two derived numbers below tell you whether the network is learning honestly."}
          info={
            <div className="space-y-2">
              <p>
                Each window the validator records four raw losses:{" "}
                <span className="font-mono">loss_own_before/after</span> and{" "}
                <span className="font-mono">loss_random_before/after</span>,
                averaged across all evaluated peers.
              </p>
              <p>
                <strong>Gradient Quality</strong> = how much the gradient
                actually lowered loss on the miner&rsquo;s claimed data.
                Higher is better; a healthy network sits comfortably above
                zero.
              </p>
              <p>
                <strong>Generalization Gap</strong> = improvement_own &minus;
                improvement_random. Near zero is healthy. A persistently
                large positive gap means miners are overfitting to a narrow
                slice of data instead of contributing useful gradients.
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
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Gradient Quality
                </p>
                {latestQuality != null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px]",
                      latestQuality > 0
                        ? "border-positive/30 text-positive"
                        : "border-negative/30 text-negative"
                    )}
                  >
                    {latestQuality >= 0 ? "+" : ""}
                    {latestQuality.toFixed(2)}%
                  </Badge>
                )}
              </div>
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
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Generalization Gap
                </p>
                {latestGap != null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px]",
                      Math.abs(latestGap) < 1
                        ? "border-positive/30 text-positive"
                        : Math.abs(latestGap) < 3
                          ? "border-warning/30 text-warning"
                          : "border-negative/30 text-negative"
                    )}
                  >
                    {latestGap >= 0 ? "+" : ""}
                    {latestGap.toFixed(2)}pp
                  </Badge>
                )}
              </div>
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
              <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Raw losses, per window, averaged across peers.{" "}
                <span className="normal-case tracking-normal text-muted-foreground/70">
                  Mint = miner&rsquo;s own data, sky = independent random
                  data. Dashed = before gradient, solid = after.
                </span>
              </p>
              <TimeSeriesChart
                data={allWindows}
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
                    color: "oklch(0.55 0.14 220)",
                    dashed: true,
                  },
                  {
                    key: "lossRandomAfter",
                    label: "Random \u2014 after",
                    color: "oklch(0.7 0.12 220)",
                  },
                ]}
                yUnit="loss"
                height={220}
              />
            </div>
          )}
        </MetricExplainer>
      )}

      {/* Benchmark Evaluations */}
      {evalTasks.length > 0 && (
        <MetricExplainer
          title="Benchmark Evaluations"
          plainSubtitle={"Standard multiple-choice benchmarks (ARC, HellaSwag, MMLU\u2026) scored against each new global checkpoint. Higher = better. Scoped to the current version."}
          info={
            <>
              Metric is{" "}
              <span className="font-mono">acc_norm</span> (length-normalized
              accuracy), computed in-process via lm-evaluation-harness. One
              tile per task; trend line is per-checkpoint score over time.
              The headline value is the unweighted mean across all tasks.
            </>
          }
          headlineValue={
            latestEvalAccNorm != null ? latestEvalAccNorm.toFixed(3) : null
          }
          contentClassName="pt-1"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {evalTasks.map((task) => {
              const series = evalByTask[task];
              const latest = latestByTask[task];
              const prev =
                series.length >= 2 ? series[series.length - 2] : null;
              const delta =
                latest && prev != null ? latest.score - prev.score : null;
              return (
                <div key={task} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                      {task}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {latest != null ? latest.score.toFixed(3) : "--"}
                      </span>
                      {delta != null && Math.abs(delta) > 1e-4 && (
                        <span
                          className={cn(
                            "font-mono text-[10px] font-medium",
                            delta > 0
                              ? "text-positive"
                              : "text-negative"
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {(delta * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <TimeSeriesChart
                    data={series}
                    series={[
                      { key: "score", label: task, color: "positive" },
                    ]}
                    xKey="window"
                    height={120}
                  />
                </div>
              );
            })}
          </div>
        </MetricExplainer>
      )}

      {/* Network Health */}
      {hasValidatorData && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MetricExplainer
            title="Gather Success"
            plainSubtitle="Percentage of peers whose gradients were collected each window."
            info="The validator drops peers that are slow, offline, or send invalid gradients. A consistently low value points to network or peer health issues, not training quality."
            headlineValue={
              lw?.gatherSuccessRate != null
                ? `${lw.gatherSuccessRate.toFixed(1)}%`
                : null
            }
          >
            <TimeSeriesChart
              data={allWindows}
              series={[
                {
                  key: "gatherSuccessRate",
                  label: "Success %",
                  color: "positive",
                },
              ]}
              yUnit="%"
              yDomain={[0, 100]}
              height={180}
            />
          </MetricExplainer>

          <MetricExplainer
            title="Network Participation"
            plainSubtitle="How many peers were active and how many the validator successfully evaluated."
            info="Active miners report a heartbeat; evaluated UIDs received a full gradient evaluation in the window. A large gap can indicate validator throughput problems."
          >
            <TimeSeriesChart
              data={allWindows}
              series={[
                {
                  key: "activeMiners",
                  label: "Active",
                  color: "#32ffc8",
                },
                {
                  key: "evaluatedUids",
                  label: "Evaluated",
                  color: "#1a9977",
                },
              ]}
              height={180}
            />
          </MetricExplainer>
        </div>
      )}

      {/* Top miners */}
      {topMiners.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Top Miners
              </CardTitle>
              <Link
                href="/nodes?tab=leaderboard"
                className="text-[10px] text-primary hover:underline"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {topMiners.map((miner, idx) => (
                <Link
                  key={miner.uid}
                  href={`/nodes/${encodeURIComponent(miner.hotkey)}`}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/30"
                >
                  <span className="w-5 font-mono text-xs text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <NodeAvatar
                    hotkey={miner.hotkey}
                    uid={miner.uid}
                    showLiveness={false}
                  />
                  <span className="ml-auto font-mono text-xs font-medium tabular-nums">
                    {fmtNumber(miner.finalScore)}
                  </span>
                  {miner.weight != null && miner.weight > 0 && (
                    <span className="font-mono text-[10px] text-positive tabular-nums">
                      {(miner.weight * 100).toFixed(1)}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slashing & Inactivity Events */}
      {recentEvents.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Recent Slash &amp; Inactivity Events
              </CardTitle>
              <Badge variant="destructive" className="text-[10px]">
                {recentEvents.length} events
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Window
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Version
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      UID
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Before
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      After
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((ev, i) => (
                    <tr
                      key={`${ev.evType}-${ev.window}-${ev.uid}-${i}`}
                      className="border-b border-border/50"
                    >
                      <td className="px-3 py-1.5 font-mono">{ev.window}</td>
                      <td className="px-3 py-1.5">
                        <Badge
                          variant={
                            ev.evType === "slash"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {ev.evType}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                        {ev.version ? `v${ev.version}` : "\u2014"}
                      </td>
                      <td className="px-3 py-1.5 font-mono">{ev.uid}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {ev.scoreBefore?.toFixed(4) ?? "\u2014"}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {ev.scoreAfter?.toFixed(4) ?? "\u2014"}
                      </td>
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
      )}

      {/* Differentiated empty state. Three distinct cases that look
          identical without diagnosis. We surface which one we're in so an
          operator can act, not just refresh. */}
      {!hasValidatorData && !hasMinerData && (
        <NetworkEmptyState
          connected={connected}
          totalRuns={allRuns.length}
          versionRuns={runs.length}
          currentVersion={currentVersion}
        />
      )}

      <Glossary />
    </div>
  );
}
