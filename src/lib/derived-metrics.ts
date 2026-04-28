import type {
  WindowMetrics,
  MinerMetricsRow,
  SlashEventRow,
} from "./types";

/**
 * Derived metrics that the validator records but the API exposes only as the
 * raw before/after losses. Centralized here so every chart and tile uses the
 * exact same definition.
 *
 * Source: `hone/neurons/validator.py` (the validator's per-window evaluation
 * loop). For each evaluated miner the validator measures model loss four
 * times -- on the miner's claimed data and on independent random data, both
 * before and after applying the miner's gradient -- then averages across
 * peers and stores the four numbers per window.
 */

export interface DerivedWindowPoint {
  window: number;
  globalStep: number;
  createdAt: string;
  /** % loss reduction on the miner's claimed data. Higher = better. */
  gradientQuality: number | null;
  /** Same on random data. Lower than gradientQuality means real learning. */
  randomQuality: number | null;
  /** improvement_own − improvement_random (in pp). ~0 = healthy. Large + = overfit. */
  generalizationGap: number | null;
}

function pctFromBeforeAfter(
  before: number | null,
  after: number | null,
): number | null {
  if (before === null || after === null) return null;
  if (before <= 0) return null;
  return ((before - after) / before) * 100;
}

export function gradientQuality(w: WindowMetrics): number | null {
  if (w.lossOwnImprovement !== null && w.lossOwnImprovement !== undefined) {
    return w.lossOwnImprovement * 100;
  }
  return pctFromBeforeAfter(w.lossOwnBefore, w.lossOwnAfter);
}

export function randomQuality(w: WindowMetrics): number | null {
  if (w.lossRandomImprovement !== null && w.lossRandomImprovement !== undefined) {
    return w.lossRandomImprovement * 100;
  }
  return pctFromBeforeAfter(w.lossRandomBefore, w.lossRandomAfter);
}

export function generalizationGap(w: WindowMetrics): number | null {
  const own = gradientQuality(w);
  const rand = randomQuality(w);
  if (own === null || rand === null) return null;
  return own - rand;
}

export function deriveWindowSeries(
  windows: WindowMetrics[],
): DerivedWindowPoint[] {
  return windows.map((w) => ({
    window: w.window,
    globalStep: w.globalStep,
    createdAt: w.createdAt,
    gradientQuality: gradientQuality(w),
    randomQuality: randomQuality(w),
    generalizationGap: generalizationGap(w),
  }));
}

/**
 * Aggregate per-miner training loss into a median + p10/p90 band per window
 * so a single noisy miner can't distort the headline curve. Returns one row
 * per (windowed) timestamp, oldest first.
 */
