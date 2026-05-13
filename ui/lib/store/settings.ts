"use client";
import { create } from "zustand";
import { config } from "@/lib/config";

const FALLBACK_GATEWAY = "http://127.0.0.1:8000";

function getInitialGateway(): string {
  return config.apiUrl || FALLBACK_GATEWAY;
}

type SettingsState = {
  gatewayUrl: string;
  wsUrl: string;
  camUrl: string;
  gatewayToken: string;
};

function withToken(url: string, token: string) {
  if (!token) return url;
  const u = new URL(url);
  u.searchParams.set("token", token);
  return u.toString();
}

function deriveUrls(base: string, token: string) {
  // Normalise base to ws:// scheme before appending paths
  const wsBase = base.replace(/^https?:\/\//, (m) =>
    m.startsWith("https") ? "wss://" : "ws://"
  );
  const wsUrl  = withToken(config.wsUrl  || `${wsBase}/ws`, token);
  const camUrl = withToken(config.camUrl || `${wsBase}/ws/camera`, token);
  return { wsUrl, camUrl };
}

export const useSettingsStore = create<SettingsState>(() => {
  const initial = getInitialGateway();
  const token = config.gatewayToken;
  return {
    gatewayUrl: initial,
    gatewayToken: token,
    ...deriveUrls(initial, token),
  };
});
