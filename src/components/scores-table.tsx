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

function fmt(v: number | null, decimals = 4): string {
  if (v === null || v === undefined) return "\u2014";
  return v.toFixed(decimals);
}

export function ScoresTable({ scores }: ScoresTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("finalScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
      return sortDir === "desc" ? Number(bv) - Number(av) : Number(av) - Number(bv);
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.uid}>
              <TableCell className="font-mono text-xs">{row.uid}</TableCell>
              <TableCell
                className={cn(
                  "font-mono text-xs",
                  (row.gradientScore ?? 0) > 0
                    ? "text-positive"
                    : (row.gradientScore ?? 0) < 0
                      ? "text-negative"
                      : ""
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
