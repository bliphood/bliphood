"use client";

import { useSSE } from "@/hooks/useSSE";
import type { SolveEvent } from "@/lib/types";

export function MarqueeTicker() {
  const { data: solves, connected } = useSSE<SolveEvent>();

  if (solves.length === 0) {
    return <div className="fixed top-16 left-0 right-0 z-40 bg-dark-200 border-b border-white/5 h-7 flex items-center px-6">
      <span className="font-mono text-[10px] text-white/15">WAITING FOR ACTIVITY...</span>
    </div>;
  }

  const latest = solves.slice(0, 12);
  const doubled = latest.length < 2 ? [...latest, ...latest] : [...latest, ...latest];

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-dark-200 border-b border-white/5 h-7 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={`${item.txHash || i}-${i}`} className="flex items-center gap-4 px-6 text-[11px] font-mono text-white/30">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-accent animate-pulse-live" : "bg-white/10"}`} />
            <span className="text-accent font-semibold">SOLVE</span>
            <span className="text-white/50">{item.wallet}</span>
            <span className="text-white/20">NONCE</span>
            <span className="text-white/40">{item.nonce.toLocaleString()}</span>
            <span className="text-white/20">TIME</span>
            <span className="text-white/40">{(item.solveTimeMs / 1000).toFixed(1)}s</span>
            <span className="text-white/10">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}
