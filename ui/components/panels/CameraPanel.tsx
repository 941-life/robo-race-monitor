"use client";
import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/lib/store/settings";
import { Camera, WifiOff } from "lucide-react";

export default function CameraPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const camUrl = useSettingsStore((s) => s.camUrl);
  const [connected, setConnected] = useState(false);
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;
      const ws = new WebSocket(camUrl);
      ws.binaryType = "blob";
      wsRef.current = ws;

      ws.onopen = () => { if (active) setConnected(true); };

      ws.onmessage = async (e: MessageEvent) => {
        if (!active) return;
        try {
          const bitmap = await createImageBitmap(e.data as Blob);
          const canvas = canvasRef.current;
          if (!canvas || !active) { bitmap.close(); return; }
          const ctx = canvas.getContext("2d");
          if (!ctx) { bitmap.close(); return; }
          if (canvas.width !== bitmap.width) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          frameCount.current++;
        } catch {
          // ignore decode errors
        }
      };

      ws.onclose = () => {
        if (!active) return;
        setConnected(false);
        setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    const fpsId = setInterval(() => {
      if (active) {
        setFps(frameCount.current);
        frameCount.current = 0;
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(fpsId);
      wsRef.current?.close();
    };
  }, [camUrl]);

  return (
    // h-full — 부모 flex-1 컨테이너를 꽉 채움
    <div className="bg-[#262e38] border border-white/10 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={13} className="text-[#1c69d4]" />
          <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#bbbbbb]">
            Camera
          </span>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="text-xs text-[#6b6b6b] tabular-nums font-mono">{fps} fps</span>
          ) : (
            <WifiOff size={12} className="text-[#e22718]" />
          )}
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-[#22c55e]" : "bg-[#e22718] animate-pulse"}`}
          />
        </div>
      </div>

      {/* Canvas 영역 — flex-1으로 헤더 제외한 공간 전부 차지 */}
      {/* canvas에 max-w-full + max-h-full + auto 치수 → letterbox로 4:3 비율 유지 */}
      <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
          }}
        />
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#6b6b6b]">
            <WifiOff size={28} />
            <span className="text-sm tracking-widest">신호 없음</span>
          </div>
        )}
      </div>
    </div>
  );
}
