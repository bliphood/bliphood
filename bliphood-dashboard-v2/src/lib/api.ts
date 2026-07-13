import type { ChainStats, ActivityEntry, AgentEntry, LeaderboardResponse, PuzzleInfo, NotificationItem, DailyMintData, SolveEvent } from "./types";
import type { FilterPeriod } from "./constants";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchStats(): Promise<ChainStats> {
  const res = await fetch(`${BASE}/api/stats`, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return res.json();
}

export async function fetchLeaderboard(period: FilterPeriod = "all"): Promise<LeaderboardResponse> {
  const res = await fetch(`${BASE}/api/leaderboard?period=${period}`, { next: { revalidate: 10 } });
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return res.json();
}

export async function fetchActivity(): Promise<ActivityEntry[]> {
  const res = await fetch(`${BASE}/api/recent`, { next: { revalidate: 3 } });
  if (!res.ok) throw new Error(`recent ${res.status}`);
  const data = await res.json();
  return data.activity || [];
}

export async function fetchAgents(): Promise<{ agents: AgentEntry[]; activeCount: number }> {
  const res = await fetch(`${BASE}/api/agents`, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error(`agents ${res.status}`);
  return res.json();
}

export async function fetchPuzzleInfo(): Promise<PuzzleInfo> {
  const res = await fetch(`${BASE}/api/stats?puzzle=true`, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error(`puzzle ${res.status}`);
  const data = await res.json();
  return data.puzzle || data;
}

export async function reportSolve(body: {
  wallet: string;
  totalSolves: number;
  lastNonce: number;
  solveTimeMs: number;
  gasUsed: number;
  txHash: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${BASE}/api/stats?notifications=true`, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error(`notifications ${res.status}`);
  const data = await res.json();
  return data.notifications || [];
}

export async function fetchDailyMints(days: number = 30): Promise<DailyMintData[]> {
  const res = await fetch(`${BASE}/api/stats?dailyMints=${days}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`dailyMints ${res.status}`);
  const data = await res.json();
  return data.dailyMints || [];
}

export async function fetchSolveHistory(wallet: string): Promise<{ solves: SolveEvent[]; minerStats: { totalSolved: number; totalBlipEarned: number; currentStreak: number; bestStreak: number; lastSolveTime: number } | null }> {
  const res = await fetch(`${BASE}/api/stats?wallet=${wallet}`);
  if (!res.ok) throw new Error(`solveHistory ${res.status}`);
  const data = await res.json();
  return { solves: data.solves || [], minerStats: data.minerStats || null };
}

export function createSSEConnection(): EventSource {
  return new EventSource(`${BASE}/api/sse`);
}
