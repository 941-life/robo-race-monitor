"use client";
import { useTopicBool } from "@/lib/store/topics";

type FlagColor = "red" | "orange" | "yellow" | "blue" | "teal";

const COLOR_ON: Record<FlagColor, { bg: string; dot: string }> = {
  red:    { bg: "bg-[#e22718]/15 border-[#e22718] text-[#e22718]", dot: "bg-[#e22718]" },
  orange: { bg: "bg-[#f4b400]/15 border-[#f4b400] text-[#f4b400]", dot: "bg-[#f4b400]" },
  yellow: { bg: "bg-[#f4b400]/15 border-[#f4b400] text-[#f4b400]", dot: "bg-[#f4b400]" },
  blue:   { bg: "bg-[#1c69d4]/15 border-[#1c69d4] text-[#1c69d4]", dot: "bg-[#1c69d4]" },
  teal:   { bg: "bg-[#0653b6]/15 border-[#0653b6] text-[#bbbbbb]", dot: "bg-[#0653b6]" },
};

function FlagBadge({
  label,
  active,
  color,
}: {
  label: string;
  active: boolean | undefined;
  color: FlagColor;
}) {
  const isOn = active === true;
  const s = isOn ? COLOR_ON[color] : null;
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-2.5 border transition-colors ${
        isOn ? s!.bg : "bg-[#1a2129] border-white/10 text-[#6b6b6b]"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isOn ? `${s!.dot} animate-pulse` : "bg-white/10"
        }`}
      />
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] leading-none">
        {label}
      </span>
    </div>
  );
}

export default function FlagGrid() {
  const frontObs   = useTopicBool("/monitoring/gpp/front_obstacle");
  const sideObs    = useTopicBool("/monitoring/gpp/side_obstacle");
  const cameraStop = useTopicBool("/monitoring/gpp/camera_stop_active");
  const laneChange = useTopicBool("/monitoring/gpp/lane_change_active");
  const curveTrans = useTopicBool("/monitoring/gpp/curve_transition_active");
  const warnHold   = useTopicBool("/monitoring/gpp/warning_hold_active");

  return (
    <div className="bg-[#262e38] border border-white/10 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span className="w-0.5 h-4 bg-[#e22718] shrink-0" />
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
          Flags
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2">
        <FlagBadge label="CAM STOP"    active={cameraStop} color="orange" />
        <FlagBadge label="FRONT OBS"   active={frontObs}   color="orange" />
        <FlagBadge label="SIDE OBS"    active={sideObs}    color="yellow" />
        <FlagBadge label="LANE CHG"    active={laneChange} color="blue"   />
        <FlagBadge label="CURVE TRANS" active={curveTrans} color="teal"   />
        <FlagBadge label="WARN HOLD"   active={warnHold}   color="yellow" />
      </div>
    </div>
  );
}
