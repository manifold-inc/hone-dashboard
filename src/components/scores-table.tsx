"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UidScore } from "@/lib/types";

type SortKey =
  | "uid"
  | "gradientScore"
  | "syncScore"
  | "finalScore"
  | "weight"
  | "openskillOrdinal";

interface ScoresTableProps {
  scores: UidScore[];
}

function fmt(v: number | null | undefined, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "\u2014";
  return `${(v * 100).toFixed(2)}%`;
}

function statusColor(status: string | null | undefined): string {
  switch (status) {
    case "evaluated":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "skipped":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "invalid":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "excluded":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function ScoresTable({ scores }: ScoresTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("finalScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedUid, setExpandedUid] = useState<number | null>(null);

  const latestByUid = useMemo(() => {
    const map = new Map<number, UidScore>();
    for (const s of scores) {
      const existing = map.get(s.uid);
      if (!existing || s.window > existing.window) {
        map.set(s.uid, s);
      }
    }
    return Array.from(map.values());
  }, [scores]);

  const sorted = useMemo(() => {
    return [...latestByUid].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "desc"
        ? Number(bv) - Number(av)
        : Number(av) - Number(bv);
    });
  }, [latestByUid, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "uid", label: "UID" },
    { key: "gradientScore", label: "Gradient" },
    { key: "syncScore", label: "Sync" },
    { key: "openskillOrdinal", label: "Ordinal" },
    { key: "finalScore", label: "Final" },
    { key: "weight", label: "Weight" },
  ];

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No score data available
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6" />
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => toggleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="text-foreground">
                      {sortDir === "desc" ? "\u25BC" : "\u25B2"}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
            <TableHead className="whitespace-nowrap">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isExpanded = expandedUid === row.uid;
            const hasDetails =
              row.evalStatus != null || row.lossOwnBefore != null;
            return (
              <>
                <TableRow
                  key={row.uid}
                  className={cn(
                    hasDetails && "cursor-pointer hover:bg-muted/50",
                    isExpanded && "bg-muted/30",
                  )}
                  onClick={() =>
                    hasDetails &&
                    setExpandedUid(isExpanded ? null : row.uid)
                  }
                >
                  <TableCell className="w-6 text-muted-foreground text-xs">
                    {hasDetails ? (isExpanded ? "\u25BE" : "\u25B8") : ""}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.uid}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs",
                      (row.gradientScore ?? 0) > 0
                        ? "text-positive"
                        : (row.gradientScore ?? 0) < 0
                          ? "text-negative"
                          : "",
                    )}
                  >
                    {fmt(row.gradientScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmt(row.syncScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmt(row.openskillOrdinal, 2)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmt(row.finalScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmt(row.weight)}
                  </TableCell>
                  <TableCell>
                    {row.evalStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          statusColor(row.evalStatus),
                        )}
                      >
                        {row.evalStatus}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && hasDetails && (
                  <TableRow key={`${row.uid}-detail`}>
                    <TableCell colSpan={8} className="bg-muted/20 p-0">
                      <div className="px-6 py-3 space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {row.lossOwnBefore != null && (
                            <>
                              <div>
                                <span className="text-muted-foreground">
                                  Own Before:{" "}
                                </span>
                                <span className="font-mono">
                                  {fmt(row.lossOwnBefore)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Own After:{" "}
                                </span>
                                <span className="font-mono">
                                  {fmt(row.lossOwnAfter)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Random Before:{" "}
                                </span>
                                <span className="font-mono">
                                  {fmt(row.lossRandomBefore)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Random After:{" "}
                                </span>
                                <span className="font-mono">
                                  {fmt(row.lossRandomAfter)}
                                </span>
                              </div>
                            </>
                          )}
                          {row.improvementOwn != null && (
                            <>
                              <div>
                                <span className="text-muted-foreground">
                                  Improvement (own):{" "}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono",
                                    (row.improvementOwn ?? 0) > 0
                                      ? "text-positive"
                                      : "text-negative",
                                  )}
                                >
                                  {pct(row.improvementOwn)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Improvement (random):{" "}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono",
                                    (row.improvementRandom ?? 0) > 0
                                      ? "text-positive"
                                      : "text-negative",
                                  )}
                                >
                                  {pct(row.improvementRandom)}
                                </span>
                              </div>
                            </>
                          )}
                          <div>
                            <span className="text-muted-foreground">
                              Binary Indicator:{" "}
                            </span>
                            <span
                              className={cn(
                                "font-mono",
                                (row.binaryIndicator ?? 0) > 0
                                  ? "text-positive"
                                  : "text-negative",
                              )}
                            >
                              {row.binaryIndicator ?? "\u2014"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              BMA:{" "}
                            </span>
                            <span className="font-mono">
                              {fmt(row.binaryMovingAvg, 3)}
                              {row.bmaThresholdApplied && (
                                <span className="ml-1 text-yellow-400">
                                  (floored)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        {(row.consecutiveNegatives != null ||
                          row.negativeFrequency != null) && (
                          <div className="flex gap-4 text-xs border-t border-border/50 pt-2 mt-2">
                            <div>
                              <span className="text-muted-foreground">
                                Consecutive Negatives:{" "}
                              </span>
                              <span
                                className={cn(
                                  "font-mono",
                                  (row.consecutiveNegatives ?? 0) >= 3 &&
                                    "text-red-400",
                                )}
                              >
                                {row.consecutiveNegatives ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Negative Freq:{" "}
                              </span>
                              <span
                                className={cn(
                                  "font-mono",
                                  (row.negativeFrequency ?? 0) > 0.5 &&
                                    "text-red-400",
                                )}
                              >
                                {pct(row.negativeFrequency)}
                              </span>
                            </div>
                          </div>
                        )}
                        {row.evalSkipReason && (
                          <div className="text-xs border-t border-border/50 pt-2 mt-2">
                            <span className="text-muted-foreground">
                              Skip Reason:{" "}
                            </span>
                            <span className="text-yellow-400">
                              {row.evalSkipReason}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
