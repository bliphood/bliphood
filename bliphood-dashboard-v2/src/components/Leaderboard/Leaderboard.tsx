"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FilterPeriod } from "@/lib/constants";
import type { MinerEntry } from "@/lib/types";
import { fetchLeaderboard } from "@/lib/api";

const PERIODS: { value: FilterPeriod; label: string }[] = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "all", label: "ALL TIME" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="font-mono text-lg text-accent font-bold">#1</span>;
  if (rank === 2) return <span className="font-mono text-lg text-white/60 font-bold">#2</span>;
  if (rank === 3) return <span className="font-mono text-lg text-white/30 font-bold">#3</span>;
  return <span className="font-mono text-sm text-white/15">#{rank}</span>;
}

export function Leaderboard() {
  const [period, setPeriod] = useState<FilterPeriod>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchLeaderboard(period),
    refetchInterval: 15000,
  });

  return (
    <section className="py-20 px-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-accent tracking-[0.3em] uppercase">02</span>
            <span className="w-px h-4 bg-white/10" />
            <span className="font-mono text-xs text-white/20 tracking-[0.2em] uppercase">Rankings</span>
          </div>
          <h2 className="font-display text-5xl md:text-7xl text-white leading-none">
            LEADERBOARD
          </h2>
          <p className="font-mono text-sm text-white/30 mt-3">
            Top miners ranked by total solves, streak count, and speed.
          </p>
        </div>

        <div className="flex gap-1 bg-dark-300 rounded-sm p-1 self-start">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 text-xs font-mono font-semibold transition-all rounded-sm ${
                period === p.value ? "bg-accent text-black" : "text-white/30 hover:text-white/60"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-dark-200 animate-pulse rounded-sm" />
          ))}
        </div>
      ) : (
        <div className="border border-white/5 rounded-sm overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_120px_120px_120px_140px] gap-4 px-6 py-3 bg-dark-200 border-b border-white/5">
            {["RANK", "WALLET", "SOLVES", "EARNED", "STREAK", "FASTEST"].map((h) => (
              <span key={h} className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-white/5">
            {data?.entries.map((entry: MinerEntry) => (
              <div
                key={entry.wallet}
                className={`grid grid-cols-[60px_1fr_120px_120px_120px_140px] gap-4 px-6 py-4 hover:bg-white/[0.01] transition-colors items-center ${
                  entry.rank <= 3 ? "bg-accent/2" : ""
                }`}
              >
                <RankBadge rank={entry.rank} />
                <span className="font-mono text-sm text-white/80">{entry.wallet}</span>
                <span className="font-mono text-sm text-white">{entry.totalSolved.toLocaleString()}</span>
                <span className="font-mono text-sm text-white">{entry.totalEarned.toLocaleString()}</span>
                <span className="font-mono text-sm text-warning">{entry.bestStreak}</span>
                <span className="font-mono text-sm text-white/50">{(entry.fastestSolveMs / 1000).toFixed(2)}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.entries.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <p className="font-mono text-sm text-white/20">NO DATA FOR THIS PERIOD</p>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="font-mono text-xs text-white/15">{data.totalMiners} total miners indexed</span>
          <span className="font-mono text-xs text-white/15">Updates every 15s</span>
        </div>
      )}
    </section>
  );
}
