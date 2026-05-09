"use client";
import { create } from "zustand";

export type SessionStatus = {
  recording: boolean;
  label?: string;
  session_dir?: string;
  elapsed_sec?: number;
};

type SessionState = {
  status: SessionStatus;
  setStatus: (s: SessionStatus) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  status: { recording: false },
  setStatus: (status) => set({ status }),
}));