export interface AggregatedMinerLossPoint {
  window: number;
  createdAt: string;
  /** Median miner loss for this window. */
  loss: number | null;
  /** 10th percentile -- "best" miners. */
  lossP10: number | null;
  /** 90th percentile -- "worst" miners. */
  lossP90: number | null;
  minerCount: number;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

export function aggregateMinerLossByWindow(
  miners: MinerMetricsRow[],
): AggregatedMinerLossPoint[] {
  const byWindow = new Map<
    number,
    { losses: number[]; createdAt: string }
  >();
  for (const m of miners) {
    if (m.loss === null || m.loss === undefined || !Number.isFinite(m.loss)) {
      continue;
    }
    const slot = byWindow.get(m.window);
    if (!slot) {
      byWindow.set(m.window, {
        losses: [m.loss],
        createdAt: m.createdAt,
      });
    } else {
      slot.losses.push(m.loss);
      // Keep the most recent createdAt for the window so the x-axis lines up.
      if (new Date(m.createdAt) > new Date(slot.createdAt)) {
        slot.createdAt = m.createdAt;
      }
    }
  }

  return Array.from(byWindow.entries())
    .sort(([a], [b]) => a - b)
    .map(([window, { losses, createdAt }]) => {
      const sorted = [...losses].sort((a, b) => a - b);
      return {
        window,
        createdAt,
        loss: quantile(sorted, 0.5),
        lossP10: quantile(sorted, 0.1),
        lossP90: quantile(sorted, 0.9),
        minerCount: losses.length,
      };
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Network Health verdict
//
// A single-glance answer to "is the network healthy right now?". Three
// discrete states (healthy / degraded / stalled) with a one-sentence
// justification built from the same inputs the per-section charts plot.
// Living here (not in the page) keeps the verdict logic versionable,
// testable, and reusable on /nodes/[hotkey] later.
// ──────────────────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "stalled" | "unknown";
export type LossTrend = "improving" | "flat" | "rising" | "unknown";

export interface HealthVerdict {
  status: HealthStatus;
  /** A short label suitable for a headline ("Healthy", "Degraded", "Stalled"). */
  label: string;
  /** One full sentence explaining the verdict, plain English. */
  sentence: string;
  /** Per-signal breakdown used to build the sentence; useful for tooltips. */
  signals: {
    lossTrend: LossTrend;
    lossDeltaPct: number | null;
    gatherSuccess: number | null;
    activeMiners: number | null;
    slashCount: number;
    slashWindowSpan: number;
  };
}

const STALL_GATHER_THRESHOLD = 50;
const DEGRADED_GATHER_THRESHOLD = 80;
const SLASH_DEGRADED_THRESHOLD = 5;
const FLAT_LOSS_BAND_PCT = 0.5;

/**
 * Trend on a numeric series ordered oldest-to-newest. Compares the mean of
 * the first quarter against the mean of the last quarter. Anything inside
 * a configurable band counts as "flat" so quarter-to-quarter wobble doesn't
 * flicker the readout.
 */
export function computeTrend(
  series: (number | null | undefined)[],
  opts: { flatBandPct?: number; minPoints?: number } = {},
): { trend: LossTrend; deltaPct: number | null } {
  const flatBand = opts.flatBandPct ?? FLAT_LOSS_BAND_PCT;
  const minPoints = opts.minPoints ?? 4;
  const clean = series.filter((v): v is number =>
    typeof v === "number" && Number.isFinite(v),
  );
  if (clean.length < minPoints) {
    return { trend: "unknown", deltaPct: null };
  }
  const window = Math.max(2, Math.floor(clean.length / 4));
  const head = clean.slice(0, window);
  const tail = clean.slice(-window);
  const headMean = head.reduce((a, b) => a + b, 0) / head.length;
  const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
  if (headMean <= 0) return { trend: "unknown", deltaPct: null };
  const deltaPct = ((tailMean - headMean) / headMean) * 100;
  if (deltaPct < -flatBand) return { trend: "improving", deltaPct };
  if (deltaPct > flatBand) return { trend: "rising", deltaPct };
  return { trend: "flat", deltaPct };
}

export function networkHealth({
  windows,
  slashes,
  connected,
  lookback = 30,
}: {
  windows: WindowMetrics[];
  slashes: SlashEventRow[];
  connected: boolean;
  lookback?: number;
}): HealthVerdict {
  if (!connected) {
    return {
      status: "stalled",
      label: "Offline",
      sentence: "Dashboard cannot reach the network. Reconnecting.",
      signals: {
        lossTrend: "unknown",
        lossDeltaPct: null,
        gatherSuccess: null,
        activeMiners: null,
        slashCount: 0,
        slashWindowSpan: 0,
      },
    };
  }
  if (windows.length === 0) {
    return {
      status: "unknown",
      label: "No data",
      sentence: "Awaiting the validator's first window.",
      signals: {
        lossTrend: "unknown",
        lossDeltaPct: null,
        gatherSuccess: null,
        activeMiners: null,
        slashCount: 0,
        slashWindowSpan: 0,
      },
    };
  }

  const sortedWindows = [...windows].sort((a, b) => a.window - b.window);
  const recent = sortedWindows.slice(-lookback);
  const latest = sortedWindows[sortedWindows.length - 1];

  // Loss trend on the headline metric (random-data after gradient).
  const { trend: lossTrend, deltaPct: lossDeltaPct } = computeTrend(
    recent.map((w) => w.lossRandomAfter),
  );

  const gatherSuccess = latest?.gatherSuccessRate ?? null;
  const activeMiners = latest?.activeMiners ?? null;

  const minRecentWindow = recent[0]?.window ?? latest.window;
  const slashCount = slashes.filter((s) => s.window >= minRecentWindow).length;
  const slashWindowSpan = recent.length;

  // Verdict precedence: gather is the most catastrophic signal (everything
  // downstream stops if peers can't be collected). Then slashes. Then loss
  // trend.
  let status: HealthStatus = "healthy";
  let reason = "";

  if (gatherSuccess !== null && gatherSuccess < STALL_GATHER_THRESHOLD) {
    status = "stalled";
    reason = `gather at ${gatherSuccess.toFixed(0)}%; peer collection is failing`;
  } else if (
    gatherSuccess !== null &&
    gatherSuccess < DEGRADED_GATHER_THRESHOLD
  ) {
    status = "degraded";
    reason = `gather at ${gatherSuccess.toFixed(0)}% (target: 90%)`;
  } else if (slashCount >= SLASH_DEGRADED_THRESHOLD) {
    status = "degraded";
    reason = `${slashCount} slashes in last ${slashWindowSpan} windows`;
  } else if (lossTrend === "rising") {
    status = "degraded";
    reason = `loss climbing ${Math.abs(lossDeltaPct ?? 0).toFixed(1)}% over last ${recent.length} windows`;
  } else {
    status = "healthy";
    const parts: string[] = [];
    if (lossTrend === "improving" && lossDeltaPct !== null) {
      parts.push(`loss falling ${Math.abs(lossDeltaPct).toFixed(1)}%`);
    } else if (lossTrend === "flat") {
      parts.push("loss steady");
    }
    if (gatherSuccess !== null) {
      parts.push(`gather at ${gatherSuccess.toFixed(0)}%`);
    }
    if (slashCount === 0 && slashWindowSpan > 0) {
      parts.push(`no slashes in ${slashWindowSpan} windows`);
    } else if (slashCount > 0) {
      parts.push(`${slashCount} slash${slashCount === 1 ? "" : "es"} recently`);
    }
    reason = parts.length > 0 ? parts.join(", ") : "training in steady state";
  }

  // Capitalize the first letter of the reason to make a clean sentence.
  const sentence = reason.charAt(0).toUpperCase() + reason.slice(1) + ".";
  const labelMap: Record<HealthStatus, string> = {
    healthy: "Healthy",
    degraded: "Degraded",
    stalled: "Stalled",
    unknown: "No data",
  };

  return {
    status,
    label: labelMap[status],
    sentence,
    signals: {
      lossTrend,
      lossDeltaPct,
      gatherSuccess,
      activeMiners,
      slashCount,
      slashWindowSpan,
    },
  };
}

