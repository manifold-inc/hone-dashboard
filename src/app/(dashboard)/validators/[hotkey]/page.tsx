"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWindows } from "@/lib/api";
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
        <Link href={`/runs/${run.id}`} className="text-primary hover:underline">
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

export default function ValidatorDetailPage({
  params,
}: {
  params: Promise<{ hotkey: string }>;
}) {
  const { hotkey: encodedHotkey } = use(params);
  const hotkey = decodeURIComponent(encodedHotkey);
  const { allRuns } = useVersion();

  const validatorRuns = useMemo(() => {
    return allRuns
      .filter((r) => r.hotkey === hotkey && r.role === "validator")
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
  }, [allRuns, hotkey]);

  const latestRun = validatorRuns[0];
  const uid = latestRun?.uid;

  const versions = useMemo(() => {
    const vset = new Set<string>();
    for (const r of validatorRuns) {
      if (r.version) vset.add(r.version);
    }
    return Array.from(vset).sort().reverse();
  }, [validatorRuns]);

  function truncatedHotkey(hk: string): string {
    if (hk.length <= 20) return hk;
    return `${hk.slice(0, 10)}...${hk.slice(-8)}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/validators" className="hover:text-foreground">
            Validators
          </Link>
          <span>/</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Validator {uid !== null && uid !== undefined ? `#${uid}` : ""}
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
              {validatorRuns.length} run
              {validatorRuns.length !== 1 ? "s" : ""}
            </span>
            <span className="text-border">|</span>
            <span>
              {versions.length} version
              {versions.length !== 1 ? "s" : ""}
              {versions.length > 0 && ` (${versions.join(", ")})`}
            </span>
            {latestRun && (
              <>
                <span className="text-border">|</span>
                <span>
                  First seen {formatDate(validatorRuns[validatorRuns.length - 1].startedAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Runs table */}
      {validatorRuns.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No runs found for this validator
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
                <TableHead>Loss (own)</TableHead>
                <TableHead>Gather %</TableHead>
                <TableHead>Global Step</TableHead>
                <TableHead>Windows</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatorRuns.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
