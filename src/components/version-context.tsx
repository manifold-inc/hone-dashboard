"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjects, getRuns } from "@/lib/api";
import type { TrainingRun, ProjectInfo } from "@/lib/types";
import type { VersionInfo } from "@/components/version-dropdown";

interface VersionContextValue {
  allRuns: TrainingRun[];
  projects: ProjectInfo[];
  currentProject: string | null;
  currentVersion: string | null;
  latestVersion: string | null;
  isLatest: boolean;
  setSelectedProject: (p: string | null) => void;
  setSelectedVersion: (v: string | null) => void;
  availableVersions: VersionInfo[];
}

const VersionContext = createContext<VersionContextValue>({
  allRuns: [],
  projects: [],
  currentProject: null,
  currentVersion: null,
  latestVersion: null,
  isLatest: true,
  setSelectedProject: () => {},
  setSelectedVersion: () => {},
  availableVersions: [],
});

export function VersionProvider({ children }: { children: ReactNode }) {
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const { data: runsData } = useQuery({
    queryKey: ["runs-all-versions"],
    queryFn: () => getRuns({ limit: 100 }),
  });

  const allRuns = runsData?.runs ?? [];

  const projects = useMemo<ProjectInfo[]>(() => {
    const rows = projectsData?.projects ?? [];
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
  }, [projectsData]);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const currentProject = selectedProject ?? projects[0]?.project ?? null;

  const currentProjectInfo = projects.find((p) => p.project === currentProject);

  const availableVersions = useMemo<VersionInfo[]>(() => {
    if (!currentProjectInfo) {
      const vset = new Map<string, VersionInfo>();
      for (const r of allRuns) {
        if (!r.version) continue;
        const existing = vset.get(r.version);
        if (existing) {
          existing.count++;
          if (r.lastSeenAt > existing.latest) existing.latest = r.lastSeenAt;
        } else {
          vset.set(r.version, {
            version: r.version,
            count: 1,
            latest: r.lastSeenAt,
          });
        }
      }
      return Array.from(vset.values()).sort((a, b) =>
        b.latest.localeCompare(a.latest)
      );
    }
    return currentProjectInfo.versions.map((v) => ({
      version: v.version ?? "unknown",
      count: v.runCount,
      latest: v.lastSeen,
      modelSize: v.modelSize,
    }));
  }, [currentProjectInfo, allRuns]);

  const latestVersion = availableVersions[0]?.version ?? null;
  const currentVersion = selectedVersion ?? latestVersion;
  const isLatest = currentVersion === latestVersion;

  const value = useMemo(
    () => ({
      allRuns,
      projects,
      currentProject,
      currentVersion,
      latestVersion,
      isLatest,
      setSelectedProject,
      setSelectedVersion,
      availableVersions,
    }),
    [
      allRuns,
      projects,
      currentProject,
      currentVersion,
      latestVersion,
      isLatest,
      availableVersions,
    ]
  );

  return (
    <VersionContext.Provider value={value}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  return useContext(VersionContext);
}
