"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveInnerStep } from "./use-live-metrics";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL
    ? `${process.env.NEXT_PUBLIC_WS_URL}/ws/dashboard`
    : "ws://localhost:3001/ws/dashboard";

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_TOKEN || "";

export interface LivenessEntry {
  hotkey: string;
  uid: number | null;
  role: string;
  status: "online" | "offline";
}

export interface LiveUpdateState {
  connected: boolean;
  liveness: Map<string, LivenessEntry>;
  onlineCount: number;
}

interface LiveMetricsStoreLike {
  pushInnerStep(runId: number, point: LiveInnerStep): void;
}

export function useLiveUpdates(
  metricsStore?: LiveMetricsStoreLike,
): LiveUpdateState {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const reconnectDelay = useRef(1000);

  const [connected, setConnected] = useState(false);
  const [liveness, setLiveness] = useState<Map<string, LivenessEntry>>(
    new Map(),
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (DASHBOARD_TOKEN) {
          ws.send(JSON.stringify({ type: "auth", token: DASHBOARD_TOKEN }));
        }
        setConnected(true);
        reconnectDelay.current = 1000;
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          if (msg.event === "liveness-snapshot") {
            const newMap = new Map<string, LivenessEntry>();
            for (const client of msg.clients as LivenessEntry[]) {
              newMap.set(client.hotkey, client);
            }
            setLiveness(newMap);
          }

          if (msg.event === "liveness") {
            setLiveness((prev) => {
              const next = new Map(prev);
              if (msg.status === "offline") {
                next.delete(msg.hotkey);
              } else {
                next.set(msg.hotkey, {
                  hotkey: msg.hotkey,
                  uid: msg.uid,
                  role: msg.role,
                  status: msg.status,
                });
              }
              return next;
            });
          }

          if (msg.event === "metric") {
            const runId = msg.runId as number | undefined;

            if (msg.type === "window") {
              queryClient.invalidateQueries({ queryKey: ["windows"] });
              queryClient.invalidateQueries({ queryKey: ["windows-full"] });
              queryClient.invalidateQueries({ queryKey: ["network-stats"] });
              queryClient.invalidateQueries({ queryKey: ["run"] });
              queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
              queryClient.invalidateQueries({
                queryKey: ["leaderboard-preview"],
              });
              queryClient.invalidateQueries({ queryKey: ["runs-overview"] });
              queryClient.invalidateQueries({ queryKey: ["gradients"] });
            } else if (msg.type === "miner") {
              queryClient.invalidateQueries({ queryKey: ["miner-metrics"] });
              queryClient.invalidateQueries({ queryKey: ["miner-metrics-overview"] });
              queryClient.invalidateQueries({ queryKey: ["run"] });
            } else if (msg.type === "inner-step") {
              if (metricsStore && runId !== undefined && msg.data) {
                const d = msg.data as Record<string, unknown>;
                metricsStore.pushInnerStep(runId, {
                  globalStep: (d.globalStep as number) ?? 0,
                  loss: (d.loss as number) ?? null,
                  gradNorm: (d.gradNorm as number) ?? null,
                  innerLr: (d.innerLr as number) ?? null,
                  window: (d.window as number) ?? 0,
                  ts: Date.now(),
                });
              }
              queryClient.invalidateQueries({ queryKey: ["inner-steps"] });
            } else if (msg.type === "sync-scores") {
              queryClient.invalidateQueries({ queryKey: ["sync-scores"] });
            } else if (msg.type === "slash" || msg.type === "inactivity") {
              queryClient.invalidateQueries({ queryKey: ["slashes"] });
              queryClient.invalidateQueries({ queryKey: ["slashes-overview"] });
              queryClient.invalidateQueries({ queryKey: ["slashes-runs"] });
              queryClient.invalidateQueries({ queryKey: ["inactivity"] });
              queryClient.invalidateQueries({ queryKey: ["inactivity-overview"] });
              queryClient.invalidateQueries({ queryKey: ["inactivity-runs"] });
              queryClient.invalidateQueries({ queryKey: ["uid-detail"] });
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 2,
            30_000,
          );
          connect();
        }, reconnectDelay.current);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimer.current = setTimeout(connect, reconnectDelay.current);
    }
  }, [queryClient, metricsStore]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const onlineCount = liveness.size;

  return { connected, liveness, onlineCount };
}
