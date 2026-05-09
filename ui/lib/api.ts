import { useSettingsStore } from "@/lib/store/settings";
import type { SessionStatus } from "@/lib/store/session";

function base() {
  return useSettingsStore.getState().gatewayUrl;
}

export async function sessionStart(label?: string): Promise<SessionStatus> {
  const r = await fetch(`${base()}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label ?? null }),
  });
  return r.json();
}

export async function sessionStop(): Promise<SessionStatus> {
  await fetch(`${base()}/api/session/stop`, { method: "POST" });
  return sessionStatus();
}

export async function sessionStatus(): Promise<SessionStatus> {
  const r = await fetch(`${base()}/api/session/status`);
  return r.json();
}
