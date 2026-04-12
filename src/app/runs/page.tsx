"use client";

import { useQuery } from "@tanstack/react-query";
import { getRuns } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RunStatusBadge } from "@/components/run-status-badge";
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
                    <Link href={`/runs/${run.id}`} className="block">
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
    </div>
  );
}
