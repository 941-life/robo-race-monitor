"use client";
import { useState } from "react";
import { useSessionStore } from "@/lib/store/session";
import { sessionStart, sessionStop } from "@/lib/api";
import { Circle, Square } from "lucide-react";

export default function SessionControl() {
  const { status, setStatus } = useSessionStore();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setBusy(true);
    try {
      const s = await sessionStart(label.trim() || undefined);
      setStatus(s);
      setLabel("");
    } catch {
      // silently fail — connection may be offline
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      const s = await sessionStop();
      setStatus(s);
    } catch {
      // silently fail
    } finally {
      setBusy(false);
    }
  }

  const elapsed = Math.floor(status.elapsed_sec ?? 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="bg-[#262e38] border border-white/10 flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#bbbbbb]">
          Session
        </span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        {/* Status row */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status.recording ? "bg-[#e22718] animate-pulse" : "bg-[#262e38] border border-white/20"
            }`}
          />
          {status.recording ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-[#e22718] uppercase tracking-widest">
                Recording
              </span>
              <span className="text-xs tabular-nums text-[#bbbbbb] ml-auto">
                {mm}:{ss}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#6b6b6b] uppercase tracking-widest">
              Stopped
            </span>
          )}
        </div>

        {status.recording && status.label && (
          <p className="text-[10px] text-[#6b6b6b] truncate">
            {status.session_dir?.split("/").pop() ?? status.label}
          </p>
        )}

        {/* Label input (only when stopped) */}
        {!status.recording && (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Session label (optional)"
            className="w-full bg-[#1a2129] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#1c69d4] transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
        )}

        {/* Action button */}
        {status.recording ? (
          <button
            onClick={handleStop}
            disabled={busy}
            className="flex items-center justify-center gap-2 w-full py-3 bg-transparent border border-[#e22718] text-[#e22718] text-xs font-bold uppercase tracking-widest hover:bg-[#e22718]/10 disabled:opacity-50 transition-colors"
          >
            <Square size={12} fill="currentColor" />
            Stop Recording
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={busy}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#1c69d4] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0653b6] disabled:opacity-50 transition-colors"
          >
            <Circle size={12} fill="currentColor" />
            Start Recording
          </button>
        )}
      </div>
    </div>
  );
}
