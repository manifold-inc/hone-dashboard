"use client";

import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getMinerMetrics, getWindows, getLeaderboard } from "@/lib/api";
import type { LeaderboardEntry, TrainingRun } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LivenessDot } from "@/components/liveness-dot";
import { RunStatusBadge } from "@/components/run-status-badge";
import { VersionHeader } from "@/components/version-header";
import { useVersion } from "@/components/version-context";
import { NodeAvatar, truncateHotkey } from "@/components/node-avatar";
import { cn } from "@/lib/utils";

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

function fmtNumber(v: number | null | undefined, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}

function MinerRow({
  run,
  score,
}: {
  run: TrainingRun;
  score?: LeaderboardEntry;
}) {
  const { data } = useQuery({
    queryKey: ["miner-metrics", run.id, "latest"],
    queryFn: () => getMinerMetrics(String(run.id), { limit: 1 }),
  });

  const latest = data?.miners?.[0];
  const detailHref = `/nodes/${encodeURIComponent(run.hotkey)}`;

  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/30"
      onClick={() => (window.location.href = detailHref)}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <LivenessDot hotkey={run.hotkey} />
          <RunStatusBadge lastSeenAt={run.lastSeenAt} />
        </div>
      </TableCell>
      <TableCell>
        {run.uid !== null ? (
          <Badge variant="outline" className="font-mono text-xs">
            {run.uid}
          </Badge>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs" title={run.hotkey}>
        {truncateHotkey(run.hotkey)}
      </TableCell>
      <TableCell
        className={cn(
          "font-mono text-xs tabular-nums",
          score?.finalScore != null
            ? score.finalScore > 0
              ? "text-positive"
              : score.finalScore < 0
                ? "text-negative"
                : ""
            : "text-muted-foreground"
        )}
      >
        {fmtNumber(score?.finalScore)}
      </TableCell>
      <TableCell
        className={cn(
          "font-mono text-xs tabular-nums",
          score?.weight != null && score.weight > 0
            ? "text-positive"
            : "text-muted-foreground"
        )}
      >
        {score?.weight != null && score.weight > 0
          ? `${(score.weight * 100).toFixed(2)}%`
          : "\u2014"}
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
        {timeAgo(run.lastSeenAt)}
      </TableCell>
    </TableRow>
  );
}

function ValidatorRow({ run }: { run: TrainingRun }) {
  const { data } = useQuery({
    queryKey: ["windows", run.id, "latest"],
    queryFn: () => getWindows(String(run.id), { limit: 1 }),
  });
  const { data: countData } = useQuery({
    queryKey: ["windows", run.id, "count"],
    queryFn: () => getWindows(String(run.id), { limit: 5000 }),
  });

  const latest = data?.windows?.[0] ?? null;
  const windowCount = countData?.windows?.length ?? 0;
  const detailHref = `/nodes/${encodeURIComponent(run.hotkey)}`;

  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/30"
      onClick={() => (window.location.href = detailHref)}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <LivenessDot hotkey={run.hotkey} />
          <RunStatusBadge lastSeenAt={run.lastSeenAt} />
        </div>
      </TableCell>
      <TableCell>
        {run.uid !== null ? (
          <Badge variant="outline" className="font-mono text-xs">
            {run.uid}
          </Badge>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs" title={run.hotkey}>
        {truncateHotkey(run.hotkey)}
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

function NodesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "miners";

  const { allRuns, currentVersion } = useVersion();

  const filtered = currentVersion
    ? allRuns.filter((r) => r.version === currentVersion)
    : allRuns;

  const allMiners = filtered.filter((r) => r.role === "miner");
  const allValidators = filtered.filter((r) => r.role === "validator");

  const minersByUid = useMemo(() => {
    const map = new Map<number, TrainingRun>();
    for (const r of allMiners) {
      if (r.uid === null) continue;
      const existing = map.get(r.uid);
      if (
        !existing ||
        new Date(r.lastSeenAt) > new Date(existing.lastSeenAt)
      ) {
        map.set(r.uid, r);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (a.uid ?? 0) - (b.uid ?? 0)
    );
  }, [allMiners]);

  const validatorsByUid = useMemo(() => {
    const map = new Map<number, TrainingRun>();
    for (const r of allValidators) {
      if (r.uid === null) continue;
      const existing = map.get(r.uid);
      if (
        !existing ||
        new Date(r.lastSeenAt) > new Date(existing.lastSeenAt)
      ) {
        map.set(r.uid, r);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (a.uid ?? 0) - (b.uid ?? 0)
    );
  }, [allValidators]);

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard({ limit: 256 }),
  });

  const scoresByUid = useMemo(() => {
    const map = new Map<number, LeaderboardEntry>();
    for (const e of leaderboardData?.leaderboard ?? []) {
      map.set(e.uid, e);
    }
    return map;
  }, [leaderboardData]);

  const onChangeTab = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/nodes?${params.toString()}`, { scroll: false });
  };

  const totalRuns = filtered.length;

  return (
    <div className="space-y-6">
      <div>
        <VersionHeader title="Nodes" />
        <p className="mt-1.5 text-sm text-muted-foreground">
          {minersByUid.length} miners &middot; {validatorsByUid.length}{" "}
          validators across {totalRuns} run{totalRuns !== 1 ? "s" : ""}
        </p>
      </div>

      <Tabs value={tab} onValueChange={onChangeTab}>
        <TabsList>
          <TabsTrigger value="miners">
            Miners <span className="ml-1.5 text-muted-foreground">({minersByUid.length})</span>
          </TabsTrigger>
          <TabsTrigger value="validators">
            Validators <span className="ml-1.5 text-muted-foreground">({validatorsByUid.length})</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            Leaderboard{" "}
            <span className="ml-1.5 text-muted-foreground">
              ({leaderboardData?.leaderboard?.length ?? 0})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="miners" className="pt-4">
          {minersByUid.length === 0 ? (
            <EmptyState>No miners registered yet</EmptyState>
          ) : (
            <Card className="bg-card/60">
              <CardContent className="p-0">
                <div className="rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>UID</TableHead>
                        <TableHead>Hotkey</TableHead>
                        <TableHead>Final Score</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Loss</TableHead>
                        <TableHead>Tok/s</TableHead>
                        <TableHead>Step</TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minersByUid.map((run) => (
                        <MinerRow
                          key={run.id}
                          run={run}
                          score={
                            run.uid != null ? scoresByUid.get(run.uid) : undefined
                          }
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="validators" className="pt-4">
          {validatorsByUid.length === 0 ? (
            <EmptyState>No validators registered yet</EmptyState>
          ) : (
            <Card className="bg-card/60">
              <CardContent className="p-0">
                <div className="rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>UID</TableHead>
                        <TableHead>Hotkey</TableHead>
                        <TableHead>Loss (own)</TableHead>
                        <TableHead>Gather %</TableHead>
                        <TableHead>Step</TableHead>
                        <TableHead>Windows</TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatorsByUid.map((run) => (
                        <ValidatorRow key={run.id} run={run} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="pt-4">
          <LeaderboardTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground py-12 text-center">
      {children}
    </p>
  );
}

type SortKey =
  | "rank"
  | "uid"
  | "finalScore"
  | "gradientScore"
  | "syncScore"
  | "openskillOrdinal"
  | "weight"
  | "hotkey"
  | "window";

function numericSortValue(
  v: number | null | undefined,
  dir: "asc" | "desc"
): number {
  if (v === null || v === undefined) {
    return dir === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  return v;
}

const LEADERBOARD_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "uid", label: "UID" },
  { key: "finalScore", label: "Final Score" },
  { key: "gradientScore", label: "Gradient" },
  { key: "syncScore", label: "Sync" },
  { key: "openskillOrdinal", label: "OpenSkill" },
  { key: "weight", label: "Weight" },
  { key: "hotkey", label: "Hotkey" },
  { key: "window", label: "Window" },
];

function LeaderboardTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard({ limit: 256 }),
  });

  const [sortKey, setSortKey] = useState<SortKey>("finalScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const rowsWithRank = useMemo(() => {
    const entries = data?.leaderboard ?? [];
    const sorted = [...entries].sort((a, b) => {
      const av = numericSortValue(a.finalScore, "desc");
      const bv = numericSortValue(b.finalScore, "desc");
      if (av !== bv) return bv - av;
      return a.uid - b.uid;
    });
    return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [data?.leaderboard]);

  const sortedRows = useMemo(() => {
    const mul = sortDirection === "desc" ? -1 : 1;
    return [...rowsWithRank].sort((a, b) => {
      if (sortKey === "hotkey") {
        return mul * a.hotkey.localeCompare(b.hotkey);
      }
      const av = numericSortValue(
        sortKey === "rank"
          ? a.rank
          : sortKey === "uid"
            ? a.uid
            : sortKey === "window"
              ? a.window
              : (a[sortKey] as number | null | undefined),
        sortDirection
      );
      const bv = numericSortValue(
        sortKey === "rank"
          ? b.rank
          : sortKey === "uid"
            ? b.uid
            : sortKey === "window"
              ? b.window
              : (b[sortKey] as number | null | undefined),
        sortDirection
      );
      if (av !== bv) return mul * (av < bv ? -1 : 1);
      return a.uid - b.uid;
    });
  }, [rowsWithRank, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  if (isLoading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </p>
    );
  }
  if (!data || data.leaderboard.length === 0) {
    return <EmptyState>No leaderboard data yet</EmptyState>;
  }

  return (
    <Card className="bg-card/60">
      <CardContent className="p-0">
        <div className="rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {LEADERBOARD_COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer select-none whitespace-nowrap text-xs"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-foreground">
                          {sortDirection === "desc" ? "\u25BC" : "\u25B2"}
                        </span>
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.uid} className="hover:bg-accent/30">
                  <TableCell className="font-mono text-xs">
                    {row.rank}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Link
                      href={`/nodes/${encodeURIComponent(row.hotkey)}`}
                      className="inline-block"
                    >
                      <Badge variant="outline" className="font-mono text-xs">
                        {row.uid}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      row.finalScore != null
                        ? row.finalScore > 0
                          ? "text-positive"
                          : row.finalScore < 0
                            ? "text-negative"
                            : ""
                        : ""
                    )}
                  >
                    {fmtNumber(row.finalScore)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      row.gradientScore != null
                        ? row.gradientScore > 0
                          ? "text-positive"
                          : "text-negative"
                        : ""
                    )}
                  >
                    {fmtNumber(row.gradientScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {fmtNumber(row.syncScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {fmtNumber(row.openskillOrdinal, 2)}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {row.weight === null || row.weight === undefined
                      ? "\u2014"
                      : `${(row.weight * 100).toFixed(2)}%`}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs"
                    title={row.hotkey}
                  >
                    <Link
                      href={`/nodes/${encodeURIComponent(row.hotkey)}`}
                      className="hover:underline"
                    >
                      <NodeAvatar
                        hotkey={row.hotkey}
                        showLiveness={false}
                      />
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.window}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NodesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
      <NodesContent />
    </Suspense>
  );
}
