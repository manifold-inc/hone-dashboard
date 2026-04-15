"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMinerMetrics } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LivenessDot } from "@/components/liveness-dot";
import { RunStatusBadge } from "@/components/run-status-badge";
import { VersionHeader } from "@/components/version-header";
import { useVersion } from "@/components/version-context";
import Link from "next/link";

function truncateHotkey(hotkey: string): string {
  if (hotkey.length <= 12) return hotkey;
  return `${hotkey.slice(0, 6)}...${hotkey.slice(-4)}`;
}

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

function MinerRow({
  run,
}: {
  run: {
    id: number;
    uid: number | null;
    hotkey: string;
    version: string | null;
    startedAt: string;
    lastSeenAt: string;
  };
}) {
  const { data } = useQuery({
    queryKey: ["miner-metrics", run.id],
    queryFn: () => getMinerMetrics(String(run.id), { limit: 1 }),
  });

  const latest = data?.miners?.[0];

  return (
    <TableRow className="hover:bg-accent/30">
      <TableCell>
        <div className="flex items-center gap-2">
          <LivenessDot hotkey={run.hotkey} />
          <RunStatusBadge lastSeenAt={run.lastSeenAt} />
        </div>
      </TableCell>
      <TableCell>
        {run.uid !== null ? (
          <Link href={`/uid/${run.uid}`}>
            <Badge variant="outline" className="font-mono text-xs">
              {run.uid}
            </Badge>
          </Link>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs" title={run.hotkey}>
        {truncateHotkey(run.hotkey)}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.loss?.toFixed(4) ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.tokensPerSec?.toFixed(0) ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.gradNorm?.toFixed(4) ?? "\u2014"}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {latest?.globalStep?.toLocaleString() ?? "\u2014"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {timeAgo(run.lastSeenAt)}
      </TableCell>
      <TableCell>
        <Link
          href={`/runs/${run.id}`}
          className="text-[10px] text-primary hover:underline"
        >
          Details
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default function MinersPage() {
  const { allRuns, currentVersion } = useVersion();

  const allMiners = allRuns.filter((r) => r.role === "miner");
  const miners = currentVersion
    ? allMiners.filter((r) => r.version === currentVersion)
    : allMiners;

  const minersByUid = useMemo(() => {
    const map = new Map<number, (typeof miners)[0]>();
    for (const r of miners) {
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
  }, [miners]);

  return (
    <div className="space-y-6">
      <div>
        <VersionHeader title="Miners" />
        <p className="mt-1.5 text-sm text-muted-foreground">
          {minersByUid.length} unique miner
          {minersByUid.length !== 1 ? "s" : ""} across {miners.length} run
          {miners.length !== 1 ? "s" : ""}
        </p>
      </div>

      {minersByUid.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No miners registered yet
        </p>
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Hotkey</TableHead>
                <TableHead>Loss</TableHead>
                <TableHead>Tok/s</TableHead>
                <TableHead>Grad Norm</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {minersByUid.map((run) => (
                <MinerRow key={run.id} run={run} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
