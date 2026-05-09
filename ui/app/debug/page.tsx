"use client";
import { useEffect, useRef, useState } from "react";
import { useTopicsStore } from "@/lib/store/topics";
import WSProvider from "@/components/WSProvider";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type TopicSnapshot = {
  latest: Record<string, { stamp: number; category: string; data: unknown }>;
  lastStamp: Record<string, number>;
  status: string;
  count: number;
};

// 30Hz 업데이트를 직접 구독하지 않고, 2Hz 스냅샷으로 throttle
function useThrottledTopics(): TopicSnapshot {
  const storeRef = useRef(useTopicsStore.getState());
  const [snap, setSnap] = useState<TopicSnapshot>(() => ({
    latest: storeRef.current.latest,
    lastStamp: storeRef.current.lastStamp,
    status: storeRef.current.status,
    count: Object.keys(storeRef.current.latest).length,
  }));

  useEffect(() => {
    const unsub = useTopicsStore.subscribe((s) => { storeRef.current = s; });
    const id = setInterval(() => {
      const s = storeRef.current;
      setSnap({
        latest: { ...s.latest },
        lastStamp: { ...s.lastStamp },
        status: s.status,
        count: Object.keys(s.latest).length,
      });
    }, 500); // 2Hz
    return () => { unsub(); clearInterval(id); };
  }, []);

  return snap;
}

function TopicRow({
  topic,
  envelope,
  lastSeen,
}: {
  topic: string;
  envelope: { stamp: number; category: string; data: unknown };
  lastSeen: number;
}) {
  const age = ((Date.now() - lastSeen) / 1000).toFixed(1);
  const isStale = Date.now() - lastSeen > 2000;
  return (
    <tr className={`border-b border-white/5 hover:bg-white/5 ${isStale ? "opacity-40" : ""}`}>
      <td className="px-3 py-2 text-xs font-mono text-[#bbbbbb] max-w-[280px] truncate">
        {topic}
      </td>
      <td className="px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1c69d4]">
          {envelope.category}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-[#6b6b6b] tabular-nums font-mono">{age}s</td>
      <td className="px-3 py-2 text-xs font-mono text-[#bbbbbb] max-w-[400px] truncate">
        {JSON.stringify(envelope.data)}
      </td>
    </tr>
  );
}

export default function DebugPage() {
  const { latest, lastStamp, status, count } = useThrottledTopics();
  const topics = Object.keys(latest).sort();

  return (
    <WSProvider>
      <div className="min-h-screen bg-[#1a2129] flex flex-col">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-white/10 bg-[#262e38]">
          <Link href="/" className="p-1.5 text-[#bbbbbb] hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex gap-0.5 mr-1">
            <span className="w-1 h-5 bg-[#0066b1]" />
            <span className="w-1 h-5 bg-[#1c69d4]" />
            <span className="w-1 h-5 bg-[#e22718]" />
          </div>
          <span className="text-sm font-bold uppercase tracking-[1.5px] text-white">
            Debug — Raw Topics
          </span>
          <span
            className={`ml-auto text-xs font-bold uppercase tracking-widest ${
              status === "connected" ? "text-[#22c55e]" :
              status === "connecting" ? "text-[#f59e0b]" : "text-[#e22718]"
            }`}
          >
            {status}
          </span>
          <span className="text-xs text-[#6b6b6b]">{count} topics · 2Hz 갱신</span>
        </div>

        <div className="flex-1 overflow-auto">
          {topics.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-5 h-5 border-2 border-[#1c69d4]/30 border-t-[#1c69d4] rounded-full animate-spin" />
              <span className="text-sm text-[#6b6b6b]">토픽 데이터 대기 중...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[#1d2530]">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-[#6b6b6b]">Topic</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-[#6b6b6b]">Category</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-[#6b6b6b]">Age</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-[#6b6b6b]">Value</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <TopicRow
                    key={t}
                    topic={t}
                    envelope={latest[t] as { stamp: number; category: string; data: unknown }}
                    lastSeen={lastStamp[t] ?? 0}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </WSProvider>
  );
}
