import { NextRequest, NextResponse } from "next/server";
import { getAgentStore, getActivityLog, broadcastSSE, countActiveAgents } from "@/lib/store";
import { getPuzzleInfo, formatEther } from "@/lib/contract";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallet, totalSolves, lastNonce, solveTimeMs, gasUsed, txHash } = body;
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

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

  const log = getActivityLog();
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
