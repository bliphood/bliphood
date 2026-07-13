import { NextRequest, NextResponse } from "next/server";
import { getAgentStore, getActivityLog, broadcastSSE, countActiveAgents } from "@/lib/store";
import { getPuzzleInfo, invalidatePuzzleCache, invalidateLeaderboardCache, registerMiner } from "@/lib/contract";

const REPORT_SECRET = process.env.REPORT_SECRET || "bliphood-agent-secret";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!REPORT_SECRET || apiKey !== REPORT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { wallet, totalSolves, lastNonce, solveTimeMs, gasUsed, txHash } = body;
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  // Dedup: skip if this txHash is already in the activity log
  const log = getActivityLog();
  if (txHash && log.some((e) => e.txHash === txHash)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  invalidatePuzzleCache();
  invalidateLeaderboardCache();
  registerMiner(wallet);

  const puzzle = await getPuzzleInfo();
  const amount = puzzle?.mintAmount || 20000;
  const difficulty = puzzle?.difficulty || 3;

  const agents = getAgentStore();
  agents.set(wallet, {
    lastSeen: Date.now(),
    totalSolves: totalSolves || 0,
    lastNonce: lastNonce || 0,
    solveTimeMs: solveTimeMs || 0,
  });

  const entry = {
    wallet: wallet.slice(0, 6) + "..." + wallet.slice(-4),
    totalSolves: totalSolves || 0,
    nonce: lastNonce || 0,
    solveMs: solveTimeMs || 0,
    gasUsed: gasUsed || 0,
    txHash: txHash || "",
    time: Date.now(),
  };
  log.push(entry);
  if (log.length > 50) log.shift();

  const solveEvent = JSON.stringify({
    wallet: entry.wallet,
    amount,
    nonce: entry.nonce,
    timestamp: Math.floor(Date.now() / 1000),
    txHash: entry.txHash,
    difficulty,
    solveTimeMs: entry.solveMs,
    isJackpot: false,
  });

  broadcastSSE("solve", solveEvent);

  return NextResponse.json({ ok: true, recorded: log.length, activeAgents: countActiveAgents() });
}
