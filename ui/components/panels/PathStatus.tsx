"use client";
import type { ReactNode } from "react";
import { useTopicBool, useTopicVal, useTopic } from "@/lib/store/topics";
import { CheckCircle, Info, XCircle } from "lucide-react";

const SUCCESS = "#0fa336";
const WARNING = "#f4b400";
const DANGER = "#e22718";
const BLUE = "#1c69d4";

function ValidBadge({ valid }: { valid: boolean | undefined }) {
  if (valid === undefined) {
    return <span className="text-sm text-white/20">??</span>;
  }
  return valid
    ? <CheckCircle size={15} style={{ color: SUCCESS }} />
    : <XCircle size={15} style={{ color: DANGER }} />;
}

function StatusPill({ label, valid }: { label: string; valid: boolean | undefined }) {
  const color = valid === false ? DANGER : valid === true ? SUCCESS : "#6b6b6b";
  const text = valid === undefined ? "WAIT" : valid ? "VALID" : "INVALID";

  return (
    <div className="flex min-w-0 items-center justify-between border border-white/10 bg-[#1a1a1a] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#bbbbbb]">
        {label}
      </span>
      <span
        className="text-[10px] font-bold uppercase tracking-[1.5px]"
        style={{ color }}
      >
        {text}
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 last:border-0">
      <span className="text-xs font-bold uppercase tracking-widest text-[#bbbbbb]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Num({ val }: { val: number | undefined }) {
  return (
    <span className="text-sm font-bold tabular-nums text-[#bbbbbb] font-mono">
      {val !== undefined ? String(val) : "??"}
    </span>
  );
}

function PairNum({ a, b, format }: { a: number | undefined; b: number | undefined; format?: (v: number) => string }) {
  const show = (v: number | undefined) => (v !== undefined ? (format ? format(v) : String(v)) : "??");
  return (
    <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
      <span className="text-white">{show(a)}</span>
      <span className="text-[#6b6b6b]">/</span>
      <span className="text-[#bbbbbb]">{show(b)}</span>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#bbbbbb]">
        {label}
      </span>
      <span className="max-w-[150px] truncate text-xs font-bold font-mono text-white">
        {value}
      </span>
    </div>
  );
}

export default function PathStatus() {
  const p1valid = useTopicBool("/monitoring/gpp/path1_valid");
  const p2valid = useTopicBool("/monitoring/gpp/path2_valid");
  const lp1pts = useTopicVal("/monitoring/gpp/local_path1_points");
  const lp2pts = useTopicVal("/monitoring/gpp/local_path2_points");
  const gp1pts = useTopicVal("/monitoring/gpp/global_path1_points");
  const gp2pts = useTopicVal("/monitoring/gpp/global_path2_points");
  const p1dist = useTopicVal("/monitoring/gpp/path1_nearest_distance");
  const p2dist = useTopicVal("/monitoring/gpp/path2_nearest_distance");
  const overlapLock = useTopicBool("/monitoring/gpp/overlap_lock");
  const overlapSep = useTopicVal("/monitoring/gpp/overlap_separation");
  const curPath = useTopic<{ data: number }>("/monitoring/gpp/current_path")?.data;
  const selPath = useTopic<{ data: number }>("/monitoring/gpp/selected_path")?.data;

  const path1File = useTopic<{ data: string }>("/monitoring/gpp/path1_file")?.data;
  const path2File = useTopic<{ data: string }>("/monitoring/gpp/path2_file")?.data;
  const regionId = useTopic<{ data: string }>("/monitoring/gpp/region_id")?.data;
  const frameId = useTopic<{ data: string }>("/monitoring/gpp/frame_id")?.data;

  const pathMismatch = curPath !== undefined && selPath !== undefined && curPath !== selPath;
  const bothInvalid = p1valid === false && p2valid === false;
  const hasConfig = !!(path1File || path2File || regionId || frameId);

  return (
    <div className="relative bg-[#262e38] border border-white/10 flex flex-col overflow-visible shrink-0">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="w-0.5 h-4 shrink-0" style={{ backgroundColor: bothInvalid ? DANGER : SUCCESS }} />
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
          Path Status
        </span>
        {hasConfig && (
          <div className="group relative ml-auto">
            <button
              type="button"
              aria-label="Show path config"
              className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#bbbbbb] transition-colors hover:border-[#1c69d4]/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c69d4]"
            >
              <Info size={15} />
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-64 border border-white/15 bg-[#1a1a1a] p-3 group-hover:block group-focus-within:block">
              <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-white">
                  Config
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b6b6b]">
                  Static
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {regionId && <ConfigRow label="Region ID" value={regionId} />}
                {frameId && <ConfigRow label="Frame" value={frameId} />}
                {path1File && <ConfigRow label="Path 1" value={path1File} />}
                {path2File && <ConfigRow label="Path 2" value={path2File} />}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="border-b border-white/10 px-3 py-2"
        style={{ backgroundColor: pathMismatch ? "rgba(244,180,0,0.08)" : "transparent" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-[#bbbbbb]">
            Active / Selected
          </span>
          {pathMismatch && (
            <span className="border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[1.5px]" style={{ borderColor: `${WARNING}80`, color: WARNING }}>
              CHG
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="border border-white/10 bg-[#1a1a1a] px-2 py-1 text-sm font-bold text-white">
            {curPath !== undefined ? `P${curPath}` : "??"}
          </span>
          <span className="text-[#6b6b6b]">/</span>
          <span
            className="border bg-[#1a1a1a] px-2 py-1 text-sm font-bold"
            style={{
              borderColor: selPath === 0 ? `${DANGER}80` : pathMismatch ? `${WARNING}80` : `${BLUE}80`,
              color: selPath === 0 ? DANGER : pathMismatch ? WARNING : BLUE,
            }}
          >
            {selPath !== undefined ? `P${selPath}` : "??"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/5 p-2">
        <StatusPill label="Path 1" valid={p1valid} />
        <StatusPill label="Path 2" valid={p2valid} />
      </div>

      <div className="flex flex-col">
        <Row label="Local pts 1 / 2">
          <PairNum a={lp1pts} b={lp2pts} />
        </Row>
        <Row label="Global pts 1 / 2">
          <PairNum a={gp1pts} b={gp2pts} />
        </Row>
        <Row label="Nearest dist 1 / 2">
          <PairNum a={p1dist} b={p2dist} format={(v) => v.toFixed(2)} />
        </Row>
        <Row label="Overlap Lock">
          <ValidBadge valid={overlapLock !== undefined ? !overlapLock : undefined} />
          {overlapSep !== undefined && (
            <span className="text-xs tabular-nums text-[#6b6b6b] font-mono">
              sep {overlapSep.toFixed(2)}
            </span>
          )}
        </Row>
      </div>
    </div>
  );
}
