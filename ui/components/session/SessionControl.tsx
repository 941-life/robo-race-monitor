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
      // Connection may be offline; keep the panel responsive.
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
      // Connection may be offline; keep the panel responsive.
    } finally {
      setBusy(false);
    }
  }

  const elapsed = Math.floor(status.elapsed_sec ?? 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const sessionName = status.session_dir?.split("/").pop() ?? status.label;

  return (
    <div className="bg-[#262e38] border border-white/10 flex flex-col shrink-0">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
          Session
        </span>
        <span
          className={`h-2 w-2 rounded-full ${
            status.recording ? "bg-[#e22718] animate-pulse" : "bg-[#262626] border border-white/20"
          }`}
        />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${status.recording ? "text-[#e22718]" : "text-[#6b6b6b]"}`}>
          {status.recording ? "Recording" : "Stopped"}
        </span>
        <span className="ml-auto font-mono text-sm font-bold tabular-nums text-white">
          {mm}:{ss}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-2.5">
        {status.recording && sessionName && (
          <div className="truncate border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#6b6b6b]">
            {sessionName}
          </div>
        )}
        {!status.recording && (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Session label (optional)"
            className="h-9 w-full bg-[#1a1a1a] border border-white/10 px-3 text-xs text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-white transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
        )}

        {status.recording ? (
          <button
            onClick={handleStop}
            disabled={busy}
            className="flex h-9 items-center justify-center gap-2 border border-[#e22718] bg-transparent px-4 text-xs font-bold uppercase tracking-[1.5px] text-[#e22718] transition-colors hover:bg-[#e22718]/10 disabled:opacity-50"
          >
            <Square size={12} fill="currentColor" />
            Stop Recording
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={busy}
            className="flex h-9 items-center justify-center gap-2 border border-white/20 bg-[#1a1a1a] px-4 text-xs font-bold uppercase tracking-[1.5px] text-white transition-colors hover:border-white disabled:opacity-50"
          >
            <Circle size={12} fill="currentColor" />
            Start Recording
          </button>
        )}
      </div>
    </div>
  );
}
