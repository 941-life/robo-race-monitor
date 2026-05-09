"use client";
import { create } from "zustand";
import { useTimeSeriesStore } from "./timeseries";

export type WsStatus = "idle" | "connecting" | "connected" | "disconnected";

export type Envelope = {
  topic: string;
  category: string;
  stamp: number;
  data: unknown;
};

type TopicsState = {
  status: WsStatus;
  latest: Record<string, Envelope>;
  lastStamp: Record<string, number>;
  setStatus: (s: WsStatus) => void;
  ingest: (env: Envelope) => void;
};

const TIME_SERIES_TOPICS = new Set([
  "/cross_track_error",
  "/steer_deg",
  "/target_vel",
  "/current_vel_print",
  "/curvature",
]);

export const useTopicsStore = create<TopicsState>((set) => ({
  status: "idle",
  latest: {},
  lastStamp: {},
  setStatus: (status) => set({ status }),
  ingest: (env) => {
    set((state) => ({
      latest: { ...state.latest, [env.topic]: env },
      lastStamp: { ...state.lastStamp, [env.topic]: Date.now() },
    }));
    if (TIME_SERIES_TOPICS.has(env.topic)) {
      const val = (env.data as { data: number })?.data;
      if (typeof val === "number") {
        useTimeSeriesStore.getState().push(env.topic, env.stamp, val);
      }
    }
  },
}));

export function useTopic<T = unknown>(topic: string): T | undefined {
  return useTopicsStore(
    (s) => s.latest[topic]?.data as T | undefined
  );
}

export function useTopicVal(topic: string): number | undefined {
  const data = useTopic<{ data: number }>(topic);
  return data?.data;
}

export function useTopicStr(topic: string): string | undefined {
  const data = useTopic<{ data: string }>(topic);
  return data?.data;
}

export function useTopicBool(topic: string): boolean | undefined {
  const data = useTopic<{ data: boolean }>(topic);
  return data?.data;
}

export function useIsStale(topic: string, maxAgeMs = 2000): boolean {
  const stamp = useTopicsStore((s) => s.lastStamp[topic]);
  if (stamp === undefined) return true;
  return Date.now() - stamp > maxAgeMs;
}
