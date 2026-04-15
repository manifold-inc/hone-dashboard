"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getProjects, getRuns, getProjectBlog } from "@/lib/api";
import type { ProjectInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HparamsViewer } from "@/components/hparams-viewer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams<{ project: string }>();
  const projectName = params.project;

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const project = useMemo<ProjectInfo | null>(() => {
    const rows = projectsData?.projects ?? [];
    const versions: ProjectInfo["versions"] = [];
    for (const row of rows) {
      if (row.project !== projectName) continue;
      versions.push({
        version: row.version,
        modelSize: row.modelSize,
        lastSeen: row.lastSeen,
        runCount: row.runCount,
      });
    }
    if (versions.length === 0) return null;
    return { project: projectName, versions };
  }, [projectsData, projectName]);

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const activeVersion =
    selectedVersion ?? project?.versions[0]?.version ?? null;

  const activeVersionInfo = project?.versions.find(
    (v) => v.version === activeVersion
  );

  const { data: runsData } = useQuery({
    queryKey: ["runs", projectName, activeVersion],
    queryFn: () =>
      getRuns({
        project: projectName,
        version: activeVersion ?? undefined,
        limit: 20,
      }),
    enabled: !!activeVersion,
  });

  const { data: blog } = useQuery({
    queryKey: ["project-blog", projectName],
    queryFn: () => getProjectBlog(projectName),
  });

  const latestRunWithConfig = runsData?.runs?.find(
    (r) => r.config && Object.keys(r.config).length > 0
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/projects"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <span className="text-xs text-muted-foreground/40">/</span>
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl font-mono">
          {projectName}
        </h1>
        {activeVersionInfo?.modelSize && (
          <Badge
            variant="outline"
            className="text-xs border-primary/30 text-primary"
          >
            {activeVersionInfo.modelSize}
          </Badge>
        )}
      </div>

      {project && project.versions.length > 1 && (
        <div className="flex gap-1.5 mb-8 flex-wrap">
          {project.versions.map((v) => {
            const active = v.version === activeVersion;
            return (
              <button
                key={v.version}
                onClick={() => setSelectedVersion(v.version)}
                className={cn(
                  "rounded border px-3 py-1.5 text-xs font-mono transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                v{v.version}
                {v.modelSize && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {v.modelSize}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {blog && (
            <Card>
              <CardContent className="pt-6">
                <MarkdownRenderer content={blog} />
              </CardContent>
            </Card>
          )}

          {!blog && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No writeup available for this project yet.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Version Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {activeVersionInfo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-mono">
                      {activeVersionInfo.version ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model size</span>
                    <span className="font-mono">
                      {activeVersionInfo.modelSize ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Runs</span>
                    <span className="font-mono">
                      {activeVersionInfo.runCount}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {runsData?.runs && runsData.runs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {runsData.runs.slice(0, 8).map((run) => (
                  <Link
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-accent/40 transition-colors"
                  >
                    <span className="font-mono text-muted-foreground truncate max-w-[140px]">
                      {run.externalId.slice(0, 8)}...
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px]"
                      >
                        {run.role}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {latestRunWithConfig?.config && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Hyperparameters</CardTitle>
              </CardHeader>
              <CardContent>
                <HparamsViewer
                  config={
                    latestRunWithConfig.config as Record<string, unknown>
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
