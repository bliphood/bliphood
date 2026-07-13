"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { fetchSolveHistory, fetchStats } from "@/lib/api";
import { useCountUp } from "@/hooks/useSSE";
import type { SolveEvent } from "@/lib/types";

function ConnectedDashboard({ address, solves, isLoading, minerStats }: {
  address: string;
  solves?: SolveEvent[];
  isLoading: boolean;
  minerStats?: { totalSolved: number; totalBlipEarned: number; currentStreak: number; bestStreak: number; lastSolveTime: number } | null;
}) {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const totalEarned = minerStats?.totalBlipEarned || solves?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const earnedAnimated = useCountUp(totalEarned);
  const jackpots = solves?.filter((s) => s.isJackpot) || [];
  const totalSolved = minerStats?.totalSolved || solves?.length || 0;
  const fastestSolve = solves?.length ? Math.min(...solves.map((s) => s.solveTimeMs)) : 0;
  const currentStreak = minerStats?.currentStreak || 0;
  const bestStreak = minerStats?.bestStreak || 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
        <div className="md:col-span-3 border border-white/5 bg-dark-100 rounded-sm p-6 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">WALLET ADDRESS</span>
            <p className="font-mono text-sm text-white/80 mt-2">{address}</p>
          </div>
          <div className="mt-6 flex items-baseline gap-4">
            <span className="font-display text-6xl text-accent leading-none">{earnedAnimated.toLocaleString()}</span>
            <span className="font-mono text-sm text-white/30">BLIPHD EARNED</span>
          </div>
        </div>
        <div className="border border-white/5 bg-dark-100 rounded-sm p-6">
          <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">TOTAL SOLVES</span>
          <p className="font-display text-4xl text-white mt-3">{totalSolved}</p>
        </div>
        <div className="border border-white/5 bg-dark-100 rounded-sm p-6">
          <span className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">STREAK</span>
          <p className="font-display text-4xl text-warning mt-3">{currentStreak}</p>
          <span className="font-mono text-[10px] text-white/15">BEST: {bestStreak}</span>
        </div>
      </div>

      <div className="border border-white/5 rounded-sm overflow-hidden mb-12">
        <div className="bg-dark-200 px-6 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="font-mono text-xs text-white/30 uppercase tracking-wider">SOLVE HISTORY</span>
          <span className="font-mono text-[10px] text-white/15">{solves?.length || 0} RECORDS</span>
        </div>
        <div className="grid grid-cols-[140px_80px_100px_1fr_100px] gap-4 px-6 py-2 bg-dark-100 border-b border-white/5">
          {["TIMESTAMP", "DIFFICULTY", "REWARD", "TX HASH", "SOLVE TIME"].map((h) => (
            <span key={h} className="font-mono text-[10px] text-white/15 tracking-wider uppercase">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="px-6 py-10 text-center"><span className="font-mono text-xs text-white/20">LOADING...</span></div>
          ) : solves?.length === 0 ? (
            <div className="px-6 py-10 text-center"><span className="font-mono text-xs text-white/20">NO SOLVES YET</span></div>
          ) : (
            solves?.slice(0, 50).map((s: SolveEvent, i: number) => (
              <div key={i} className="grid grid-cols-[140px_80px_100px_1fr_100px] gap-4 px-6 py-3 hover:bg-white/[0.01] transition-colors items-center">
                <span className="font-mono text-xs text-white/30">{new Date(s.timestamp * 1000).toLocaleString()}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.difficulty >= 6 ? "bg-warning" : "bg-accent"}`} />
                  <span className="font-mono text-xs text-white">{s.difficulty}</span>
                </div>
                <span className={`font-mono text-xs ${s.isJackpot ? "text-accent font-bold" : "text-white/70"}`}>{s.isJackpot ? "🔥 " : ""}{s.amount.toLocaleString()}</span>
                <a href={`https://explorer.testnet.chain.robinhood.com/tx/${s.txHash}`} target="_blank" rel="noopener" className="font-mono text-xs text-white/20 hover:text-accent transition-colors truncate">{s.txHash.slice(0, 10)}...</a>
                <span className="font-mono text-xs text-white/40">{(s.solveTimeMs / 1000).toFixed(2)}s</span>
              </div>
            ))
          )}
        </div>
      </div>

      {jackpots.length > 0 && (
        <div className="border border-accent/20 bg-accent/2 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-xs text-accent tracking-[0.2em] uppercase">JACKPOT WINS</span>
            <span className="font-mono text-xs text-accent/50">{jackpots.length}</span>
          </div>
          <div className="space-y-3">
            {jackpots.map((j: SolveEvent, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="font-mono text-xs text-white/30">{new Date(j.timestamp * 1000).toLocaleDateString()}</span>
                <span className="font-display text-lg text-accent">{j.amount.toLocaleString()} BLIPHD</span>
                <span className="font-mono text-xs text-white/20">3x REWARD</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function WalletDashboard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: walletData, isLoading, error } = useQuery({
    queryKey: ["solves", address],
    queryFn: async () => fetchSolveHistory(address!),
    enabled: !!address && mounted,
    refetchInterval: 30000,
  });

  const connected = mounted && isConnected && address;
  const solves = walletData?.solves;
  const minerStats = walletData?.minerStats;

  return (
    <section className="py-20 px-6 max-w-[1440px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs text-accent tracking-[0.3em] uppercase">04</span>
        <span className="w-px h-4 bg-white/10" />
        <span className="font-mono text-xs text-white/20 tracking-[0.2em] uppercase">Wallet</span>
      </div>
      <h2 className="font-display text-5xl md:text-7xl text-white leading-none mb-6">YOUR WALLET</h2>

      {connected ? (
        <ConnectedDashboard address={address} solves={solves} isLoading={isLoading} minerStats={minerStats} />
      ) : (
        <div className="border border-white/5 bg-dark-100 rounded-sm p-12 text-center max-w-lg">
          <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <p className="font-mono text-xs text-white/20 uppercase tracking-wider mb-4">Wallet Not Connected</p>
          <p className="text-sm text-white/30 mb-6">
            Connect your wallet to view personal mining stats, solve history, and jackpot wins.
          </p>
          <button
            onClick={() => {
              const c = connectors[0];
              if (c) connect({ connector: c });
            }}
            className="font-mono text-sm font-bold uppercase tracking-wider bg-accent text-black px-6 py-3 rounded-sm hover:bg-accent-dim transition-colors"
          >
            CONNECT WALLET
          </button>
        </div>
      )}
    </section>
  );
}
