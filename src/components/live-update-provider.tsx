"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useLiveUpdates, type LiveUpdateState } from "@/lib/use-live-updates";
import {
  createLiveMetricsStore,
  LiveMetricsStoreContext,
} from "@/lib/use-live-metrics";

const LiveUpdateContext = createContext<LiveUpdateState>({
  connected: false,
  liveness: new Map(),
  onlineCount: 0,
});

export function LiveUpdateProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef(createLiveMetricsStore());
  const state = useLiveUpdates(storeRef.current);
  return (
    <LiveMetricsStoreContext.Provider value={storeRef.current}>
      <LiveUpdateContext.Provider value={state}>
        {children}
      </LiveUpdateContext.Provider>
    </LiveMetricsStoreContext.Provider>
  );
}

export function useLiveContext(): LiveUpdateState {
  return useContext(LiveUpdateContext);
}

export function useHotkeyLiveness(hotkey: string): "online" | "offline" {
  const { liveness } = useContext(LiveUpdateContext);
  return liveness.get(hotkey)?.status ?? "offline";
}
