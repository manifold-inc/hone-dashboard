# Hone Dashboard

Real-time monitoring dashboard for the Hone distributed training network on Bittensor Subnet 5. Built with Next.js, Recharts, and a cyberpunk-inspired monospace design system.

## What is Hone?

Hone is a system for incentivized distributed training of large language models. It connects diverse computational nodes through a carefully designed incentive mechanism, enabling collaborative training while ensuring honest participation and quality contributions. The framework implements a peer-to-peer architecture where participants contribute their computational resources to train a shared model, with rewards proportional to the quality of their contributions.

## Dashboard Features

### Overview (`/overview`)
- iOS-style title with live version selector dropdown
- Dense stat tiles showing active miners, validators, connected nodes, loss, gather success, global step
- Training loss chart (full window history from the active validator)
- Live loss per-step chart with multi-miner overlay (all UIDs on one chart)
- Throughput, gradient norms, GPU memory charts
- Top miners leaderboard preview
- Slashing and inactivity events feed

### Projects (`/projects`)
- Training initiative browser with version history
- Background hero images per project
- Blog/writeup rendering with Markdown
- Hyperparameter viewer for run configs

### Miners (`/miners`)
- Version-filtered miner listing with live status, loss, throughput, grad norm
- Click-through to miner detail page (`/miners/[hotkey]`) showing all runs for a hotkey
- Score history charts, OpenSkill trajectory

### Validators (`/validators`)
- Version-filtered validator listing with loss, gather %, global step, window count
- Click-through to validator detail page (`/validators/[hotkey]`) showing all runs for a hotkey

### Leaderboard (`/leaderboard`)
- Sortable table of all evaluated UIDs with final score, gradient score, sync score, OpenSkill, weight
- Links to miner detail pages

### Runs (`/runs`)
- All registered training runs with status, role, UID, hotkey, version
- Run detail page (`/runs/[id]`) with tabs for Training, Network, Scores, Timing, Gradients, Events, System
- Live loss per-step chart with historical backfill

### Landing Page (`/`)
- Animated ASCII pastel background
- Hero with mission statement
- Feature highlights

## Architecture

- **Next.js 16** App Router with route groups
- **Server-side API proxy** (`/api/proxy/[...path]`) -- API key stays server-side, never exposed to the browser
- **WebSocket** for real-time updates (liveness, metric invalidation, inner-step streaming)
- **React Query** for data fetching with 2s stale time and WebSocket-driven cache invalidation
- **Shared version context** -- select a version on any page, it persists across all dashboard pages
- **Recharts** for all time-series charts (replaced Liveline for proper historical data rendering)

## Tech Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui (base-nova style)
- Recharts, TanStack React Query
- Space Mono + JetBrains Mono fonts

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A running [hone-api](../hone-api) instance

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your API URL and key
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Upstream API URL (server-side only, never exposed to browser) |
| `API_KEY` | No | API key for authenticated endpoints (server-side only) |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL for real-time updates (e.g., `wss://api.hone.training`) |
| `NEXT_PUBLIC_DASHBOARD_TOKEN` | No | Auth token for WebSocket connection |

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/
    page.tsx                        # Landing page
    layout.tsx                      # Root layout (fonts, floating nav)
    api/proxy/[...path]/route.ts    # Server-side API proxy
    (dashboard)/
      layout.tsx                    # Dashboard layout (Providers, VersionProvider)
      overview/page.tsx             # Network overview
      miners/page.tsx               # Miner listing
      miners/[hotkey]/page.tsx      # Miner detail
      validators/page.tsx           # Validator listing
      validators/[hotkey]/page.tsx  # Validator detail
      leaderboard/page.tsx          # Leaderboard
      runs/page.tsx                 # All runs
      runs/[id]/page.tsx            # Run detail
      projects/page.tsx             # Projects listing
      projects/[project]/page.tsx   # Project detail
  components/
    floating-nav.tsx                # Pill-shaped floating navigation bar
    version-context.tsx             # Shared version state across dashboard
    version-dropdown.tsx            # Chevron dropdown for version selection
    version-header.tsx              # Reusable page header with version dropdown
    ascii-sky-border.tsx            # Animated ASCII pastel background
    charts/
      time-series-chart.tsx         # Recharts-based time series (all charts)
      multi-miner-loss-chart.tsx    # Multi-UID inner-step loss overlay
      inner-step-loss-chart.tsx     # Single-run inner-step loss
      area-chart.tsx                # Stacked area chart
  lib/
    api.ts                          # API client (routes through /api/proxy)
    types.ts                        # TypeScript interfaces for all API types
    use-live-updates.ts             # WebSocket connection + cache invalidation
    use-live-metrics.ts             # In-memory inner-step buffer
```
