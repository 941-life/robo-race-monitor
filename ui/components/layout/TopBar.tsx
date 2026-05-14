"use client";
import { useEffect } from "react";
import { useTopicsStore, useTopicStr, useTopicBool } from "@/lib/store/topics";
import { useSessionStore } from "@/lib/store/session";
import { sessionStatus } from "@/lib/api";

const WS_STATUS: Record<string, { dot: string; label: string }> = {
  connected:    { dot: "bg-[#0fa336]",               label: "CONNECTED"    },
  connecting:   { dot: "bg-[#f4b400] animate-pulse", label: "CONNECTING"   },
  disconnected: { dot: "bg-[#e22718] animate-pulse", label: "DISCONNECTED" },
  idle:         { dot: "bg-white/30",                label: "IDLE"         },
};

const REGION_STYLE: Record<string, string> = {
  go:       "text-[#bbbbbb] border border-white/20",
  overtake: "bg-[#1c69d4]/20 text-[#1c69d4] border border-[#1c69d4]/50",
  slow:     "bg-[#f4b400]/20 text-[#f4b400] border border-[#f4b400]/50",
  warning:  "bg-[#f4b400]/20 text-[#f4b400] border border-[#f4b400]/50",
  curve:    "bg-[#1c69d4]/15 text-[#bbbbbb] border border-[#1c69d4]/50",
};

const DECISION_STYLE: Record<string, string> = {
  fast:      "bg-[#0fa336] text-white",
  slow_down: "bg-[#f4b400] text-[#1a2129]",
  change:    "bg-[#1c69d4] text-white",
  fast_lc:   "bg-[#0653b6] text-white",
  stop:      "bg-[#e22718] text-white",
};

const JUDGMENT_STYLE: Record<string, string> = {
  fast:         "text-[#bbbbbb] border border-white/20",
  slowdown:     "bg-[#f4b400]/20 text-[#f4b400] border border-[#f4b400]/50",
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
    <div className="flex min-w-[72px] flex-1 flex-col items-center gap-0.5 sm:min-w-[90px] sm:flex-none">
      <span className="text-[8px] font-bold uppercase leading-none tracking-[1.4px] text-[#6b6b6b] sm:text-[9px] sm:tracking-[2px]">
        {chipLabel}
      </span>
      {value ? (
        <span className={`max-w-full truncate px-2 py-1 text-[10px] font-bold uppercase tracking-[0.8px] sm:px-3 sm:text-[11px] sm:tracking-[1px]${pulse} ${cls}`}>
          {value}
        </span>
      ) : (
        <span className="border border-white/10 px-2 py-1 text-[10px] font-bold tracking-[1px] text-white/20 sm:px-3 sm:text-[11px]">
          ??
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
    <div className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-3">
      <StatusChip chipLabel="Region"   value={region}   styleMap={REGION_STYLE} />
      <span className="hidden h-6 w-px shrink-0 bg-white/10 sm:block" />
      <StatusChip chipLabel="Judgment" value={estop}    styleMap={JUDGMENT_STYLE} pulseOn="em" />
      <span className="hidden h-6 w-px shrink-0 bg-white/10 sm:block" />
      <StatusChip chipLabel="Decision" value={decision} styleMap={DECISION_STYLE} pulseOn="stop" />
    </div>
  );
}

function EmergencyBanner() {
  const dec1    = useTopicStr("/decision");
  const dec2    = useTopicStr("/monitoring/gpp/decision");
  const estop   = useTopicStr("/monitoring/gpp/estop_decision");
  const p1valid = useTopicBool("/monitoring/gpp/path1_valid");
  const p2valid = useTopicBool("/monitoring/gpp/path2_valid");

  const decision = dec1 ?? dec2;

  const criticalAlerts: string[] = [];
  if (decision === "stop")                     criticalAlerts.push("VEHICLE STOPPED");
  if (estop === "em")                          criticalAlerts.push("EMERGENCY JUDGMENT");
  if (p1valid === false && p2valid === false)  criticalAlerts.push("NO VALID PATH");

  const alertText = criticalAlerts.join("  |  ");
  if (!alertText) return null;

  return (
    <div className="flex w-full items-center justify-center bg-[#e22718] py-1.5 animate-pulse">
      <span className="px-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-white">
        {alertText}
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
      <span className="h-2 w-2 rounded-full bg-[#e22718] animate-pulse" />
      <span className="font-mono text-xs font-bold uppercase tracking-[1.5px] text-[#e22718]">
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
    <header className="z-50 flex shrink-0 flex-col border-b border-white/10 bg-[#1a2129]">
      <EmergencyBanner />
      <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 lg:h-14 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 lg:px-4 lg:py-0">
        <div className="min-w-0 flex items-center gap-4 justify-self-start">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex gap-0.5">
              <span className="h-5 w-1 bg-[#0066b1] sm:h-6 sm:w-1.5" />
              <span className="h-5 w-1 bg-[#1c69d4] sm:h-6 sm:w-1.5" />
              <span className="h-5 w-1 bg-[#e22718] sm:h-6 sm:w-1.5" />
            </div>
            <span className="text-[12px] font-bold uppercase tracking-[1.2px] text-white sm:text-[13px] sm:tracking-[1.5px]">
              GADIS Monitor
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-l border-white/10 pl-3 sm:pl-4">
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb] sm:text-xs">
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="hidden justify-self-center lg:block">
          <DecisionArea />
        </div>

        <div className="min-w-0 flex items-center gap-4 justify-self-end">
          <SessionIndicator />
        </div>
      </div>
      <div className="border-t border-white/10 px-2 py-2 lg:hidden">
        <DecisionArea />
      </div>
    </header>
  );
}
