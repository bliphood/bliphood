import { NextResponse } from "next/server";
import { getAgentStore, countActiveAgents } from "@/lib/store";

export async function GET() {
  const agents = getAgentStore();
  const now = Date.now();
  const list: Array<{
    wallet: string;
    totalSolves: number;
    lastSeen: number;
    online: boolean;
    solveTimeMs: number;
    lastNonce: number;
  }> = [];

  for (const [addr, v] of agents) {
    list.push({
      wallet: addr.slice(0, 6) + "..." + addr.slice(-4),
      totalSolves: v.totalSolves || 0,
      lastSeen: v.lastSeen,
      online: (now - v.lastSeen) < 30000,
      solveTimeMs: v.solveTimeMs || 0,
      lastNonce: v.lastNonce || 0,
    });
  }

  return NextResponse.json({ agents: list, activeCount: countActiveAgents() });
}
