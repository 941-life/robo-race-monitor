import { useSettingsStore } from "@/lib/store/settings";
import type { SessionStatus } from "@/lib/store/session";

function base() {
  return useSettingsStore.getState().gatewayUrl;
}

function authHeaders(): HeadersInit {
  const token = useSettingsStore.getState().gatewayToken;
  return token ? { "X-Gateway-Token": token } : {};
}

export async function sessionStart(label?: string): Promise<SessionStatus> {
  const r = await fetch(`${base()}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ label: label ?? null }),
  });
  return r.json();
}

export async function sessionStop(): Promise<SessionStatus> {
  await fetch(`${base()}/api/session/stop`, { method: "POST", headers: authHeaders() });
  return sessionStatus();
}

export async function sessionStatus(): Promise<SessionStatus> {
  const r = await fetch(`${base()}/api/session/status`, { headers: authHeaders() });
  return r.json();
}
