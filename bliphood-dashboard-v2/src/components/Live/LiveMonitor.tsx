"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { fetchPuzzleInfo } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import type { PuzzleInfo, SolveEvent } from "@/lib/types";

export function LiveMonitor() {
  const [copied, setCopied] = useState(false);

  const { data: puzzle, error } = useQuery({
    queryKey: ["puzzle"],
    queryFn: fetchPuzzleInfo,
    refetchInterval: 10000,
  });

  const { data: liveSolves, connected } = useSSE<SolveEvent>();

  const copySeed = useCallback(async () => {
    if (!puzzle?.seed) return;
    await navigator.clipboard.writeText(puzzle.seed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [puzzle?.seed]);

  const difficultyPercent = puzzle ? ((puzzle.difficulty - 3) / (8 - 3)) * 100 : 0;

  return (
    <section className="py-20 px-6 max-w-[1440px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs text-accent tracking-[0.3em] uppercase">05</span>
        <span className="w-px h-4 bg-white/10" />
        <span className="font-mono text-xs text-white/20 tracking-[0.2em] uppercase">Live</span>
      </div>
      <h2 className="font-display text-5xl md:text-7xl text-white leading-none mb-6">
        LIVE MONITOR
      </h2>
      <p className="font-mono text-sm text-white/30 mb-12">
        Real-time puzzle state and solve feed. Streaming via SSE — no page reload needed.
      </p>

      {/* Connection indicator */}
      <div className="flex items-center gap-2 mb-8">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-accent animate-pulse-live" : "bg-danger"}`} />
        <span className={`font-mono text-xs tracking-wider uppercase ${connected ? "text-accent" : "text-danger"}`}>
          {connected ? "LIVE" : "DISCONNECTED"}
        </span>
      </div>

      {/* Puzzle Info - Asymmetric grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
        {/* Seed Display - spans 2 */}
        <div className="lg:col-span-2 border border-white/5 bg-dark-100 rounded-sm p-6 flex flex-col justify-between">
          <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">CURRENT SEED</span>
          <div>
            <p className="font-mono text-sm text-white/60 break-all mt-3 mb-4 leading-relaxed">
              {puzzle?.seed || "0x..."}
            </p>
            <button
              onClick={copySeed}
              className="font-mono text-xs text-white/30 hover:text-accent transition-colors uppercase flex items-center gap-2"
            >
              {copied ? "COPIED ✓" : "COPY SEED"}
            </button>
          </div>
        </div>

        {/* Difficulty & Era - spans 3 */}
        <div className="lg:col-span-3 border border-white/5 bg-dark-100 rounded-sm p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            <div>
              <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">DIFFICULTY</span>
              <p className="font-display text-6xl text-white mt-2">{puzzle?.difficulty || "—"}</p>
              <span className="font-mono text-[10px] text-white/15">LEADING ZERO BYTES</span>
              {/* Difficulty bar */}
              <div className="mt-4 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-warning rounded-full transition-all duration-700"
                  style={{ width: `${difficultyPercent}%` }}
                />
              </div>
            </div>
            <div>
              <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">HALVING ERA</span>
              <p className="font-display text-6xl text-white mt-2">{puzzle?.era ?? "—"}</p>
              <span className="font-mono text-xs text-white/30">REWARD: {puzzle?.mintAmount?.toLocaleString() ?? "—"} BLIPHD</span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">AVG SOLVE TIME</span>
              <p className="font-display text-6xl text-white mt-2">
                {puzzle?.avgSolveTimeMs ? `${(puzzle.avgSolveTimeMs / 1000).toFixed(1)}s` : "—"}
              </p>
              <span className="font-mono text-xs text-white/30">ROLLING AVG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Solve Feed */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="bg-dark-200 px-6 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="font-mono text-xs text-white/30 uppercase tracking-wider">LIVE SOLVE FEED</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-live" />
            <span className="font-mono text-[10px] text-white/15">POLLING</span>
          </div>
        </div>
        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
          {liveSolves.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="font-mono text-xs text-white/15">WAITING FOR SOLVES...</span>
            </div>
          ) : (
            liveSolves.map((s: any, i) => (
              <div
                key={`${s.txHash || i}-${i}`}
                className="flex items-center gap-6 px-6 py-3 hover:bg-white/[0.01] transition-colors"
              >
                <span className="font-mono text-[10px] text-white/15 w-16 shrink-0">
                  {new Date((s.timestamp || (s.time / 1000)) * 1000).toLocaleTimeString()}
                </span>
                <span className="font-mono text-xs text-white/60 w-28 shrink-0 truncate">
                  {s.wallet}
                </span>
                <span className={`font-mono text-xs font-semibold w-20 shrink-0 ${s.isJackpot ? "text-accent" : "text-white/80"}`}>
                  {s.isJackpot ? "🔥 " : ""}{(s.amount || 0).toLocaleString()}
                </span>
                <span className="font-mono text-[10px] text-white/20 w-16 shrink-0">
                  D{s.difficulty || "—"}
                </span>
                <span className="font-mono text-xs text-white/30 w-20 shrink-0">
                  {((s.solveTimeMs || s.solveMs || 0) / 1000).toFixed(2)}s
                </span>
                {s.txHash ? (
                  <a
                    href={`https://explorer.testnet.chain.robinhood.com/tx/${s.txHash}`}
                    target="_blank"
                    rel="noopener"
                    className="font-mono text-[10px] text-white/10 hover:text-accent transition-colors truncate"
                  >
                    TX
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
