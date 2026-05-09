"use client";
import { useMemo, useRef, useState, useCallback } from "react";
import { useTopic } from "@/lib/store/topics";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type Pose2D = { x: number; y: number };
type PathMsg = { poses: Pose2D[]; n: number };
type OdomMsg = { x: number; y: number; yaw: number };

function polyline(poses: Pose2D[], flipY: number): string {
  if (poses.length === 0) return "";
  return poses
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${flipY - p.y}`)
    .join(" ");
}

export default function PathMap() {
  const gp1 = useTopic<PathMsg>("/global_path1");
  const gp2 = useTopic<PathMsg>("/global_path2");
  const lp1 = useTopic<PathMsg>("/local_path1");
  const lp2 = useTopic<PathMsg>("/local_path2");
  const sel = useTopic<PathMsg>("/selected_path");
  const odom = useTopic<OdomMsg>("/gps_utm_odom");

  const [scale, setScale] = useState(1);

  const { viewBox, flipY } = useMemo(() => {
    const all = [
      ...(gp1?.poses ?? []),
      ...(gp2?.poses ?? []),
    ];
    if (all.length === 0) {
      return { viewBox: "0 0 100 100", flipY: 100 };
    }
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const minX = Math.min(...xs) - 10;
    const maxX = Math.max(...xs) + 10;
    const minY = Math.min(...ys) - 10;
    const maxY = Math.max(...ys) + 10;
    const w = maxX - minX;
    const h = maxY - minY;
    const fY = maxY + minY; // flipY constant for SVG y-axis inversion
    return { viewBox: `${minX} ${minY} ${w} ${h}`, flipY: fY };
  }, [gp1, gp2]);

  const hasData = (gp1?.poses.length ?? 0) > 0 || (gp2?.poses.length ?? 0) > 0;

  return (
    <div className="bg-[#262e38] border border-white/10 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#bbbbbb]">
          Path Map
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-1 text-[#6b6b6b] hover:text-white transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setScale(1)}
            className="p-1 text-[#6b6b6b] hover:text-white transition-colors"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={() => setScale((s) => Math.min(4, s + 0.25))}
            className="p-1 text-[#6b6b6b] hover:text-white transition-colors"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* SVG */}
      <div className="flex-1 relative overflow-hidden">
        {!hasData ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-[#6b6b6b] uppercase tracking-widest">
              Waiting for path data…
            </span>
          </div>
        ) : (
          <svg
            viewBox={viewBox}
            className="w-full h-full"
            style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
          >
            {/* Global paths (faint gray) */}
            {gp1 && (
              <path
                d={polyline(gp1.poses, flipY)}
                stroke="#4b5563"
                strokeWidth={0.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {gp2 && (
              <path
                d={polyline(gp2.poses, flipY)}
                stroke="#374151"
                strokeWidth={0.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Local paths */}
            {lp1 && (
              <path
                d={polyline(lp1.poses, flipY)}
                stroke="#1c69d4"
                strokeWidth={0.4}
                strokeDasharray="1 1"
                fill="none"
              />
            )}
            {lp2 && (
              <path
                d={polyline(lp2.poses, flipY)}
                stroke="#0653b6"
                strokeWidth={0.4}
                strokeDasharray="1 1"
                fill="none"
              />
            )}

            {/* Selected path */}
            {sel && (
              <path
                d={polyline(sel.poses, flipY)}
                stroke="#22c55e"
                strokeWidth={0.6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Vehicle position */}
            {odom && (
              <g
                transform={`translate(${odom.x}, ${flipY - odom.y}) rotate(${(-odom.yaw * 180) / Math.PI})`}
              >
                {/* Arrow pointing forward */}
                <polygon
                  points="0,-1.5 0.8,0.8 0,0.3 -0.8,0.8"
                  fill="#e22718"
                  stroke="#1a2129"
                  strokeWidth={0.15}
                />
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-white/10 shrink-0">
        <LegendItem color="#4b5563" label="Global" />
        <LegendItem color="#1c69d4" label="Local" dashed />
        <LegendItem color="#22c55e" label="Selected" />
        <LegendItem color="#e22718" label="Vehicle" circle />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
  circle,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  circle?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {circle ? (
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <svg width="16" height="6">
          <line
            x1="0"
            y1="3"
            x2="16"
            y2="3"
            stroke={color}
            strokeWidth={2}
            strokeDasharray={dashed ? "3 2" : undefined}
          />
        </svg>
      )}
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#6b6b6b]">
        {label}
      </span>
    </div>
  );
}
