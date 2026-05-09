"use client";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useTopic } from "@/lib/store/topics";
import { LocateFixed, Maximize2, ZoomIn, ZoomOut } from "lucide-react";

type Pose2D = { x: number; y: number };
type PathMsg = { poses: Pose2D[]; n: number };
type OdomMsg = { x: number; y: number; yaw: number };
type ViewState = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  viewBox: string;
  flipY: number;
  gridX: number[];
  gridY: number[];
};

const PATH_COLORS = {
  p1: "#0066b1",
  p2: "#f4b400",
  selected: "#0fa336",
  local: "#bbbbbb",
  vehicle: "#e22718",
};

const FOLLOW_WIDTH = 82;
const FOLLOW_HEIGHT = 34;

function isPose(p: Pose2D | undefined): p is Pose2D {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

function cleanPoses(poses: Pose2D[] | undefined): Pose2D[] {
  return (poses ?? []).filter(isPose);
}

function polyline(poses: Pose2D[], flipY: number): string {
  return poses.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${flipY - p.y}`).join(" ");
}

function ticks(min: number, max: number, step: number): number[] {
  const start = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let v = start; v <= max; v += step) values.push(v);
  return values;
}

function getBounds(points: Pose2D[]): ViewState {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const width = Math.max(Math.max(...xs) - Math.min(...xs) + 16, FOLLOW_WIDTH);
  const height = Math.max(Math.max(...ys) - Math.min(...ys) + 16, FOLLOW_HEIGHT);
  return makeView(cx, cy, width, height);
}

function makeView(cx: number, cy: number, width: number, height: number): ViewState {
  const minX = cx - width / 2;
  const maxX = cx + width / 2;
  const minY = cy - height / 2;
  const maxY = cy + height / 2;
  return {
    minX,
    minY,
    maxX,
    maxY,
    viewBox: `${minX} ${minY} ${width} ${height}`,
    flipY: minY + maxY,
    gridX: ticks(minX, maxX, 10),
    gridY: ticks(minY, maxY, 10),
  };
}

function pathLabelPosition(poses: Pose2D[], flipY: number): Pose2D | undefined {
  const p = poses[Math.min(8, poses.length - 1)];
  if (!p) return undefined;
  return { x: p.x, y: flipY - p.y };
}

export default function PathMap() {
  const gp1 = useTopic<PathMsg>("/global_path1");
  const gp2 = useTopic<PathMsg>("/global_path2");
  const lp1 = useTopic<PathMsg>("/local_path1");
  const lp2 = useTopic<PathMsg>("/local_path2");
  const sel = useTopic<PathMsg>("/selected_path");
  const odom = useTopic<OdomMsg>("/gps_utm_odom");
  const currentPath = useTopic<{ data: number }>("/monitoring/gpp/current_path")?.data;
  const selectedPath = useTopic<{ data: number }>("/monitoring/gpp/selected_path")?.data;

  const [zoom, setZoom] = useState(1);
  const [followVehicle, setFollowVehicle] = useState(true);

  const gp1Poses = cleanPoses(gp1?.poses);
  const gp2Poses = cleanPoses(gp2?.poses);
  const lp1Poses = cleanPoses(lp1?.poses);
  const lp2Poses = cleanPoses(lp2?.poses);
  const selectedPoses = cleanPoses(sel?.poses);
  const vehicle = isPose(odom) ? odom : undefined;

  const view = useMemo(() => {
    const width = FOLLOW_WIDTH / zoom;
    const height = FOLLOW_HEIGHT / zoom;
    if (followVehicle && vehicle) return makeView(vehicle.x + width * 0.12, vehicle.y, width, height);

    const all = [...gp1Poses, ...gp2Poses, ...lp1Poses, ...lp2Poses, ...selectedPoses];
    if (vehicle) all.push(vehicle);
    return all.length > 0 ? getBounds(all) : makeView(0, 0, 100, 60);
  }, [followVehicle, gp1Poses, gp2Poses, lp1Poses, lp2Poses, selectedPoses, vehicle, zoom]);

  const hasData = gp1Poses.length > 0 || gp2Poses.length > 0;
  const p1Label = pathLabelPosition(gp1Poses, view.flipY);
  const p2Label = pathLabelPosition(gp2Poses, view.flipY);

  return (
    <div className="bg-[#262e38] border border-white/10 h-full min-h-[260px] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/10 shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            Path Map
          </span>
          <div className="flex items-center gap-1">
            <PathBadge label="Cur" value={currentPath} />
            <PathBadge label="Sel" value={selectedPath} active={currentPath === selectedPath} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton label="Follow vehicle" active={followVehicle} onClick={() => setFollowVehicle((v) => !v)}>
            <LocateFixed size={14} />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.7, z - 0.25))}>
            <ZoomOut size={14} />
          </IconButton>
          <IconButton label="Reset zoom" onClick={() => setZoom(1)}>
            <Maximize2 size={13} />
          </IconButton>
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2.25, z + 0.25))}>
            <ZoomIn size={14} />
          </IconButton>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden bg-[#0d0d0d]">
        {!hasData ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-[#6b6b6b] uppercase tracking-widest">
              Waiting for path data
            </span>
          </div>
        ) : (
          <svg viewBox={view.viewBox} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
            <rect x={view.minX} y={view.minY} width={view.maxX - view.minX} height={view.maxY - view.minY} fill="#0d0d0d" />

            <g opacity={0.22}>
              {view.gridX.map((x) => (
                <line key={`x-${x}`} x1={x} x2={x} y1={view.minY} y2={view.maxY} stroke="#ffffff" strokeWidth={0.08} />
              ))}
              {view.gridY.map((y) => (
                <line key={`y-${y}`} x1={view.minX} x2={view.maxX} y1={y} y2={y} stroke="#ffffff" strokeWidth={0.08} />
              ))}
            </g>

            <PathLine poses={gp1Poses} flipY={view.flipY} color={PATH_COLORS.p1} width={0.9} />
            <PathLine poses={gp2Poses} flipY={view.flipY} color={PATH_COLORS.p2} width={0.9} />
            <PathLine poses={lp1Poses} flipY={view.flipY} color={PATH_COLORS.local} width={0.38} dash="1.2 1.2" opacity={0.7} />
            <PathLine poses={lp2Poses} flipY={view.flipY} color={PATH_COLORS.local} width={0.38} dash="1.2 1.2" opacity={0.7} />
            <PathLine poses={selectedPoses} flipY={view.flipY} color={PATH_COLORS.selected} width={1.4} glow />

            {p1Label && <PathText x={p1Label.x} y={p1Label.y} color={PATH_COLORS.p1} label="P1" />}
            {p2Label && <PathText x={p2Label.x} y={p2Label.y} color={PATH_COLORS.p2} label="P2" />}

            {vehicle && (
              <g transform={`translate(${vehicle.x}, ${view.flipY - vehicle.y}) rotate(${(-vehicle.yaw * 180) / Math.PI})`}>
                <circle r={1.7} fill="#0d0d0d" stroke="rgba(255,255,255,0.35)" strokeWidth={0.25} />
                <polygon
                  points="2.2,0 -1.15,-1.15 -0.55,0 -1.15,1.15"
                  fill={PATH_COLORS.vehicle}
                  stroke="#ffffff"
                  strokeWidth={0.18}
                />
              </g>
            )}
          </svg>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 border-t border-white/10 shrink-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <LegendItem color={PATH_COLORS.p1} label="P1" />
          <LegendItem color={PATH_COLORS.p2} label="P2" />
          <LegendItem color={PATH_COLORS.local} label="Local" dashed />
          <LegendItem color={PATH_COLORS.selected} label="Selected" />
          <LegendItem color={PATH_COLORS.vehicle} label="Vehicle" marker />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#6b6b6b]">
          {followVehicle ? "Follow" : "Full"} {zoom.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}

function PathLine({
  poses,
  flipY,
  color,
  width,
  dash,
  opacity = 1,
  glow,
}: {
  poses: Pose2D[];
  flipY: number;
  color: string;
  width: number;
  dash?: string;
  opacity?: number;
  glow?: boolean;
}) {
  if (poses.length === 0) return null;
  const d = polyline(poses, flipY);
  return (
    <g opacity={opacity}>
      {glow && <path d={d} stroke={color} strokeWidth={width + 1.4} opacity={0.18} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={d} stroke={color} strokeWidth={width} strokeDasharray={dash} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function PathText({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-2.8} y={-1.8} width={5.6} height={3.6} fill="#0d0d0d" stroke={color} strokeWidth={0.18} />
      <text x={0} y={0.75} textAnchor="middle" fill={color} fontSize={2.1} fontWeight={700} fontFamily="Inter, sans-serif">
        {label}
      </text>
    </g>
  );
}

function PathBadge({ label, value, active }: { label: string; value: number | undefined; active?: boolean }) {
  const color = value === 2 ? PATH_COLORS.p2 : value === 1 ? PATH_COLORS.p1 : "#bbbbbb";
  return (
    <span
      className="border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
      style={{
        borderColor: active ? PATH_COLORS.selected : `${color}66`,
        color: active ? PATH_COLORS.selected : color,
      }}
    >
      {label} {value !== undefined ? `P${value}` : "??"}
    </span>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#7e7e7e] transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c69d4]"
      style={active ? { color: PATH_COLORS.selected, borderColor: `${PATH_COLORS.selected}80` } : undefined}
    >
      {children}
    </button>
  );
}

function LegendItem({
  color,
  label,
  dashed,
  marker,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  marker?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {marker ? (
        <span className="h-2.5 w-2.5 rotate-45" style={{ backgroundColor: color }} />
      ) : (
        <svg width="18" height="7" aria-hidden="true">
          <line
            x1="1"
            y1="3.5"
            x2="17"
            y2="3.5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={dashed ? "3 2" : undefined}
          />
        </svg>
      )}
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#bbbbbb]">
        {label}
      </span>
    </div>
  );
}
