"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getNetworkStats,
  getLeaderboard,
  getWindows,
  getMinerMetrics,
  getSlashEvents,
  getInactivityEvents,
} from "@/lib/api";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { MultiMinerLossChart } from "@/components/charts/multi-miner-loss-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveContext } from "@/components/live-update-provider";
import { cn } from "@/lib/utils";
import { useVersion } from "@/components/version-context";
import { VersionHeader } from "@/components/version-header";

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((s) => !s)}
        className="ml-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border/60 text-[8px] font-medium text-muted-foreground/60 transition-colors hover:border-primary/40 hover:text-muted-foreground"
      >
        i
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-normal rounded border border-border/60 bg-popover px-2.5 py-1.5 text-[10px] leading-relaxed text-popover-foreground shadow-lg w-48 text-center">
          {text}
        </span>
      )}
    </span>
  );
}

function StatTile({
  label,
  value,
  sub,
  trend,
  accent,
  info,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
  info?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card/60 px-4 py-3",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
        {info && <InfoTooltip text={info} />}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-xl font-semibold tabular-nums tracking-tight",
            accent && "text-primary"
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
    <span className="relative mr-1.5 inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ backgroundColor: "#32ffc8" }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "#32ffc8" }} />
    </span>
  );
}

function fmtNumber(v: number | null | undefined, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}

function truncateHotkey(hotkey: string): string {
  if (hotkey.length <= 10) return hotkey;
  return `${hotkey.slice(0, 5)}...${hotkey.slice(-4)}`;
}

