"use client";
import { create } from "zustand";
import { config } from "@/lib/config";

const FALLBACK_GATEWAY = "wss://localhost:8443";

function getInitialGateway(): string {
  // 1. Env var (set in .env.local for local dev, or Vercel env)
  if (config.apiUrl) return config.apiUrl;
  // 2. User-saved value in localStorage
  if (typeof window !== "undefined") {
    return localStorage.getItem("gatewayUrl") ?? FALLBACK_GATEWAY;
  }
  return FALLBACK_GATEWAY;
}

type SettingsState = {
  gatewayUrl: string;
  wsUrl: string;
  camUrl: string;
  setGatewayUrl: (url: string) => void;
};

function deriveUrls(base: string) {
  // Normalise base to ws:// scheme before appending paths
  const wsBase = base.replace(/^https?:\/\//, (m) =>
    m.startsWith("https") ? "wss://" : "ws://"
  );
  const wsUrl  = config.wsUrl  || `${wsBase}/ws`;
  const camUrl = config.camUrl || `${wsBase}/ws/camera`;
  return { wsUrl, camUrl };
}

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = getInitialGateway();
  return {
    gatewayUrl: initial,
    ...deriveUrls(initial),
    setGatewayUrl: (url: string) => {
      if (typeof window !== "undefined") localStorage.setItem("gatewayUrl", url);
      set({ gatewayUrl: url, ...deriveUrls(url) });
    },
  };
});
