"use client";
import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useTimeSeriesStore, type Point } from "@/lib/store/timeseries";

const TOPICS = [
  { key: "/cross_track_error",  label: "CTE",       color: "#1c69d4" },
  { key: "/steer_deg",          label: "Steer",     color: "#0fa336" },
  { key: "/target_vel",         label: "Target V",  color: "#f4b400" },
  { key: "/current_vel_print",  label: "Current V", color: "#bbbbbb" },
];

function useElementSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

function formatValue(value: number | undefined) {
  if (value === undefined) return "??";
  return value.toFixed(2);
}

export default function TimeSeriesChart() {
  const [active, setActive] = useState("/cross_track_error");
  const series = useTimeSeriesStore((s) => s.series);
  const { ref: chartRef, size } = useElementSize();

  const data: Point[] = series[active] ?? [];
  const topicMeta = TOPICS.find((t) => t.key === active)!;
  const formatted = data.map((p) => ({ t: p.t, v: p.v }));
  const canRenderChart = data.length > 0 && size.width > 0 && size.height > 0;

  return (
    <div className="bg-[#262e38] border border-white/10 h-full min-h-[230px] flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">
            Control Signals
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#6b6b6b]">
            {topicMeta.label}
          </span>
        </div>
        <div className="grid grid-cols-2 2xl:grid-cols-4">
        {TOPICS.map((t) => {
          const pts = series[t.key];
          const last = pts && pts.length > 0 ? pts[pts.length - 1].v : undefined;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              aria-pressed={isActive}
              className={`group relative min-w-0 border-r border-b border-white/5 px-3 py-2 text-left transition-colors last:border-r-0 [&:nth-child(2n)]:border-r-0 2xl:[&:nth-child(2n)]:border-r 2xl:[&:nth-child(4n)]:border-r-0 hover:bg-white/[0.03] ${
                isActive ? "bg-white/[0.045]" : ""
              }`}
              style={isActive ? { boxShadow: `inset 0 2px 0 ${t.color}` } : undefined}
            >
              <span className="mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="truncate text-[10px] font-bold uppercase tracking-[1.4px] text-[#bbbbbb] group-hover:text-white">
                  {t.label}
                </span>
              </span>
              <span className="flex min-w-0 items-baseline gap-1">
                <span
                  className="truncate text-lg font-bold tabular-nums leading-none font-mono"
                  style={{ color: last !== undefined ? t.color : "#6b6b6b" }}
                >
                  {formatValue(last)}
                </span>
              </span>
            </button>
          );
        })}
        </div>
      </div>

      <div ref={chartRef} className="flex-1 min-h-[150px] relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#1c69d4]/30 border-t-[#1c69d4] rounded-full animate-spin" />
            <span className="text-sm text-[#6b6b6b]">Waiting for chart data</span>
          </div>
        ) : canRenderChart ? (
          <div className="absolute inset-0 px-1 pt-1">
            <LineChart
              width={size.width}
              height={size.height}
              data={formatted}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
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
                  typeof val === "number" ? val.toFixed(3) : val,
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
          </div>
        ) : (
          <div className="absolute inset-0" />
        )}
      </div>
    </div>
  );
}
