import { useTopicsStore } from "@/lib/store/topics";
import { useSettingsStore } from "@/lib/store/settings";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let initialized = false;

export function connectWS() {
  if (typeof window === "undefined") return;
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  const url = useSettingsStore.getState().wsUrl;
  useTopicsStore.getState().setStatus("connecting");

  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    useTopicsStore.getState().setStatus("connected");
    reconnectDelay = 1000;
  };

  ws.onmessage = (e: MessageEvent) => {
    try {
      const env = JSON.parse(e.data as string);
      useTopicsStore.getState().ingest(env);
    } catch {
      // malformed frame — ignore
    }
  };

  ws.onclose = () => {
    useTopicsStore.getState().setStatus("disconnected");
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 10000);
    connectWS();
  }, reconnectDelay);
}

export function initWS() {
  if (initialized) return;
  initialized = true;
  connectWS();

  // re-connect whenever gatewayUrl changes
  useSettingsStore.subscribe((state, prev) => {
    if (state.wsUrl !== prev.wsUrl) {
      ws?.close();
      reconnectDelay = 1000;
      connectWS();
    }
  });
}

export function disconnectWS() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
  initialized = false;
}
