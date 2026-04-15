"use client";

import { useMemo } from "react";
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

function ValidatorRow({
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
    queryKey: ["windows", run.id, "latest"],
    queryFn: () => getWindows(String(run.id), { limit: 1 }),
  });

  const { data: allData } = useQuery({
    queryKey: ["windows", run.id, "count"],
    queryFn: () => getWindows(String(run.id), { limit: 5000 }),
  });

  const latest = data?.windows?.[0] ?? null;
  const windowCount = allData?.windows?.length ?? 0;

  const detailHref = `/validators/${encodeURIComponent(run.hotkey)}`;

  return (
    <TableRow className="cursor-pointer hover:bg-accent/30" onClick={() => window.location.href = detailHref}>
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
      <TableCell>
        <Link
          href={detailHref}
          className="text-[10px] text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default function ValidatorsPage() {
  const { allRuns, currentVersion } = useVersion();

  const allValidators = allRuns.filter((r) => r.role === "validator");
  const validators = currentVersion
    ? allValidators.filter((r) => r.version === currentVersion)
    : allValidators;

  const validatorsByUid = useMemo(() => {
    const map = new Map<number, (typeof validators)[0]>();
    for (const r of validators) {
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
  }, [validators]);

  return (
    <div className="space-y-6">
      <div>
        <VersionHeader title="Validators" />
        <p className="mt-1.5 text-sm text-muted-foreground">
          {validatorsByUid.length} unique validator
          {validatorsByUid.length !== 1 ? "s" : ""} across{" "}
          {validators.length} run
          {validators.length !== 1 ? "s" : ""}
        </p>
      </div>

      {validatorsByUid.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No validators registered yet
        </p>
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Hotkey</TableHead>
                <TableHead>Loss (own)</TableHead>
                <TableHead>Gather %</TableHead>
                <TableHead>Global Step</TableHead>
                <TableHead>Windows</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatorsByUid.map((run) => (
                <ValidatorRow key={run.id} run={run} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
