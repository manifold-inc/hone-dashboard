"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUidDetail } from "@/lib/api";
import { MetricCard } from "@/components/metric-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VersionHeader } from "@/components/version-header";
import { useVersion } from "@/components/version-context";
import { LivenessDot } from "@/components/liveness-dot";
import Link from "next/link";

function truncateHotkey(hotkey: string): string {
  if (hotkey.length <= 16) return hotkey;
  return `${hotkey.slice(0, 8)}...${hotkey.slice(-6)}`;
}

export default function UidDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid: uidStr } = use(params);
  const uid = parseInt(uidStr);
  const { allRuns, currentVersion } = useVersion();

  const { data, isLoading } = useQuery({
    queryKey: ["uid-detail", uid],
    queryFn: () => getUidDetail(uid, { limit: 500 }),
    enabled: Number.isFinite(uid),
  });

  const runVersionMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of allRuns) {
      if (r.version) map.set(r.id, r.version);
    }
    return map;
  }, [allRuns]);

  const versionRunIds = useMemo(() => {
    if (!currentVersion) return null;
    const ids = new Set<number>();
    for (const r of allRuns) {
      if (r.version === currentVersion) ids.add(r.id);
    }
    return ids;
  }, [allRuns, currentVersion]);

  const events = useMemo(() => {
    if (!data) return [];
    const combined = [
      ...data.slashes.map((s) => ({
        ...s,
        type: "slash" as const,
        version: runVersionMap.get(s.runId) ?? null,
      })),
      ...data.inactivity.map((e) => ({
        ...e,
        type: "inactivity" as const,
        reason: null as string | null,
        version: runVersionMap.get(e.runId) ?? null,
      })),
    ];
    const filtered = versionRunIds
      ? combined.filter((ev) => versionRunIds.has(ev.runId))
      : combined;
    filtered.sort((a, b) => b.window - a.window);
    return filtered;
  }, [data, runVersionMap, versionRunIds]);

  const minerRun = useMemo(() => {
    const candidates = allRuns.filter(
      (r) => r.role === "miner" && r.uid === uid
    );
    if (currentVersion) {
      const versionMatch = candidates.find(
        (r) => r.version === currentVersion
      );
      if (versionMatch) return versionMatch;
    }
    return candidates[0] ?? null;
  }, [allRuns, uid, currentVersion]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-muted-foreground">
          No data for UID {uid}
        </p>
      </div>
    );
  }

  const filteredScores = versionRunIds
    ? data.scores.filter((s) => versionRunIds.has(s.runId))
    : data.scores;
  const scoresSorted = [...filteredScores].reverse();
  const latest = scoresSorted[scoresSorted.length - 1] ?? data.latestScore;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/leaderboard" className="hover:text-foreground">
            Leaderboard
          </Link>
          <span>/</span>
          <Link href="/miners" className="hover:text-foreground">
            Miners
          </Link>
          <span>/</span>
        </div>
        <VersionHeader title={`UID ${uid}`} />

        {/* Hotkey + run info */}
        {minerRun && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <LivenessDot hotkey={minerRun.hotkey} />
              <span className="font-mono" title={minerRun.hotkey}>
                {truncateHotkey(minerRun.hotkey)}
              </span>
              <button
                className="text-[10px] text-primary hover:underline"
                onClick={() => {
                  navigator.clipboard.writeText(minerRun.hotkey);
                }}
              >
                Copy
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {minerRun.role}
              </Badge>
              {minerRun.version && (
                <Badge variant="outline" className="text-[10px]">
                  v{minerRun.version}
                </Badge>
              )}
              <span>
                Started{" "}
                {new Date(minerRun.startedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-border">|</span>
              <span>
                Last seen{" "}
                {new Date(minerRun.lastSeenAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-border">|</span>
              <Link
                href={`/runs/${minerRun.id}`}
                className="text-primary hover:underline"
              >
                View Run Details
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Score cards */}
      {latest && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Final Score"
            value={latest.finalScore?.toFixed(4) ?? "\u2014"}
          />
          <MetricCard
            label="Gradient Score"
            value={latest.gradientScore?.toFixed(4) ?? "\u2014"}
            trend={
              latest.gradientScore !== null
                ? latest.gradientScore > 0
                  ? "up"
                  : latest.gradientScore < 0
                    ? "down"
                    : "neutral"
                : "neutral"
            }
          />
          <MetricCard
            label="OpenSkill Ordinal"
            value={latest.openskillOrdinal?.toFixed(2) ?? "\u2014"}
          />
          <MetricCard
            label="Weight"
            value={
              latest.weight !== null
                ? `${(latest.weight * 100).toFixed(2)}%`
                : "\u2014"
            }
          />
        </div>
      )}

      {/* Score History */}
      {scoresSorted.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={scoresSorted}
              series={[
                { key: "finalScore", label: "Final", color: "#32ffc8" },
                {
                  key: "gradientScore",
                  label: "Gradient",
                  color: "#1a9977",
                },
                { key: "syncScore", label: "Sync", color: "#0dcc9e" },
                { key: "weight", label: "Weight", color: "#5dffd6" },
              ]}
              height={280}
            />
          </CardContent>
        </Card>
      )}

      {/* OpenSkill Trajectory */}
      {scoresSorted.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              OpenSkill Trajectory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={scoresSorted}
              series={[
                {
                  key: "openskillMu",
                  label: "Mu (skill)",
                  color: "#32ffc8",
                },
                {
                  key: "openskillOrdinal",
                  label: "Ordinal",
                  color: "#1a9977",
                },
              ]}
              height={220}
            />
          </CardContent>
        </Card>
      )}

      {/* Events */}
      {events.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Events
              </CardTitle>
              <Badge variant="destructive" className="text-[10px]">
                {events.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Window</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Score Before</TableHead>
                    <TableHead>Score After</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev, i) => (
                    <TableRow key={`${ev.type}-${ev.window}-${i}`}>
                      <TableCell className="font-mono text-xs">
                        {ev.window}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ev.type === "slash" ? "destructive" : "outline"
                          }
                          className="text-xs"
                        >
                          {ev.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {ev.version ? `v${ev.version}` : "\u2014"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ev.scoreBefore?.toFixed(4) ?? "\u2014"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ev.scoreAfter?.toFixed(4) ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                        {ev.type === "slash"
                          ? (ev as { reason: string | null }).reason ??
                            "\u2014"
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
