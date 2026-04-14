"use client";

import { useQuery } from "@tanstack/react-query";
import { getRuns, getSlashEvents, getInactivityEvents } from "@/lib/api";
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
import { RunStatusBadge } from "@/components/run-status-badge";
import { LivenessDot } from "@/components/liveness-dot";
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

export default function RunsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: () => getRuns({ limit: 100 }),
  });

  const validatorRun = data?.runs?.find((r) => r.role === "validator");

  const { data: slashData } = useQuery({
    queryKey: ["slashes-runs", validatorRun?.id],
    queryFn: () => getSlashEvents(String(validatorRun!.id), { limit: 30 }),
    enabled: validatorRun != null,
  });

  const { data: inactivityData } = useQuery({
    queryKey: ["inactivity-runs", validatorRun?.id],
    queryFn: () =>
      getInactivityEvents(String(validatorRun!.id), { limit: 30 }),
    enabled: validatorRun != null,
  });

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
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Training Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All registered validator and miner runs
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Loading...</p>
      ) : !data || data.runs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No runs recorded yet
        </p>
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Hotkey</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.map((run) => (
                <TableRow key={run.id} className="cursor-pointer hover:bg-accent/30">
                  <TableCell>
                    <Link href={`/runs/${run.id}`} className="flex items-center gap-2">
                      <LivenessDot hotkey={run.hotkey} />
                      <RunStatusBadge lastSeenAt={run.lastSeenAt} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/runs/${run.id}`} className="block">
                      <Badge variant="outline" className="text-xs">
                        {run.role}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="block font-mono text-xs"
                    >
                      {run.uid ?? "\u2014"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="block font-mono text-xs"
                      title={run.hotkey}
                    >
                      {truncateHotkey(run.hotkey)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="block text-xs text-muted-foreground"
                    >
                      {run.version ?? "\u2014"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="block text-xs text-muted-foreground"
                    >
                      {timeAgo(run.startedAt)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="block text-xs text-muted-foreground"
                    >
                      {timeAgo(run.lastSeenAt)}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
            <div className="rounded-md border border-border overflow-auto max-h-[400px]">
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
                          href={`/uid/${ev.uid}`}
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
