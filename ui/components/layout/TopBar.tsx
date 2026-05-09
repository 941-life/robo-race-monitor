"use client";
import { useEffect } from "react";
import { useTopicsStore, useTopicStr, useTopicBool } from "@/lib/store/topics";
import { useSessionStore } from "@/lib/store/session";
import { sessionStatus } from "@/lib/api";

const WS_STATUS: Record<string, { dot: string; label: string }> = {
  connected:    { dot: "bg-[#22c55e]",               label: "CONNECTED"    },
  connecting:   { dot: "bg-[#f59e0b] animate-pulse", label: "CONNECTING"   },
  disconnected: { dot: "bg-[#e22718] animate-pulse", label: "DISCONNECTED" },
  idle:         { dot: "bg-white/30",                label: "IDLE"         },
};

const REGION_STYLE: Record<string, string> = {
  go:       "text-[#bbbbbb] border border-white/20",
  overtake: "bg-[#1c69d4]/20 text-[#1c69d4] border border-[#1c69d4]/50",
  slow:     "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/50",
  warning:  "bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/50",
  curve:    "bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/50",
};

const DECISION_STYLE: Record<string, string> = {
  fast:      "bg-[#22c55e] text-white",
  slow_down: "bg-[#f59e0b] text-[#1a2129]",
  change:    "bg-[#1c69d4] text-white",
  fast_lc:   "bg-[#06b6d4] text-[#1a2129]",
  stop:      "bg-[#e22718] text-white",
};

const JUDGMENT_STYLE: Record<string, string> = {
  fast:         "text-[#bbbbbb] border border-white/20",
  slowdown:     "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/50",
  start_change: "bg-[#1c69d4]/20 text-[#1c69d4] border border-[#1c69d4]/50",
  em:           "bg-[#e22718]/20 text-[#e22718] border border-[#e22718]/60",
};

function StatusChip({
  chipLabel,
  value,
  styleMap,
  pulseOn,
}: {
  chipLabel: string;
  value: string | undefined;
  styleMap: Record<string, string>;
  pulseOn?: string;
}) {
  const cls = value ? (styleMap[value] ?? "text-[#bbbbbb] border border-white/20") : "";
  const pulse = value && pulseOn && value === pulseOn ? " animate-pulse" : "";
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[90px]">
      <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#6b6b6b] leading-none">
        {chipLabel}
      </span>
      {value ? (
        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-[1px]${pulse} ${cls}`}>
          {value}
        </span>
      ) : (
        <span className="px-3 py-1 text-[11px] font-bold tracking-[1px] text-white/20 border border-white/10">
          —
        </span>
      )}
    </div>
  );
}

function DecisionArea() {
  const region1 = useTopicStr("/region");
  const region2 = useTopicStr("/monitoring/gpp/region");
  const dec1    = useTopicStr("/decision");
  const dec2    = useTopicStr("/monitoring/gpp/decision");
  const estop   = useTopicStr("/monitoring/gpp/estop_decision");

  const region   = region1 ?? region2;
  const decision = dec1    ?? dec2;

  return (
    <div className="flex items-center gap-3">
      <StatusChip chipLabel="Region"   value={region}   styleMap={REGION_STYLE} />
      <span className="w-px h-6 bg-white/10 shrink-0" />
      <StatusChip chipLabel="Decision" value={decision} styleMap={DECISION_STYLE} pulseOn="stop" />
      <span className="w-px h-6 bg-white/10 shrink-0" />
      <StatusChip chipLabel="Judgment" value={estop}    styleMap={JUDGMENT_STYLE} pulseOn="em" />
    </div>
  );
}

function EmergencyBanner() {
  const dec1    = useTopicStr("/decision");
  const dec2    = useTopicStr("/monitoring/gpp/decision");
  const estop   = useTopicStr("/monitoring/gpp/estop_decision");
  const camStop = useTopicBool("/monitoring/gpp/camera_stop_active");
  const p1valid = useTopicBool("/monitoring/gpp/path1_valid");
  const p2valid = useTopicBool("/monitoring/gpp/path2_valid");

  const decision = dec1 ?? dec2;

  const alerts: string[] = [];
  if (camStop === true)                        alerts.push("CAMERA STOP ACTIVE");
  if (decision === "stop")                     alerts.push("VEHICLE STOPPED");
  if (estop === "em")                          alerts.push("EMERGENCY JUDGMENT");
  if (p1valid === false && p2valid === false)  alerts.push("NO VALID PATH");

  if (alerts.length === 0) return null;

  return (
    <div className="w-full bg-[#e22718] flex items-center justify-center py-1.5 animate-pulse">
      <span className="text-[11px] font-bold uppercase tracking-[2px] text-white">
        {alerts.join("  ·  ")}
      </span>
    </div>
  );
}

function SessionIndicator() {
  const { status } = useSessionStore();
  if (!status.recording) return null;
  const elapsed = Math.floor(status.elapsed_sec ?? 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-[#e22718] animate-pulse" />
      <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#e22718] font-mono">
        REC {mm}:{ss}
      </span>
    </div>
  );
}

export default function TopBar() {
  const wsStatus = useTopicsStore((s) => s.status);
  const { setStatus } = useSessionStore();
  const cfg = WS_STATUS[wsStatus] ?? WS_STATUS.idle;

  useEffect(() => {
    sessionStatus().then(setStatus).catch(() => {});
    const id = setInterval(() => sessionStatus().then(setStatus).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [setStatus]);

  const { status: sess } = useSessionStore();
  useEffect(() => {
    if (!sess.recording) return;
    const id = setInterval(() => {
      setStatus({ ...sess, elapsed_sec: (sess.elapsed_sec ?? 0) + 1 });
    }, 1000);
    return () => clearInterval(id);
  }, [sess.recording, sess.elapsed_sec]); // eslint-disable-line

  return (
    <header className="shrink-0 flex flex-col border-b border-white/10 bg-[#1a2129] z-50">
      <EmergencyBanner />
      <div className="h-14 flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-6 bg-[#0066b1]" />
            <span className="w-1.5 h-6 bg-[#1c69d4]" />
            <span className="w-1.5 h-6 bg-[#e22718]" />
          </div>
          <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
            GADIS Monitor
          </span>
        </div>

        {/* WS status */}
        <div className="flex items-center gap-2 shrink-0 border-l border-white/10 pl-4">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="text-xs font-bold uppercase tracking-widest text-[#bbbbbb]">
            {cfg.label}
          </span>
        </div>

        {/* Decision chips */}
        <div className="flex-1 flex items-center justify-center">
          <DecisionArea />
        </div>

        {/* Session REC */}
        <div className="flex items-center gap-4 shrink-0">
          <SessionIndicator />
        </div>
      </div>
    </header>
  );
}
