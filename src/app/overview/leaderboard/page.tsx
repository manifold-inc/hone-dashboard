"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/types";
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

type LeaderboardRow = LeaderboardEntry & { rank: number };

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

function truncateHotkey(hotkey: string): string {
  if (hotkey.length <= 12) return hotkey;
  return `${hotkey.slice(0, 6)}...${hotkey.slice(-4)}`;
}

function fmtNumber(v: number | null, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}

function numericSortValue(
  v: number | null | undefined,
  dir: "asc" | "desc"
): number {
  if (v === null || v === undefined) {
    return dir === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  return v;
}

function signedClass(v: number | null): string {
  if (v === null || v === undefined) return "";
  if (v > 0) return "text-positive";
  if (v < 0) return "text-negative";
  return "";
}

function compareRows(a: LeaderboardRow, b: LeaderboardRow, key: SortKey, dir: "asc" | "desc"): number {
  const mul = dir === "desc" ? -1 : 1;

  if (key === "hotkey") {
    const cmp = a.hotkey.localeCompare(b.hotkey);
    return mul * cmp;
  }

  const av = numericSortValue(
    key === "rank"
      ? a.rank
      : key === "uid"
        ? a.uid
        : key === "window"
          ? a.window
          : (a[key] as number | null | undefined),
    dir
  );
  const bv = numericSortValue(
    key === "rank"
      ? b.rank
      : key === "uid"
        ? b.uid
        : key === "window"
          ? b.window
          : (b[key] as number | null | undefined),
    dir
  );

  if (av !== bv) return mul * (av < bv ? -1 : 1);
  return a.uid - b.uid;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "uid", label: "UID" },
  { key: "finalScore", label: "Final Score" },
  { key: "gradientScore", label: "Gradient" },
  { key: "syncScore", label: "Sync" },
  { key: "openskillOrdinal", label: "OpenSkill (ordinal)" },
  { key: "weight", label: "Weight" },
  { key: "hotkey", label: "Hotkey" },
  { key: "window", label: "Window" },
];

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard({ limit: 256 }),
  });

  const [sortKey, setSortKey] = useState<SortKey>("finalScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const rowsWithRank = useMemo((): LeaderboardRow[] => {
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
    return [...rowsWithRank].sort((a, b) => compareRows(a, b, sortKey, sortDirection));
  }, [rowsWithRank, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Miner Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest scores for all evaluated UIDs
        </p>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p>
      ) : !data || data.leaderboard.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No leaderboard data yet
        </p>
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
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
                  <TableCell className="font-mono text-xs">{row.rank}</TableCell>
                  <TableCell className="text-xs">
                    <Link href={`/overview/uid/${row.uid}`} className="inline-block">
                      <Badge variant="outline" className="font-mono text-xs">
                        {row.uid}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs",
                      signedClass(row.finalScore)
                    )}
                  >
                    {fmtNumber(row.finalScore)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-xs",
                      signedClass(row.gradientScore)
                    )}
                  >
                    {fmtNumber(row.gradientScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmtNumber(row.syncScore)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fmtNumber(row.openskillOrdinal, 2)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.weight === null || row.weight === undefined
                      ? "\u2014"
                      : `${(row.weight * 100).toFixed(2)}%`}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs"
                    title={row.hotkey}
                  >
                    {truncateHotkey(row.hotkey)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.window}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
