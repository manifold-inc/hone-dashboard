export interface TrainingRun {
  id: number;
  externalId: string;
  hotkey: string;
  role: "validator" | "miner";
  netuid: number;
  uid: number | null;
  version: string | null;
  config: Record<string, unknown> | null;
  startedAt: string;
  lastSeenAt: string;
}

export interface WindowMetrics {
  id: number;
  runId: number;
  window: number;
  globalStep: number;
  block: number | null;
  lossOwnBefore: number | null;
  lossOwnAfter: number | null;
  lossRandomBefore: number | null;
  lossRandomAfter: number | null;
  lossOwnImprovement: number | null;
  lossRandomImprovement: number | null;
  outerLr: number | null;
  innerLr: number | null;
  activeMiners: number | null;
  gatherSuccessRate: number | null;
  gatherPeers: number | null;
  positivePeersRatio: number | null;
  reserveUsed: number | null;
  overlapMean: number | null;
  overlapMax: number | null;
  overlapPairsChecked: number | null;
  timingWindowTotal: number | null;
  timingPeerUpdate: number | null;
  timingGather: number | null;
  timingEvaluation: number | null;
  timingModelUpdate: number | null;
  evaluatedUids: number | null;
  totalNegativeEvals: number | null;
  totalExcluded: number | null;
  createdAt: string;
}

export interface UidScore {
  id: number;
  runId: number;
  window: number;
  uid: number;
  gradientScore: number | null;
  binaryIndicator: number | null;
  binaryMovingAvg: number | null;
  syncScore: number | null;
  openskillMu: number | null;
  openskillSigma: number | null;
  openskillOrdinal: number | null;
  finalScore: number | null;
  weight: number | null;
  createdAt: string;
}

export interface MinerMetricsRow {
  id: number;
  runId: number;
  window: number;
  globalStep: number;
  loss: number | null;
  windowEntryLoss: number | null;
  tokensPerSec: number | null;
  batchTokens: number | null;
  gradNorm: number | null;
  weightNorm: number | null;
  momentumNorm: number | null;
  gatherSuccessRate: number | null;
  gatherPeers: number | null;
  gpuMemoryAllocated: number | null;
  gpuMemoryCached: number | null;
  innerLr: number | null;
  timing: Record<string, number> | null;
  createdAt: string;
}

export interface GradientStatsRow {
  id: number;
  runId: number;
  window: number;
  meanGradNorm: number | null;
  maxGradNorm: number | null;
  minGradNorm: number | null;
  medianGradNorm: number | null;
  gradNormStd: number | null;
  meanWeightNorm: number | null;
  gradToWeightRatio: number | null;
  createdAt: string;
}

export interface RecentWindowSnapshot {
  window: number;
  globalStep: number;
  lossOwnBefore: number | null;
  lossOwnAfter: number | null;
  lossOwnImprovement: number | null;
  gatherSuccessRate: number | null;
  activeMiners: number | null;
  evaluatedUids: number | null;
  createdAt: string;
}

export interface NetworkStats {
  activeRuns: number;
  activeValidators: number;
  activeMiners: number;
  totalWindows: number;
  latestWindow: RecentWindowSnapshot | null;
  recentLoss: RecentWindowSnapshot[];
}
