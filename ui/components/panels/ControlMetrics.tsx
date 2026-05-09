"use client";
import { useTopicVal, useTopicsStore } from "@/lib/store/topics";

type MetricCardProps = {
  label: string;
  value: number | undefined;
  unit?: string;
  precision?: number;
  warning?: boolean;
  danger?: boolean;
};

function MetricCard({ label, value, unit = "", precision = 2, warning, danger }: MetricCardProps) {
  const display = value !== undefined && value !== null ? value.toFixed(precision) : "—";
  const valueColor = danger ? "text-[#e22718]" : warning ? "text-[#f59e0b]" : "text-white";
  const accentBar  = danger ? "border-l-2 border-l-[#e22718]"
                   : warning ? "border-l-2 border-l-[#f59e0b]"
                   : "border-l-2 border-l-transparent";

  return (
    <div className={`bg-[#1a2129] border border-white/10 p-2.5 flex flex-col gap-1.5 ${accentBar}`}>
      <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#bbbbbb] leading-none">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold tabular-nums leading-none ${valueColor}`}>
          {display}
        </span>
        {value !== undefined && unit && (
          <span className="text-sm text-[#6b6b6b] font-normal">{unit}</span>
        )}
      </div>
    </div>
  );
}

export default function ControlMetrics() {
  const cte         = useTopicVal("/cross_track_error");
  const steer       = useTopicVal("/steer_deg");
  const targetVel   = useTopicVal("/target_vel");
  const currentVel  = useTopicVal("/current_vel_print");
  const curvature   = useTopicVal("/curvature");
  const headingError = useTopicVal("/heading_error");
  const rmse        = useTopicVal("/rmse");
  const penalty     = useTopicVal("/penalty");

  const hasData = !!useTopicsStore((s) => s.latest["/cross_track_error"]);

  return (
    <div className="bg-[#262e38] border border-white/10 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span className="w-0.5 h-4 bg-[#1c69d4] shrink-0" />
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-white">
          Control Metrics
        </span>
      </div>
      {!hasData ? (
        <div className="flex flex-col items-center justify-center p-8 gap-3">
          <div className="w-5 h-5 border-2 border-[#1c69d4]/30 border-t-[#1c69d4] rounded-full animate-spin" />
          <span className="text-sm text-[#6b6b6b]">데이터 수신 대기 중...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-white/5">
          <MetricCard label="CTE"         value={cte}          precision={3}
            warning={Math.abs(cte ?? 0) > 0.3} danger={Math.abs(cte ?? 0) > 0.6} />
          <MetricCard label="Steer"        value={steer}        unit="°"    precision={1} />
          <MetricCard label="Target Vel"   value={targetVel}    precision={1} />
          <MetricCard label="Current Vel"  value={currentVel}   precision={1} />
          <MetricCard label="Curvature"    value={curvature}    precision={4} />
          <MetricCard label="Heading Err"  value={headingError} precision={2}
            warning={Math.abs(headingError ?? 0) > 5} />
          <MetricCard label="RMSE"         value={rmse}         precision={3}
            warning={(rmse ?? 0) > 0.2} danger={(rmse ?? 0) > 0.5} />
          <MetricCard label="Penalty"      value={penalty}      precision={2}
            warning={(penalty ?? 0) > 0} danger={(penalty ?? 0) > 1} />
        </div>
      )}
    </div>
  );
}
