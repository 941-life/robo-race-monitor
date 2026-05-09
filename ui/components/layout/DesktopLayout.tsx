"use client";
import CameraPanel from "@/components/panels/CameraPanel";
import ControlMetrics from "@/components/panels/ControlMetrics";
import FlagGrid from "@/components/panels/FlagGrid";
import ObstaclePanel from "@/components/panels/ObstaclePanel";
import PathMap from "@/components/panels/PathMap";
import PathStatus from "@/components/panels/PathStatus";
import TimeSeriesChart from "@/components/panels/TimeSeriesChart";
import SessionControl from "@/components/session/SessionControl";

export default function DesktopLayout() {
  return (
    <div className="h-full grid grid-cols-[2fr_3fr_2fr] gap-2 p-2">

      {/* LEFT: Flags → Obstacles → TimeSeriesChart (fills remaining) */}
      <div className="flex flex-col gap-2 min-h-0">
        <FlagGrid />
        <ObstaclePanel />
        <div className="flex-1 min-h-0">
          <TimeSeriesChart />
        </div>
      </div>

      {/* CENTER: Camera (top half) + PathMap (bottom half) — equal height */}
      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          <CameraPanel />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <PathMap />
        </div>
      </div>

      {/* RIGHT: ControlMetrics + PathStatus (스크롤) / Session (하단 고정) */}
      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-2">
          <ControlMetrics />
          <PathStatus />
        </div>
        <SessionControl />
      </div>

    </div>
  );
}
