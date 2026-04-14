"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getNetworkStats,
  getRuns,
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

function StatTile({
  label,
  value,
  sub,
  trend,
  accent,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
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
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
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

function VersionDropdown({
  title,
  versions,
  currentVersion,
  latestVersion,
  isLatest,
  onSelect,
}: {
  title: string;
  versions: { version: string; count: number; latest: string }[];
  currentVersion: string | null;
  latestVersion: string | null;
  isLatest: boolean;
  onSelect: (version: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2"
      >
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <svg
          className={cn(
            "mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:text-foreground",
            open && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {!isLatest && (
          <Badge variant="outline" className="text-[10px] text-warning">
            Historical
          </Badge>
        )}
      </button>

      {open && versions.length > 0 && (
        <div className="absolute left-0 z-50 mt-2 min-w-[220px] rounded-md border border-border/60 bg-card p-1 shadow-xl shadow-black/30 backdrop-blur-xl">
          {versions.map((v) => {
            const active = v.version === currentVersion;
            const isLt = v.version === latestVersion;
            return (
              <button
                key={v.version}
                onClick={() => {
                  onSelect(v.version);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <span className="font-mono font-medium">v{v.version}</span>
                {isLt && (
                  <Badge
                    variant="outline"
                    className="ml-auto border-primary/30 text-[9px] text-primary"
                  >
                    latest
                  </Badge>
                )}
                {!isLt && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {v.count} run{v.count !== 1 ? "s" : ""}
                  </span>
                )}
                {active && (
                  <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const { connected, onlineCount } = useLiveContext();
  const { data, isLoading, error } = useQuery({
    queryKey: ["network-stats"],
    queryFn: getNetworkStats,
  });

  const { data: allRunsData } = useQuery({
    queryKey: ["runs-overview-all"],
    queryFn: () => getRuns({ limit: 20 }),
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard-preview"],
    queryFn: () => getLeaderboard({ limit: 10 }),
  });

  const allRuns = allRunsData?.runs ?? [];

  const availableVersions = useMemo(() => {
    const vset = new Map<string, { version: string; count: number; latest: string }>();
    for (const r of allRuns) {
      if (!r.version) continue;
      const existing = vset.get(r.version);
      if (existing) {
        existing.count++;
        if (r.lastSeenAt > existing.latest) existing.latest = r.lastSeenAt;
      } else {
        vset.set(r.version, { version: r.version, count: 1, latest: r.lastSeenAt });
      }
    }
    return Array.from(vset.values()).sort((a, b) => b.latest.localeCompare(a.latest));
  }, [allRuns]);

  const latestVersion = availableVersions[0]?.version ?? null;
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const currentVersion = selectedVersion ?? latestVersion;

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
  const isLatest = currentVersion === latestVersion;

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

  const lw = isLatest ? data.latestWindow : null;
  const runTitle = currentVersion ? `Hone v${currentVersion}` : "Hone Network";

  const topMiners =
    leaderboardData?.leaderboard
      ?.slice()
      .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
      .slice(0, 5) ?? [];

  const allWindows = (windowsData?.windows ?? []).slice().reverse();
  const allMinerMetrics = (minerData?.miners ?? []).slice().reverse();
  const latestMiner = allMinerMetrics[allMinerMetrics.length - 1];

  const improvementData = allWindows
    .filter((w) => w.lossOwnImprovement !== null)
    .map((w) => ({
      window: w.window,
      improvement: (w.lossOwnImprovement ?? 0) * 100,
      createdAt: w.createdAt,
    }));

  const recentEvents = [
    ...(slashData?.slashes ?? []).map((s) => ({
      ...s,
      evType: "slash" as const,
      reason: s.reason,
    })),
    ...(inactivityData?.inactivity ?? []).map((e) => ({
      ...e,
      evType: "inactivity" as const,
      reason: null as string | null,
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
        <VersionDropdown
          title={runTitle}
          versions={availableVersions}
          currentVersion={currentVersion}
          latestVersion={latestVersion}
          isLatest={isLatest}
          onSelect={(v) =>
            setSelectedVersion(v === latestVersion ? null : v)
          }
        />
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center">
            <LiveDot />
            <span
              className={
                connected ? "text-primary" : "text-muted-foreground"
              }
            >
              {connected ? "Live" : "Reconnecting..."}
            </span>
          </span>
          <span className="text-border">|</span>
          <span>Subnet 5</span>
          {lw && (
            <>
              <span className="text-border">|</span>
              <span>Window {lw.window?.toLocaleString()}</span>
              <span className="text-border">|</span>
              <span>Step {lw.globalStep.toLocaleString()}</span>
            </>
          )}
          {!lw && latestMiner && (
            <>
              <span className="text-border">|</span>
              <span>
                Window {latestMiner.window.toLocaleString()}
              </span>
              <span className="text-border">|</span>
              <span>
                Step {latestMiner.globalStep.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Dense stat tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatTile label="Active Miners" value={data.activeMiners} accent />
        <StatTile label="Validators" value={data.activeValidators} />
        <StatTile
          label="Connected"
          value={onlineCount}
          sub={connected ? "Live" : "Reconnecting"}
          accent
        />
        <StatTile
          label="Total Windows"
          value={data.totalWindows.toLocaleString()}
        />
        <StatTile label="Active Runs" value={data.activeRuns} />

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
            />
            <StatTile
              label="Gather Success"
              value={`${lw.gatherSuccessRate?.toFixed(1) ?? 0}%`}
              accent={
                lw.gatherSuccessRate !== null && lw.gatherSuccessRate > 90
              }
            />
            <StatTile
              label="Global Step"
              value={lw.globalStep.toLocaleString()}
            />
            <StatTile
              label="Evaluated UIDs"
              value={lw.evaluatedUids ?? 0}
            />
          </>
        )}

        {!lw && latestMiner && (
          <>
            <StatTile
              label="Miner Loss"
              value={latestMiner.loss?.toFixed(4) ?? "\u2014"}
              accent
            />
            <StatTile
              label="Tokens/sec"
              value={latestMiner.tokensPerSec?.toFixed(0) ?? "\u2014"}
            />
            <StatTile
              label="Global Step"
              value={latestMiner.globalStep.toLocaleString()}
            />
            <StatTile
              label="Gather Peers"
              value={latestMiner.gatherPeers ?? 0}
            />
          </>
        )}
      </div>

      {/* Live Loss per step (all miners) */}
      {minerRuns.length > 0 && (
        <Card className="bg-card/60 border-emerald-900/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live Loss (per step)
              </CardTitle>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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
                  { key: "loss", label: "Loss", color: "#37f712" },
                ]}
                height={220}
              />
            </CardContent>
          </Card>

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
                    color: "#a3a3a3",
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
                  { key: "gradNorm", label: "Grad Norm", color: "#a3a3a3" },
                  { key: "weightNorm", label: "Weight Norm", color: "#525252" },
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
                    color: "#d4d4d4",
                  },
                  {
                    key: "gpuMemoryCached",
                    label: "Cached (MB)",
                    color: "#525252",
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
                  { key: "lossOwnBefore", label: "Before", color: "#525252" },
                  { key: "lossOwnAfter", label: "After", color: "#37f712" },
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
                      color: "#a3a3a3",
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
                      color: "#37f712",
                    },
                    {
                      key: "evaluatedUids",
                      label: "Evaluated UIDs",
                      color: "#525252",
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
                      href="/overview/leaderboard"
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
                        href={`/overview/uid/${miner.uid}`}
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
                href="/overview/leaderboard"
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
                  href={`/overview/uid/${miner.uid}`}
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
                      <td className="px-3 py-1.5 font-mono">
                        <Link
                          href={`/overview/uid/${ev.uid}`}
                          className="text-primary hover:underline"
                        >
                          {ev.uid}
                        </Link>
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
