"use client";
import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/lib/store/settings";
import { useTopicBool } from "@/lib/store/topics";
import { WifiOff } from "lucide-react";

export default function CameraPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const camUrl = useSettingsStore((s) => s.camUrl);
  const cameraStop = useTopicBool("/monitoring/gpp/camera_stop_active");
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

      ws.onopen = () => {
        if (active) setConnected(true);
      };

      ws.onmessage = async (e: MessageEvent) => {
        if (!active) return;
        try {
          const bitmap = await createImageBitmap(e.data as Blob);
          const canvas = canvasRef.current;
          if (!canvas || !active) {
            bitmap.close();
            return;
          }
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            bitmap.close();
            return;
          }
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          frameCount.current++;
        } catch {
          // Ignore individual decode failures; the next frame can recover.
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
    <div className="bg-[#262e38] border border-white/10 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
            Camera
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cameraStop === true && (
            <span className="border border-[#f4b400]/60 bg-[#f4b400]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#f4b400]">
              CAM STOP
            </span>
          )}
          {connected ? (
            <span className="text-xs text-[#6b6b6b] tabular-nums font-mono">{fps} fps</span>
          ) : (
            <WifiOff size={12} className="text-[#e22718]" />
          )}
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-[#0fa336]" : "bg-[#e22718] animate-pulse"}`}
          />
        </div>
      </div>

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
        {cameraStop === true && connected && (
          <div className="pointer-events-none absolute inset-x-0 top-0 border-b border-[#f4b400]/40 bg-[#f4b400]/15 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#f4b400]">
              Camera stop active
            </span>
          </div>
        )}
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#6b6b6b]">
            <WifiOff size={28} />
            <span className="text-sm font-bold uppercase tracking-widest">No camera signal</span>
          </div>
        )}
      </div>
    </div>
  );
}
