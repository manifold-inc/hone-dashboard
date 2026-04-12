import type {
  TrainingRun,
  WindowMetrics,
  UidScore,
  MinerMetricsRow,
  GradientStatsRow,
  NetworkStats,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
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

export function getRuns(params?: { role?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.role) q.set("role", params.role);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return fetchJson<{ runs: TrainingRun[]; total: number }>(
    `/api/runs${qs ? `?${qs}` : ""}`
  );
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
