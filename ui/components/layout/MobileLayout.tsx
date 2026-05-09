"use client";
import { useState } from "react";
import { Camera, Map, LayoutGrid, PlayCircle } from "lucide-react";
import CameraPanel from "@/components/panels/CameraPanel";
import ControlMetrics from "@/components/panels/ControlMetrics";
import FlagGrid from "@/components/panels/FlagGrid";
import ObstaclePanel from "@/components/panels/ObstaclePanel";
import PathMap from "@/components/panels/PathMap";
import PathStatus from "@/components/panels/PathStatus";
import TimeSeriesChart from "@/components/panels/TimeSeriesChart";
import SessionControl from "@/components/session/SessionControl";

const TABS = [
  { id: "live", label: "LIVE", Icon: Camera },
  { id: "map", label: "MAP", Icon: Map },
  { id: "detail", label: "DETAIL", Icon: LayoutGrid },
  { id: "session", label: "SESSION", Icon: PlayCircle },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function MobileLayout() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="h-full flex flex-col">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-2">
        {tab === "live" && (
          <div className="flex flex-col gap-2">
            <CameraPanel />
            <ControlMetrics />
          </div>
        )}
        {tab === "map" && (
          <div className="h-full min-h-[60vh]">
            <PathMap />
          </div>
        )}
        {tab === "detail" && (
          <div className="flex flex-col gap-2">
            <FlagGrid />
            <ObstaclePanel />
            <PathStatus />
            <TimeSeriesChart />
          </div>
        )}
        {tab === "session" && (
          <div className="flex flex-col gap-2">
            <SessionControl />
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="shrink-0 border-t border-white/10 bg-[#1a2129] flex">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              tab === id
                ? "text-[#1c69d4] border-t-2 border-[#1c69d4] -mt-px"
                : "text-[#6b6b6b] hover:text-[#bbbbbb]"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