export default function OverviewPage() {
  const { connected, onlineCount } = useLiveContext();
  const { allRuns, currentVersion, isLatest } = useVersion();
  const { data, isLoading, error } = useQuery({
    queryKey: ["network-stats"],
    queryFn: getNetworkStats,
  });

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
    queryKey: ["miner-metrics-overview", minerRunId],
    queryFn: () => getMinerMetrics(String(minerRunId!), { limit: 2000 }),
    enabled: minerRunId != null,
  });

  const { data: slashData } = useQuery({
    queryKey: ["slashes-overview", validatorRunId],
    queryFn: () => getSlashEvents(String(validatorRunId!), { limit: 20 }),
    enabled: validatorRunId != null,
  });

  const { data: inactivityData } = useQuery({
    queryKey: ["inactivity-overview", validatorRunId],
    queryFn: () => getInactivityEvents(String(validatorRunId!), { limit: 20 }),
    enabled: validatorRunId != null,
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

  const topMiners =
    leaderboardData?.leaderboard
      ?.slice()
      .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
      .slice(0, 5) ?? [];

  const allWindows = (windowsData?.windows ?? []).slice().reverse();
  const allMinerMetrics = (minerData?.miners ?? []).slice().reverse();
  const latestMiner = allMinerMetrics[allMinerMetrics.length - 1];
  const latestWindow = allWindows[allWindows.length - 1] ?? null;

  const lw = latestWindow;

  const versionMinerCount = minerRuns.length;
  const versionValidatorCount = runs.filter((r) => r.role === "validator").length;
  const versionRunCount = runs.length;
  const versionWindowCount = allWindows.length || allMinerMetrics.length;

  const currentStep = latestWindow?.globalStep ?? latestMiner?.globalStep ?? null;
  const currentWindowNum = latestWindow?.window ?? latestMiner?.window ?? null;

  const improvementData = allWindows
    .filter((w) => w.lossOwnImprovement !== null)
    .map((w) => ({
      window: w.window,
      improvement: (w.lossOwnImprovement ?? 0) * 100,
      createdAt: w.createdAt,
    }));

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
  const hasMinerData = allMinerMetrics.length > 0;

  return (
    <div className="space-y-6">
      {/* iOS-style title with version selector */}
      <div className="pt-2">
        <VersionHeader title="Hone" />
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center">
            <LiveDot />
            <span
              className={connected ? "" : "text-muted-foreground"}
              style={connected ? { color: "#32ffc8" } : undefined}
            >
              {connected ? "Live" : "Reconnecting..."}
            </span>
          </span>
          <span className="text-border">|</span>
          <span>Subnet 5</span>
          {currentWindowNum != null && (
            <>
              <span className="text-border">|</span>
              <span>Window {currentWindowNum.toLocaleString()}</span>
            </>
          )}
          {currentStep != null && (
            <>
              <span className="text-border">|</span>
              <span>Step {currentStep.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Training Loss (per window) */}
      {hasMinerData && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Training Loss
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">
                  ({allMinerMetrics.length} windows)
                </span>
              </CardTitle>
              {latestMiner?.loss != null && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {latestMiner.loss.toFixed(4)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={allMinerMetrics}
              series={[
                { key: "loss", label: "Loss", color: "#32ffc8" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>
      )}

      {/* Dense stat tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatTile
          label="Miners"
          value={versionMinerCount}
          accent
          info="Number of miner nodes in this version."
        />
        <StatTile
          label="Validators"
          value={versionValidatorCount}
          info="Validator nodes in this version."
        />
        <StatTile
          label="Connected"
          value={onlineCount}
          sub={connected ? "Live" : "Reconnecting"}
          accent
          info="Nodes connected via WebSocket right now."
        />
        <StatTile
          label="Windows"
          value={versionWindowCount.toLocaleString()}
          info="Training windows recorded for this version."
        />
        <StatTile
          label="Runs"
          value={versionRunCount}
          info="Total training run processes for this version."
        />

        {lw && (
          <>
            <StatTile
              label="Loss (own)"
              value={lw.lossOwnAfter?.toFixed(4) ?? "\u2014"}
              sub={
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
              info="Validator's own-data loss after the latest training window. Lower is better."
            />
            <StatTile
              label="Gather Success"
              value={`${lw.gatherSuccessRate?.toFixed(1) ?? 0}%`}
              accent={
                lw.gatherSuccessRate !== null && lw.gatherSuccessRate > 90
              }
              info="Percentage of peers that successfully contributed gradients in the latest gather round."
            />
            <StatTile
              label="Global Step"
              value={lw.globalStep.toLocaleString()}
              info="Total number of gradient updates applied to the shared model."
            />
            <StatTile
              label="Evaluated UIDs"
              value={lw.evaluatedUids ?? 0}
              info="Number of unique miner UIDs evaluated by the validator in the latest window."
            />
          </>
        )}

        {!lw && latestMiner && (
          <>
            <StatTile
              label="Miner Loss"
              value={latestMiner.loss?.toFixed(4) ?? "\u2014"}
              accent
              info="Current training loss on the miner's local data. Lower means the model is learning."
            />
            <StatTile
              label="Tokens/sec"
              value={latestMiner.tokensPerSec?.toFixed(0) ?? "\u2014"}
              info="Training throughput in tokens processed per second."
            />
            <StatTile
              label="Global Step"
              value={latestMiner.globalStep.toLocaleString()}
              info="Total number of gradient updates applied to the shared model."
            />
            <StatTile
              label="Gather Peers"
              value={latestMiner.gatherPeers ?? 0}
              info="Number of peers this miner exchanged gradients with in the last window."
            />
          </>
        )}
      </div>

      {/* Live Loss per step (all miners) */}
      {minerRuns.length > 0 && (
        <Card className="bg-card/60" style={{ borderColor: "rgba(50, 255, 200, 0.15)" }}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live Loss (per step)
              </CardTitle>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "#32ffc8" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "#32ffc8" }} />
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {minerRuns.length} miner{minerRuns.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <MultiMinerLossChart minerRuns={minerRuns} height={320} />
          </CardContent>
        </Card>
      )}

      {/* Miner training charts */}
      {hasMinerData && (
        <div className="grid gap-2 lg:grid-cols-2">

          <Card className="bg-card/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Throughput
                </CardTitle>
                {latestMiner?.tokensPerSec != null && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {latestMiner.tokensPerSec.toFixed(0)} tok/s
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                data={allMinerMetrics}
                series={[
                  {
                    key: "tokensPerSec",
                    label: "Tokens/sec",
                    color: "#32ffc8",
                  },
                ]}
                height={220}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Norms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                data={allMinerMetrics}
                series={[
                  { key: "gradNorm", label: "Grad Norm", color: "#32ffc8" },
                  { key: "weightNorm", label: "Weight Norm", color: "#1a9977" },
                ]}
                height={220}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                GPU Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                data={allMinerMetrics}
                series={[
                  {
                    key: "gpuMemoryAllocated",
                    label: "Allocated (MB)",
                    color: "#32ffc8",
                  },
                  {
                    key: "gpuMemoryCached",
                    label: "Cached (MB)",
                    color: "#1a9977",
                  },
                ]}
                height={220}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validator window charts */}
      {hasValidatorData && (
        <>
          <Card className="bg-card/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Loss Curve
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">
                    ({allWindows.length} windows)
                  </span>
                </CardTitle>
                {lw?.lossOwnAfter != null && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Latest: {lw.lossOwnAfter.toFixed(4)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                data={allWindows}
                series={[
                  { key: "lossOwnBefore", label: "Before", color: "#1a9977" },
                  { key: "lossOwnAfter", label: "After", color: "#32ffc8" },
                ]}
                height={300}
              />
            </CardContent>
          </Card>

          <div className="grid gap-2 lg:grid-cols-2">
            {improvementData.length > 0 && (
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Loss Improvement %
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart
                    data={improvementData}
                    series={[
                      {
                        key: "improvement",
                        label: "Improvement %",
                        color: "positive",
                      },
                    ]}
                    height={180}
                  />
                </CardContent>
              </Card>
            )}

            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Gather Success Rate
                  </CardTitle>
                  {lw?.gatherSuccessRate != null && (
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px]"
                    >
                      {lw.gatherSuccessRate.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  data={allWindows}
                  series={[
                    {
                      key: "gatherSuccessRate",
                      label: "Success %",
                      color: "#32ffc8",
                    },
                  ]}
                  height={180}
                />
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Network Participation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  data={allWindows}
                  series={[
                    {
                      key: "activeMiners",
                      label: "Active Miners",
                      color: "#32ffc8",
                    },
                    {
                      key: "evaluatedUids",
                      label: "Evaluated UIDs",
                      color: "#1a9977",
                    },
                  ]}
                  height={180}
                />
              </CardContent>
            </Card>

            {topMiners.length > 0 && (
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Top Miners
                    </CardTitle>
                    <Link
                      href="/leaderboard"
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
                        href={`/miners/${encodeURIComponent(miner.hotkey)}`}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30"
                      >
                        <span className="w-5 font-mono text-xs text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          UID {miner.uid}
                        </Badge>
                        <span
                          className="font-mono text-xs text-muted-foreground"
                          title={miner.hotkey}
                        >
                          {truncateHotkey(miner.hotkey)}
                        </span>
                        <span className="ml-auto font-mono text-xs font-medium tabular-nums">
                          {fmtNumber(miner.finalScore)}
                        </span>
                        {miner.weight != null && miner.weight > 0 && (
                          <span className="font-mono text-[10px] text-primary tabular-nums">
                            {(miner.weight * 100).toFixed(1)}%
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Top miners (when no validator data but leaderboard exists) */}
      {!hasValidatorData && topMiners.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Top Miners
              </CardTitle>
              <Link
                href="/leaderboard"
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
                  href={`/miners/${encodeURIComponent(miner.hotkey)}`}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30"
                >
                  <span className="w-5 font-mono text-xs text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    UID {miner.uid}
                  </Badge>
                  <span
                    className="font-mono text-xs text-muted-foreground"
                    title={miner.hotkey}
                  >
                    {truncateHotkey(miner.hotkey)}
                  </span>
                  <span className="ml-auto font-mono text-xs font-medium tabular-nums">
                    {fmtNumber(miner.finalScore)}
                  </span>
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
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent Slashing &amp; Inactivity Events
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
                            ev.evType === "slash" ? "destructive" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {ev.evType}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                        {ev.version ? `v${ev.version}` : "\u2014"}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {ev.uid}
                      </td>
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
    </div>
  );
}
