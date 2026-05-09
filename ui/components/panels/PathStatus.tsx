"use client";
import { useTopicBool, useTopicVal, useTopic } from "@/lib/store/topics";
import { CheckCircle, XCircle } from "lucide-react";

function ValidBadge({ valid }: { valid: boolean | undefined }) {
  if (valid === undefined) return <span className="text-sm text-white/20">—</span>;
  return valid
    ? <CheckCircle size={15} className="text-[#22c55e]" />
    : <XCircle    size={15} className="text-[#e22718]" />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 last:border-0">
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
      {val !== undefined ? String(val) : "—"}
    </span>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-widest text-[#4b5563]">{label}</span>
      <span className="text-[10px] font-mono text-[#6b6b6b] truncate max-w-[120px]">{value}</span>
    </div>
  );
}

export default function PathStatus() {
  const p1valid     = useTopicBool("/monitoring/gpp/path1_valid");
  const p2valid     = useTopicBool("/monitoring/gpp/path2_valid");
  const lp1pts      = useTopicVal("/monitoring/gpp/local_path1_points");
  const lp2pts      = useTopicVal("/monitoring/gpp/local_path2_points");
  const gp1pts      = useTopicVal("/monitoring/gpp/global_path1_points");
  const gp2pts      = useTopicVal("/monitoring/gpp/global_path2_points");
  const p1dist      = useTopicVal("/monitoring/gpp/path1_nearest_distance");
  const p2dist      = useTopicVal("/monitoring/gpp/path2_nearest_distance");
  const overlapLock = useTopicBool("/monitoring/gpp/overlap_lock");
  const overlapSep  = useTopicVal("/monitoring/gpp/overlap_separation");
  const curPath     = useTopic<{ data: number }>("/monitoring/gpp/current_path")?.data;
  const selPath     = useTopic<{ data: number }>("/monitoring/gpp/selected_path")?.data;

  // Static config topics (published once at node start)
  const path1File = useTopic<{ data: string }>("/monitoring/gpp/path1_file")?.data;
  const path2File = useTopic<{ data: string }>("/monitoring/gpp/path2_file")?.data;
  const regionId  = useTopic<{ data: string }>("/monitoring/gpp/region_id")?.data;
  const frameId   = useTopic<{ data: string }>("/monitoring/gpp/frame_id")?.data;

  const pathMismatch = curPath !== undefined && selPath !== undefined && curPath !== selPath;
  const hasConfig    = !!(path1File || path2File || regionId || frameId);

  return (
    <div className="bg-[#262e38] border border-white/10 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span className="w-0.5 h-4 bg-[#22c55e] shrink-0" />
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
          Path Status
        </span>
      </div>

      <div className="flex flex-col">
        {/* Active / Selected — yellow bg when mismatched (lane change in progress) */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b border-white/5 transition-colors ${
            pathMismatch ? "bg-[#f59e0b]/8" : ""
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[#bbbbbb]">
            Active / Selected
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white font-mono">
              {curPath !== undefined ? `P${curPath}` : "—"}
            </span>
            <span className={pathMismatch ? "text-[#f59e0b]" : "text-[#6b6b6b]"}>/</span>
            <span
              className={`text-sm font-bold font-mono ${
                selPath === 0   ? "text-[#e22718]"  :
                pathMismatch    ? "text-[#f59e0b]"  :
                                  "text-[#1c69d4]"
              }`}
            >
              {selPath !== undefined ? `P${selPath}` : "—"}
            </span>
            {pathMismatch && (
              <span className="text-[9px] font-bold uppercase tracking-[1px] text-[#f59e0b] border border-[#f59e0b]/50 px-1 py-0.5">
                CHG
              </span>
            )}
          </div>
        </div>

        <Row label="Path 1 Valid"><ValidBadge valid={p1valid} /></Row>
        <Row label="Path 2 Valid"><ValidBadge valid={p2valid} /></Row>
        <Row label="Local pts 1 / 2">
          <Num val={lp1pts} />
          <span className="text-[#6b6b6b]">/</span>
          <Num val={lp2pts} />
        </Row>
        <Row label="Global pts 1 / 2">
          <Num val={gp1pts} />
          <span className="text-[#6b6b6b]">/</span>
          <Num val={gp2pts} />
        </Row>
        <Row label="Nearest dist 1 / 2">
          <span className="text-sm tabular-nums text-[#bbbbbb] font-mono">
            {p1dist !== undefined ? p1dist.toFixed(2) : "—"}
          </span>
          <span className="text-[#6b6b6b]">/</span>
          <span className="text-sm tabular-nums text-[#bbbbbb] font-mono">
            {p2dist !== undefined ? p2dist.toFixed(2) : "—"}
          </span>
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

      {/* CONFIG footer — only visible once node publishes static topics */}
      {hasConfig && (
        <div className="border-t border-white/5 px-3 py-2 flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#4b5563] mb-0.5">
            Config
          </span>
          {regionId  && <ConfigRow label="Region ID" value={regionId}  />}
          {frameId   && <ConfigRow label="Frame"     value={frameId}   />}
          {path1File && <ConfigRow label="Path 1"    value={path1File} />}
          {path2File && <ConfigRow label="Path 2"    value={path2File} />}
        </div>
      )}
    </div>
  );
}
