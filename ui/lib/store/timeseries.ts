"use client";
import { create } from "zustand";

const MAX_POINTS = 600; // 30Hz × 20s

export type Point = { t: number; v: number };

type TimeSeriesState = {
  series: Record<string, Point[]>;
  push: (topic: string, t: number, v: number) => void;
  clear: () => void;
};

export const useTimeSeriesStore = create<TimeSeriesState>((set) => ({
  series: {},
  push: (topic, t, v) =>
    set((state) => {
      const arr = state.series[topic] ?? [];
      const next = arr.length >= MAX_POINTS ? arr.slice(1) : arr;
      return { series: { ...state.series, [topic]: [...next, { t, v }] } };
    }),
  clear: () => set({ series: {} }),
}));
