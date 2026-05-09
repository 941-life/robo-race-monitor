"use client";
import { useTopic } from "@/lib/store/topics";

type Point = { x: number | null; y: number | null; z?: number | null };

const ROLE_COLORS: Record<string, string> = {
  LEAD:  "bg-[#e22718]/20 text-[#e22718] border border-[#e22718]/50",
  front: "bg-[#e22718]/20 text-[#e22718] border border-[#e22718]/50",
  side:  "bg-[#f4b400]/20 text-[#f4b400] border border-[#f4b400]/50",
};

function RoleChip({ role }: { role: string | null }) {
  if (!role) return <span className="text-sm text-white/20">—</span>;
  const cls = ROLE_COLORS[role] ?? "bg-white/5 text-[#bbbbbb] border border-white/15";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 ${cls}`}>
      {role}
    </span>
  );
}

function PosDisplay({ pos }: { pos: Point | undefined }) {
  if (!pos || (pos.x === null && pos.y === null)) {
    return <span className="text-sm text-white/20">—</span>;
  }
  return (
    <span className="text-sm tabular-nums text-[#bbbbbb] font-mono">
      ({pos.x?.toFixed(1) ?? "—"}, {pos.y?.toFixed(1) ?? "—"})
    </span>
  );
}

function ObsRow({
  label,
  role,
  pos,
  showRole = true,
}: {
  label: string;
  role?: string | null;
  pos: Point | undefined;
  showRole?: boolean;
}) {
  const hasAnyData = (role && role !== "none") || (pos && pos.x !== null);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 transition-colors ${
        hasAnyData ? "bg-white/[0.02]" : ""
      }`}
    >
      {/* Label — whitespace-nowrap prevents "OBS" + "2" wrapping */}
      <span className="text-xs font-bold uppercase tracking-widest text-[#bbbbbb] whitespace-nowrap shrink-0 w-12">
        {label}
      </span>

      {showRole && (
        <div className="shrink-0 w-16">
          <RoleChip role={role && role !== "none" ? role : null} />
        </div>
      )}

      <div className="ml-auto">
        <PosDisplay pos={pos} />
      </div>
    </div>
  );
}

export default function ObstaclePanel() {
  const role1Raw = useTopic<{ data: string }>("/monitoring/gpp/obstacle_one_role")?.data;
  const role2Raw = useTopic<{ data: string }>("/monitoring/gpp/obstacle_two_role")?.data;
  const pos1    = useTopic<Point>("/monitoring/gpp/obstacle_one_position");
  const pos2    = useTopic<Point>("/monitoring/gpp/obstacle_two_position");
  const repPos  = useTopic<Point>("/monitoring/gpp/representative_obstacle_position");

  // "none" → null (inactive)
  const role1 = role1Raw && role1Raw !== "none" ? role1Raw : null;
  const role2 = role2Raw && role2Raw !== "none" ? role2Raw : null;

  return (
    <div className="bg-[#262e38] border border-white/10 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
        <span className="w-0.5 h-4 bg-[#f4b400] shrink-0" />
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
          Obstacles
        </span>
        <div className="ml-auto flex items-center gap-4 text-[11px] text-[#6b6b6b] uppercase tracking-widest">
          <span className="w-12 text-right">Role</span>
          <span>Position (m)</span>
        </div>
      </div>

      <div className="flex flex-col">
        <ObsRow label="OBS 1" role={role1} pos={pos1} />
        <ObsRow label="OBS 2" role={role2} pos={pos2} />
        {/* REP: representative obstacle — position only, no role */}
        <ObsRow label="REP"   pos={repPos} showRole={false} />
      </div>
    </div>
  );
}
