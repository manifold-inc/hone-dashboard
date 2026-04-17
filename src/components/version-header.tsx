"use client";

import { useMemo } from "react";
import { useVersion } from "@/components/version-context";
import { VersionDropdown } from "@/components/version-dropdown";

export function VersionHeader({ title }: { title: string }) {
  const {
    availableVersions,
    projects,
    currentProject,
    currentVersion,
    latestVersion,
    isLatest,
    setSelectedProject,
    setSelectedVersion,
  } = useVersion();

  const projectLabel = currentProject ?? title;
  const displayTitle = currentVersion
    ? `${projectLabel} v${currentVersion}`
    : projectLabel;

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        project: p.project,
        versionCount: p.versions.length,
      })),
    [projects]
  );

  return (
    <VersionDropdown
      title={displayTitle}
      versions={availableVersions}
      currentVersion={currentVersion}
      latestVersion={latestVersion}
      isLatest={isLatest}
      onSelect={(v) => setSelectedVersion(v === latestVersion ? null : v)}
      projects={projectOptions}
      currentProject={currentProject}
      onSelectProject={(p) => {
        setSelectedProject(p);
        setSelectedVersion(null);
      }}
    />
  );
}
