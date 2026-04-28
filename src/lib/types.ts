export interface TrainingRun {
  id: number;
  externalId: string;
  hotkey: string;
  role: "validator" | "miner";
  netuid: number;
  uid: number | null;
  version: string | null;
  project: string | null;
  modelSize: string | null;
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
  overlapPairsOverThreshold: number | null;
  overlapRatioOverThreshold: number | null;
  compressMinMedianNorm: number | null;
  compressMaxMedianNorm: number | null;
  gatherIntendedMeanFinal: number | null;
  gatherActualMeanFinal: number | null;
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
  lossOwnBefore: number | null;
  lossOwnAfter: number | null;
  lossRandomBefore: number | null;
  lossRandomAfter: number | null;
  improvementOwn: number | null;
  improvementRandom: number | null;
  evalStatus: "evaluated" | "skipped" | "invalid" | "excluded" | null;
  evalSkipReason: string | null;
  consecutiveNegatives: number | null;
  negativeFrequency: number | null;
  bmaThresholdApplied: boolean | null;
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
  gradientL2Norm: number | null;
  gradientTotalElements: number | null;
  cpuUsage: number | null;
  gpuUtilization: number | null;
  outerStepApplied: boolean | null;
  compressedSizeMb: number | null;
  uploadSizeMb: number | null;
  offloadTime: number | null;
  restoreTime: number | null;
  skippedPeers: number | null;
  gatherPeerList: number[] | null;
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

export interface SyncScoreRow {
  id: number;
  runId: number;
  window: number;
  uid: number;
  l2Norm: number | null;
  avgAbsDiff: number | null;
  avgStepsBehind: number | null;
  maxStepsBehind: number | null;
  createdAt: string;
}

export interface SlashEventRow {
  id: number;
  runId: number;
  window: number;
  uid: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  reason: string | null;
  createdAt: string;
}

export interface InactivityEventRow {
  id: number;
  runId: number;
  window: number;
  uid: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  createdAt: string;
}

export interface GatherStatusRow {
  id: number;
  runId: number;
  window: number;
  uid: number;
  status: "success" | "skipped" | "timeout" | "failed" | "excluded";
  reason: string | null;
  createdAt: string;
}

export interface InnerStepRow {
  id: number;
  runId: number;
  window: number;
  innerStep: number;
  globalStep: number;
  loss: number | null;
  batchSize: number | null;
  batchTokens: number | null;
  innerLr: number | null;
  gradNorm: number | null;
  createdAt: string;
}

export interface LeaderboardEntry {
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
  window: number;
  createdAt: string;
  hotkey: string;
}

export interface UidDetail {
  uid: number;
  latestScore: UidScore | null;
  scores: UidScore[];
  slashes: SlashEventRow[];
  inactivity: InactivityEventRow[];
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

export interface ProjectVersionRow {
  project: string;
  version: string | null;
  modelSize: string | null;
  lastSeen: string;
  runCount: number;
}

export interface ProjectInfo {
  project: string;
  versions: {
    version: string | null;
    modelSize: string | null;
    lastSeen: string;
    runCount: number;
  }[];
}

// One row from /api/eval (the eval_results table). The evaluator
// produces multiple rows per evaluated window: one per (task, metric)
// pair (e.g. hellaswag x acc, hellaswag x acc_norm, mmlu x acc, ...).
export interface EvalResult {
  id: number;
  version: string;
  project: string;
  window: number;
  globalStep: number | null;
  task: string;
  metricName: string;
  score: number;
  numFewshot: number;
  nSamples: number | null;
  evalDurationS: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// Response shape of /api/eval/latest -- one entry per task with the
// most-recent (window) score for the configured metric (defaults to
// acc_norm). Used for the headline tile + delta on each task card.
export interface LatestEvalScores {
  latest: Record<
    string,
    {
      score: number;
      window: number;
      globalStep: number | null;
      metricName: string;
      createdAt: string;
      evalDurationS: number | null;
      nSamples: number | null;
    }
  >;
}
