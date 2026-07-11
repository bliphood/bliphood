import { NextRequest, NextResponse } from "next/server";
import { getCachedLeaderboard } from "@/lib/contract";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");

  const entries = await getCachedLeaderboard();
  const sliced = entries.slice(0, limit);
  const ranked = sliced.map((e, i) => ({
    rank: i + 1,
    wallet: e.wallet,
    totalSolved: e.totalSolved,
    totalEarned: e.totalEarned,
    bestStreak: e.bestStreak,
    fastestSolveMs: e.fastestSolveMs,
    lastSolveTime: e.lastSolveTime,
  }));

  return NextResponse.json({
    entries: ranked,
    totalMiners: entries.length,
  });
}
