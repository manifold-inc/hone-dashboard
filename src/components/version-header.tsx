"use client";

import { useVersion } from "@/components/version-context";
import { VersionDropdown } from "@/components/version-dropdown";

export function VersionHeader({ title }: { title: string }) {
  const {
    availableVersions,
    currentProject,
    currentVersion,
    latestVersion,
    isLatest,
    setSelectedVersion,
  } = useVersion();

  const projectLabel = currentProject ?? title;
  const displayTitle = currentVersion
    ? `${projectLabel} v${currentVersion}`
    : projectLabel;

  return (
    <VersionDropdown
      title={displayTitle}
      versions={availableVersions}
      currentVersion={currentVersion}
      latestVersion={latestVersion}
      isLatest={isLatest}
      onSelect={(v) =>
        setSelectedVersion(v === latestVersion ? null : v)
      }
    />
  );
}
