"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTimeSeriesStore, type Point } from "@/lib/store/timeseries";

const TOPICS = [
  { key: "/cross_track_error",  label: "CTE",      color: "#1c69d4" },
  { key: "/steer_deg",          label: "Steer",     unit: "°", color: "#22c55e" },
  { key: "/target_vel",         label: "Target V",  color: "#f59e0b" },
  { key: "/current_vel_print",  label: "Current V", color: "#bbbbbb" },
];

export default function TimeSeriesChart() {
  const [active, setActive] = useState("/cross_track_error");
  const series = useTimeSeriesStore((s) => s.series);

  const data: Point[] = series[active] ?? [];
  const topicMeta = TOPICS.find((t) => t.key === active)!;
  const formatted = data.map((p) => ({ t: p.t, v: p.v }));

  return (
    <div className="bg-[#262e38] border border-white/10 h-full flex flex-col overflow-hidden">
      {/* Topic tabs with live current value */}
      <div className="flex items-stretch border-b border-white/10 shrink-0 overflow-x-auto">
        {TOPICS.map((t) => {
          const pts = series[t.key];
          const last = pts && pts.length > 0 ? pts[pts.length - 1].v : undefined;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex flex-col items-start justify-center px-4 py-2 whitespace-nowrap transition-colors border-b-2 ${
                isActive ? "border-current" : "border-transparent text-[#6b6b6b] hover:text-[#bbbbbb]"
              }`}
              style={isActive ? { color: t.color, borderColor: t.color } : {}}
            >
              <span className="text-[11px] font-bold uppercase tracking-[1.5px] leading-none">
                {t.label}
              </span>
              <span
                className="text-xs tabular-nums leading-tight mt-1 font-mono"
                style={{ color: isActive ? t.color : "#6b6b6b", opacity: last !== undefined ? 1 : 0.4 }}
              >
                {last !== undefined
                  ? t.unit ? `${last.toFixed(2)} ${t.unit}` : last.toFixed(2)
                  : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart — absolute wrapper prevents recharts width/height=-1 in flex containers */}
      <div className="flex-1 min-h-0 relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#1c69d4]/30 border-t-[#1c69d4] rounded-full animate-spin" />
            <span className="text-sm text-[#6b6b6b]">데이터 없음</span>
          </div>
        ) : (
          <div className="absolute inset-0 px-1 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="t" hide />
              <YAxis
                tick={{ fill: "#6b6b6b", fontSize: 11, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  background: "#1a2129",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 0,
                  fontSize: 12,
                  color: "#ffffff",
                  fontFamily: "monospace",
                }}
                formatter={(val) => [
                  typeof val === "number"
                    ? topicMeta.unit ? `${val.toFixed(3)} ${topicMeta.unit}` : val.toFixed(3)
                    : val,
                  topicMeta.label,
                ]}
                labelFormatter={() => ""}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke={topicMeta.color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
