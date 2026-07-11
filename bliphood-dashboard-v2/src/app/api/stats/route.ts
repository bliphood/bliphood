import { NextRequest, NextResponse } from "next/server";
import { getContract, formatEther, getPuzzleInfo, MINEABLE_MAX, EXPLORER, fetchWalletMintedEvents } from "@/lib/contract";
import { getActivityLog, countActiveAgents, getAgentStore } from "@/lib/store";
import { getCachedLeaderboard } from "@/lib/contract";

let chainCache: { totalMinted: number; remainingSupply: number; progressPct: string; maxSupply: number; activeSolvers: number } | null = null;
let chainCacheAt = 0;
const CACHE_MS = 5000;

async function fetchChainStats() {
  const now = Date.now();
  if (chainCache && now - chainCacheAt < CACHE_MS) {
    return { ...chainCache, activeSolvers: countActiveAgents() };
  }
  try {
    const c = getContract();
    const [supplyBn, remainBn, lpBn, devBn] = await Promise.all([
      c.totalSupply(),
      c.remainingSupply(),
      c.lpMinted(),
      c.devMinted(),
    ]);
    const lpMinted = Math.floor(formatEther(lpBn));
    const devMinted = Math.floor(formatEther(devBn));
    const totalMinted = Math.floor(formatEther(supplyBn)) - lpMinted - devMinted;
    chainCache = {
      totalMinted,
      remainingSupply: Math.floor(formatEther(remainBn)),
      progressPct: totalMinted > 0 ? ((totalMinted / MINEABLE_MAX) * 100).toFixed(2) : "0.00",
      maxSupply: MINEABLE_MAX,
      activeSolvers: countActiveAgents(),
    };
    chainCacheAt = now;
  } catch { /* */ }
  return chainCache || { totalMinted: 0, remainingSupply: MINEABLE_MAX, progressPct: "0.00", maxSupply: MINEABLE_MAX, activeSolvers: 0 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const puzzleParam = searchParams.get("puzzle");
  const notifications = searchParams.get("notifications");
  const dailyMints = searchParams.get("dailyMints");
  const wallet = searchParams.get("wallet");

  const stats = await fetchChainStats();

  if (puzzleParam === "true") {
    const pz = await getPuzzleInfo();
    return NextResponse.json({
      ...stats,
      puzzle: pz ? { ...pz, avgSolveTimeMs: 0 } : null,
    });
  }

  if (notifications === "true") {
    const log = getActivityLog();
    const notifs = log.slice(-10).map((a, i) => ({
      id: `notif-${i}`,
      type: "info" as const,
      title: "New Solve",
      message: `${a.wallet} solved with nonce ${a.nonce.toLocaleString()} in ${a.solveMs}ms`,
      timestamp: a.time,
      read: false,
      link: `${EXPLORER}/tx/${a.txHash}`,
    }));
    return NextResponse.json({ ...stats, notifications: notifs });
  }

  if (dailyMints) {
    const days = parseInt(dailyMints) || 30;
    const puzzle = await getPuzzleInfo();
    const log = getActivityLog();
    const now = Date.now();

    // Build date-keyed map from activity log
    const dayMap = new Map<string, { mints: number; totalMs: number }>();
    for (const a of log) {
      const dateStr = new Date(a.time).toISOString().slice(0, 10);
      const existing = dayMap.get(dateStr) || { mints: 0, totalMs: 0 };
      existing.mints++;
      existing.totalMs += a.solveMs || 0;
      dayMap.set(dateStr, existing);
    }

    // Generate daily array — fill gaps with zeros
    const data = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const dayData = dayMap.get(dateStr);
      return {
        date: dateStr,
        mints: dayData?.mints || 0,
        volume: (dayData?.mints || 0) * (puzzle?.mintAmount || 20000),
        avgSolveMs: dayData ? Math.floor(dayData.totalMs / dayData.mints) : 0,
        difficulty: puzzle?.difficulty || 3,
      };
    });

    return NextResponse.json({ ...stats, dailyMints: data });
  }

  if (wallet) {
    try {
      const { getMinerStats } = await import("@/lib/contract");
      const chainSolves = await fetchWalletMintedEvents(wallet);
      const statsFromChain = await getMinerStats(wallet);

      return NextResponse.json({
        ...stats,
        solves: chainSolves.map((s) => ({
          wallet: wallet.slice(0, 6) + "..." + wallet.slice(-4),
          amount: s.amount,
          nonce: s.nonce,
          timestamp: s.timestamp,
          txHash: s.txHash,
          difficulty: s.difficulty,
          solveTimeMs: 0,
          isJackpot: false,
        })),
        minerStats: statsFromChain ? {
          totalSolved: statsFromChain.totalSolved,
          totalBlipEarned: statsFromChain.totalBlipEarned,
          currentStreak: statsFromChain.currentStreak,
          bestStreak: statsFromChain.bestStreak,
          lastSolveTime: statsFromChain.lastSolveTime,
        } : null,
      });
    } catch {
      return NextResponse.json({ ...stats, solves: [], minerStats: null });
    }
  }

  return NextResponse.json(stats);
}
