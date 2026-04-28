import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The dashboard was reorganized into 3 top-level pages:
      // /network, /nodes (miners + validators + leaderboard), /projects.
      // These permanent redirects keep older bookmarks and external links
      // working.
      { source: "/overview", destination: "/network", permanent: true },
      {
        source: "/miners",
        destination: "/nodes?tab=miners",
        permanent: true,
      },
      {
        source: "/validators",
        destination: "/nodes?tab=validators",
        permanent: true,
      },
      {
        source: "/leaderboard",
        destination: "/nodes?tab=leaderboard",
        permanent: true,
      },
      { source: "/runs", destination: "/nodes", permanent: true },
      {
        source: "/miners/:hotkey",
        destination: "/nodes/:hotkey",
        permanent: true,
      },
      {
        source: "/validators/:hotkey",
        destination: "/nodes/:hotkey",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
