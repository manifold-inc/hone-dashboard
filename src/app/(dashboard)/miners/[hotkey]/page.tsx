"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMinerMetrics, getUidDetail } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { LivenessDot } from "@/components/liveness-dot";
import { RunStatusBadge } from "@/components/run-status-badge";
import { useVersion } from "@/components/version-context";
import Link from "next/link";

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

function RunRow({
  run,
}: {
  run: {
    id: number;
    uid: number | null;
    version: string | null;
    startedAt: string;
    lastSeenAt: string;
  };
}) {
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
        {run.uid ?? "\u2014"}
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
      <TableCell>
        <Link
          href={`/runs/${run.id}`}
          className="text-[10px] text-primary hover:underline"
        >
          View Run
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default function MinerDetailPage({
  params,
}: {
  params: Promise<{ hotkey: string }>;
}) {
  const { hotkey: encodedHotkey } = use(params);
  const hotkey = decodeURIComponent(encodedHotkey);
  const { allRuns } = useVersion();

  const minerRuns = useMemo(() => {
    return allRuns
      .filter((r) => r.hotkey === hotkey && r.role === "miner")
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
  }, [allRuns, hotkey]);

  const latestRun = minerRuns[0];
  const uid = latestRun?.uid;

  const versions = useMemo(() => {
    const vset = new Set<string>();
    for (const r of minerRuns) {
      if (r.version) vset.add(r.version);
    }
    return Array.from(vset).sort().reverse();
  }, [minerRuns]);

  const { data: uidData } = useQuery({
    queryKey: ["uid-detail", uid],
    queryFn: () => getUidDetail(uid!, { limit: 500 }),
    enabled: uid != null,
  });

  const latestScore = uidData?.latestScore ?? null;
  const scoresSorted = useMemo(
    () => [...(uidData?.scores ?? [])].reverse(),
    [uidData?.scores]
  );

  function truncatedHotkey(hk: string): string {
    if (hk.length <= 20) return hk;
    return `${hk.slice(0, 10)}...${hk.slice(-8)}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/miners" className="hover:text-foreground">
            Miners
          </Link>
          <span>/</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Miner {uid !== null && uid !== undefined ? `#${uid}` : ""}
          </h1>
          {latestRun && <LivenessDot hotkey={latestRun.hotkey} />}
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
              {minerRuns.length} run{minerRuns.length !== 1 ? "s" : ""}
            </span>
            <span className="text-border">|</span>
            <span>
              {versions.length} version{versions.length !== 1 ? "s" : ""}
              {versions.length > 0 && ` (${versions.join(", ")})`}
            </span>
            {minerRuns.length > 0 && (
              <>
                <span className="text-border">|</span>
                <span>
                  First seen{" "}
                  {formatDate(
                    minerRuns[minerRuns.length - 1].startedAt
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Score cards */}
      {latestScore && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Final Score"
            value={latestScore.finalScore?.toFixed(4) ?? "\u2014"}
          />
          <MetricCard
            label="Gradient Score"
            value={latestScore.gradientScore?.toFixed(4) ?? "\u2014"}
            trend={
              latestScore.gradientScore !== null
                ? latestScore.gradientScore > 0
                  ? "up"
                  : latestScore.gradientScore < 0
                    ? "down"
                    : "neutral"
                : "neutral"
            }
          />
          <MetricCard
            label="OpenSkill Ordinal"
            value={latestScore.openskillOrdinal?.toFixed(2) ?? "\u2014"}
          />
          <MetricCard
            label="Weight"
            value={
              latestScore.weight !== null
                ? `${(latestScore.weight * 100).toFixed(2)}%`
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
                { key: "gradientScore", label: "Gradient", color: "#1a9977" },
                { key: "syncScore", label: "Sync", color: "#0dcc9e" },
                { key: "weight", label: "Weight", color: "#5dffd6" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>
      )}

      {/* Runs table */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight mb-3">
          All Runs
        </h2>
        {minerRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No runs found for this miner
          </p>
        ) : (
          <div className="rounded-md border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Loss</TableHead>
                  <TableHead>Tok/s</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {minerRuns.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
