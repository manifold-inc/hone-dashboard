import type {
  TrainingRun,
  WindowMetrics,
  UidScore,
  MinerMetricsRow,
  GradientStatsRow,
  SyncScoreRow,
  SlashEventRow,
  InactivityEventRow,
  InnerStepRow,
  GatherStatusRow,
  LeaderboardEntry,
  UidDetail,
  NetworkStats,
  ProjectVersionRow,
  EvalResult,
  LatestEvalScores,
} from "./types";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const proxyPath = path.replace(/^\/api\//, "/api/proxy/");
  const res = await fetch(proxyPath, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getNetworkStats() {
  return fetchJson<NetworkStats>("/api/stats/network");
}

export function getRuns(params?: {
  role?: string;
  project?: string;
  version?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.role) q.set("role", params.role);
  if (params?.project) q.set("project", params.project);
  if (params?.version) q.set("version", params.version);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return fetchJson<{ runs: TrainingRun[]; total: number }>(
    `/api/runs${qs ? `?${qs}` : ""}`
  );
}

export function getProjects() {
  return fetchJson<{ projects: ProjectVersionRow[] }>("/api/runs/projects");
}

export function getRun(id: string) {
  return fetchJson<{
    run: TrainingRun;
    latestWindow: WindowMetrics | null;
    latestMiner: MinerMetricsRow | null;
  }>(`/api/runs/${id}`);
}

export function getWindows(id: string, params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return fetchJson<{ windows: WindowMetrics[] }>(
    `/api/runs/${id}/windows${qs ? `?${qs}` : ""}`
  );
}

export function getScores(id: string, params?: { uid?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.uid !== undefined) q.set("uid", String(params.uid));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ scores: UidScore[] }>(
    `/api/runs/${id}/scores${qs ? `?${qs}` : ""}`
  );
}

export function getMinerMetrics(id: string, params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ miners: MinerMetricsRow[] }>(
    `/api/runs/${id}/miners${qs ? `?${qs}` : ""}`
  );
}

export function getGradientStats(id: string, params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ gradients: GradientStatsRow[] }>(
    `/api/runs/${id}/gradients${qs ? `?${qs}` : ""}`
  );
}

export function getSyncScores(id: string, params?: { uid?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.uid !== undefined) q.set("uid", String(params.uid));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ syncScores: SyncScoreRow[] }>(
    `/api/runs/${id}/sync-scores${qs ? `?${qs}` : ""}`
  );
}

export function getSlashEvents(id: string, params?: { uid?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.uid !== undefined) q.set("uid", String(params.uid));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ slashes: SlashEventRow[] }>(
    `/api/runs/${id}/slashes${qs ? `?${qs}` : ""}`
  );
}

export function getInactivityEvents(id: string, params?: { uid?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.uid !== undefined) q.set("uid", String(params.uid));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ inactivity: InactivityEventRow[] }>(
    `/api/runs/${id}/inactivity${qs ? `?${qs}` : ""}`
  );
}

export function getLeaderboard(params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ leaderboard: LeaderboardEntry[] }>(
    `/api/stats/leaderboard${qs ? `?${qs}` : ""}`
  );
}

export function getUidDetail(uid: number, params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<UidDetail>(
    `/api/stats/uid/${uid}${qs ? `?${qs}` : ""}`
  );
}

export function getInnerSteps(id: string, params?: { window?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.window !== undefined) q.set("window", String(params.window));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ innerSteps: InnerStepRow[] }>(
    `/api/runs/${id}/inner-steps${qs ? `?${qs}` : ""}`
  );
}

export function getGatherStatus(id: string, params?: { window?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.window !== undefined) q.set("window", String(params.window));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return fetchJson<{ gatherStatus: GatherStatusRow[] }>(
    `/api/runs/${id}/gather-status${qs ? `?${qs}` : ""}`
  );
}

// ----- Evaluator endpoints --------------------------------------------------
// Time-series of evaluator-published benchmark scores. Pass ``version``
// to scope to a single training-run version (you almost always want
// this -- otherwise you're mixing tasks across model checkpoints from
// different code versions).
export function getEvalResults(params?: {
  version?: string;
  task?: string;
  metric?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.version) q.set("version", params.version);
  if (params?.task) q.set("task", params.task);
  if (params?.metric) q.set("metric", params.metric);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return fetchJson<{ results: EvalResult[] }>(
    `/api/eval${qs ? `?${qs}` : ""}`,
  );
}

// Per-task latest score for the most recent evaluated checkpoint of
// ``version``. Defaults to ``acc_norm`` (length-normalised accuracy).
export function getLatestEvalScores(version: string, metric: string = "acc_norm") {
  const q = new URLSearchParams({ version, metric });
  return fetchJson<LatestEvalScores>(`/api/eval/latest?${q.toString()}`);
}

export async function getProjectBlog(project: string): Promise<string | null> {
  const branch = process.env.NEXT_PUBLIC_GITHUB_CONTENT_BRANCH || "refactor";
  const url = `https://raw.githubusercontent.com/manifold-inc/hone/${branch}/msg/${project}/README.md`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } } as RequestInit);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}
