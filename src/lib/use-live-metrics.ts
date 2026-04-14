"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface LiveInnerStep {
  globalStep: number;
  loss: number | null;
  gradNorm: number | null;
  innerLr: number | null;
  window: number;
  ts: number;
}

const MAX_BUFFER_SIZE = 500;

type Listener = () => void;

class LiveMetricsStore {
  private buffers = new Map<number, LiveInnerStep[]>();
  private listeners = new Set<Listener>();
  private version = 0;

  pushInnerStep(runId: number, point: LiveInnerStep) {
    let buf = this.buffers.get(runId);
    if (!buf) {
      buf = [];
      this.buffers.set(runId, buf);
    }
    buf.push(point);
    if (buf.length > MAX_BUFFER_SIZE) {
      buf.splice(0, buf.length - MAX_BUFFER_SIZE);
    }
    this.version++;
    this.notify();
  }

  getInnerSteps(runId: number): LiveInnerStep[] {
    return this.buffers.get(runId) ?? [];
  }

  getVersion(): number {
    return this.version;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}

const StoreContext = createContext<LiveMetricsStore | null>(null);

export function createLiveMetricsStore(): LiveMetricsStore {
  return new LiveMetricsStore();
}

export { StoreContext as LiveMetricsStoreContext };

export function useLiveInnerSteps(runId: number | undefined): LiveInnerStep[] {
  const store = useContext(StoreContext);
  if (!store || runId === undefined) return [];

  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  );
  const getSnapshot = useCallback(
    () => store.getVersion(),
    [store],
  );

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return store.getInnerSteps(runId);
}
