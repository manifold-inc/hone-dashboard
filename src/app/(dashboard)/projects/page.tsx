"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getProjects } from "@/lib/api";
import type { ProjectInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const projects = useMemo<ProjectInfo[]>(() => {
    const rows = data?.projects ?? [];
    const map = new Map<string, ProjectInfo>();
    for (const row of rows) {
      if (!row.project) continue;
      let info = map.get(row.project);
      if (!info) {
        info = { project: row.project, versions: [] };
        map.set(row.project, info);
      }
      info.versions.push({
        version: row.version,
        modelSize: row.modelSize,
        lastSeen: row.lastSeen,
        runCount: row.runCount,
      });
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        Projects
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Training initiatives and their version history.
      </p>

      {isLoading && (
        <div className="mt-8 text-sm text-muted-foreground">Loading...</div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const latest = project.versions[0];
          const totalRuns = project.versions.reduce(
            (sum, v) => sum + v.runCount,
            0
          );
          return (
            <Link
              key={project.project}
              href={`/projects/${project.project}`}
            >
              <Card className="transition-colors hover:border-primary/40 hover:bg-accent/20 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="font-mono">{project.project}</span>
                    {latest?.modelSize && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/30 text-primary"
                      >
                        {latest.modelSize}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Versions</span>
                    <span className="font-mono text-foreground">
                      {project.versions.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total runs</span>
                    <span className="font-mono text-foreground">
                      {totalRuns}
                    </span>
                  </div>
                  {latest?.version && (
                    <div className="flex justify-between">
                      <span>Latest version</span>
                      <span className="font-mono text-foreground">
                        v{latest.version}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {!isLoading && projects.length === 0 && (
          <div className="col-span-full text-center py-16 text-sm text-muted-foreground">
            No projects found. Projects will appear here once runs are
            registered with a project field.
          </div>
        )}
      </div>
    </div>
  );
}
