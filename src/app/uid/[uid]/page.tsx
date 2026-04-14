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
import Link from "next/link";

export default function UidDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid: uidStr } = use(params);
  const uid = parseInt(uidStr);

  const { data, isLoading } = useQuery({
    queryKey: ["uid-detail", uid],
    queryFn: () => getUidDetail(uid, { limit: 500 }),
    enabled: Number.isFinite(uid),
  });

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
        <p className="text-sm text-muted-foreground">No data for UID {uid}</p>
      </div>
    );
  }

  const latest = data.latestScore;
  const scoresSorted = [...data.scores].reverse();

  const events = useMemo(() => {
    const combined = [
      ...data.slashes.map((s) => ({ ...s, type: "slash" as const })),
      ...data.inactivity.map((e) => ({ ...e, type: "inactivity" as const, reason: null })),
    ];
    combined.sort((a, b) => b.window - a.window);
    return combined;
  }, [data.slashes, data.inactivity]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/leaderboard" className="hover:text-foreground">
            Leaderboard
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">UID {uid}</h1>
      </div>

      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {scoresSorted.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={scoresSorted}
              series={[
                { key: "finalScore", label: "Final", color: "#d4d4d4" },
                { key: "gradientScore", label: "Gradient", color: "#a3a3a3" },
                { key: "syncScore", label: "Sync", color: "#737373" },
                { key: "weight", label: "Weight", color: "#525252" },
              ]}
              height={280}
            />
          </CardContent>
        </Card>
      )}

      {scoresSorted.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              OpenSkill Trajectory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={scoresSorted}
              series={[
                { key: "openskillMu", label: "Mu (skill)", color: "#d4d4d4" },
                { key: "openskillOrdinal", label: "Ordinal", color: "#a3a3a3" },
              ]}
              height={220}
            />
          </CardContent>
        </Card>
      )}

      {events.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Events ({events.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Window</TableHead>
                    <TableHead>Type</TableHead>
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
                          variant={ev.type === "slash" ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {ev.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ev.scoreBefore?.toFixed(4) ?? "\u2014"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ev.scoreAfter?.toFixed(4) ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                        {ev.type === "slash" ? (ev as { reason: string | null }).reason ?? "\u2014" : "\u2014"}
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
