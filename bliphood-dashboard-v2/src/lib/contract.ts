import { ethers } from "ethers";
import ABI from "./abi.json";

const RPC = "https://robinhood-testnet.g.alchemy.com/v2/52gCkKBLBwldBTiLFIPcT";
const CONTRACT = "0x08f8C4aeb91c1881385C6922641A501d68bA9575";
export const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
export const DECIMALS = 18;
export const MINEABLE_MAX = 900_000_000;

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) provider = new ethers.JsonRpcProvider(RPC);
  return provider;
}

export function getContract(): ethers.Contract {
  if (!contract) contract = new ethers.Contract(CONTRACT, ABI, getProvider());
  return contract;
}

export function formatEther(val: bigint): number {
  return parseFloat(ethers.formatUnits(val, DECIMALS));
}

export function formatInt(val: bigint): number {
  return Number(val);
}

export function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function txLink(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function addrLink(addr: string): string {
  return `${EXPLORER}/address/${addr}`;
}

// Cached puzzle info
let puzzleCache: {
  seed: string; difficulty: number; mintAmount: number; costWei: string;
  remaining: number; era: number; enabled: boolean; totalMinted: number;
  lpSupply: number; devSupply: number;
} | null = null;
let puzzleCacheAt = 0;
const PUZZLE_CACHE_MS = 5000;

export function invalidatePuzzleCache() {
  puzzleCache = null;
  puzzleCacheAt = 0;
}

export async function getPuzzleInfo() {
  const now = Date.now();
  if (puzzleCache && now - puzzleCacheAt < PUZZLE_CACHE_MS) return puzzleCache;
  try {
    const c = getContract();
    const info = await c.getMintingInfo();
    puzzleCache = {
      seed: info[0],
      difficulty: formatInt(info[1]),
      mintAmount: Math.floor(formatEther(info[2])),
      costWei: info[3].toString(),
      remaining: Math.floor(formatEther(info[4])),
      era: formatInt(info[5]),
      enabled: info[6],
      totalMinted: Math.floor(formatEther(info[7])),
      lpSupply: Math.floor(formatEther(info[8])),
      devSupply: Math.floor(formatEther(info[9])),
    };
    puzzleCacheAt = now;
  } catch { /* */ }
  return puzzleCache;
}

export async function getMinerStats(wallet: string) {
  try {
    const c = getContract();
    const s = await c.getMinerStats(wallet);
    return {
      totalSolved: formatInt(s[0]),
      totalBlipEarned: Math.floor(formatEther(s[1])),
      totalEthSpent: formatEther(s[2]),
      lastSolveTime: formatInt(s[3]),
      currentStreak: formatInt(s[4]),
      bestStreak: formatInt(s[5]),
    };
  } catch { return null; }
}

// Query solves from Blockscout explorer API (no Alchemy free tier restrictions)
export async function fetchWalletMintedEvents(wallet: string): Promise<Array<{
  amount: number; nonce: number; timestamp: number; txHash: string; difficulty: number;
}>> {
  const seen = new Set<string>();
  const results: Array<{ amount: number; nonce: number; timestamp: number; txHash: string; difficulty: number }> = [];

  const add = (t: { amount?: number; nonce?: number; timestamp?: number; txHash: string; difficulty?: number }) => {
    if (!t.txHash || seen.has(t.txHash)) return;
    seen.add(t.txHash);
    results.push({
      amount: t.amount || 20000,
      nonce: t.nonce || 0,
      timestamp: t.timestamp || 0,
      txHash: t.txHash,
      difficulty: t.difficulty || 3,
    });
  };

  // 1. Explorer API
  try {
    const res = await fetch(`${EXPLORER}/api/v2/addresses/${wallet}/transactions?limit=20`);
    const data = await res.json();
    for (const tx of (data.items || [])) {
      if (!tx.to?.hash || tx.to.hash.toLowerCase() !== CONTRACT.toLowerCase()) continue;
      add({
        txHash: tx.hash,
        timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
      });
    }
  } catch { /* */ }

  // 2. Transfer events (ERC-20 mint = Transfer(0x0, wallet, value))
  try {
    const p = getProvider();
    const c = getContract();
    const currentBlock = await p.getBlockNumber();
    const BATCH = 10;
    for (let from = Math.max(currentBlock - 500, 89407979); from < currentBlock; from += BATCH) {
      const to = Math.min(from + BATCH - 1, currentBlock);
      try {
        const events = await c.queryFilter(c.filters.Transfer("0x0000000000000000000000000000000000000000", wallet, null), from, to);
        for (const e of events) {
          const log = e as ethers.EventLog;
          add({
            txHash: log.transactionHash,
            amount: Math.floor(formatEther(log.args[2])),
            timestamp: (await p.getBlock(log.blockNumber))?.timestamp || 0,
          });
        }
      } catch { continue; }
    }
  } catch { /* */ }

  // 3. Activity log
  try {
    const { getActivityLog } = await import("./store");
    for (const a of getActivityLog()) {
      add({
        txHash: a.txHash,
        nonce: a.nonce,
        timestamp: Math.floor(a.time / 1000),
      });
    }
  } catch { /* */ }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

// Leaderboard: query minerStats from agents that reported via /api/report
import { getAgentStore } from "./store";

let lbCache: {
  entries: Array<{ wallet: string; walletFull: string; totalSolved: number; totalEarned: number; bestStreak: number; fastestSolveMs: number; lastSolveTime: number }>;
  period: string;
  timestamp: number;
} | null = null;

export function invalidateLeaderboardCache() {
  lbCache = null;
}

export async function getCachedLeaderboard(period: "24h" | "7d" | "all" = "all") {
  const now = Date.now();
  if (lbCache && lbCache.period === period && now - lbCache.timestamp < 15000) return lbCache.entries;

  const agents = getAgentStore();
  if (agents.size === 0) {
    try {
      const owner = await getContract().owner();
      const stats = await getMinerStats(owner);
      if (stats && stats.totalSolved > 0) {
        const entry = {
          wallet: shortAddr(owner),
          walletFull: owner,
          totalSolved: stats.totalSolved,
          totalEarned: stats.totalBlipEarned,
          bestStreak: stats.bestStreak,
          fastestSolveMs: 0,
          lastSolveTime: stats.lastSolveTime,
        };
        const filtered = filterByPeriod([entry], period, now);
        lbCache = { entries: filtered, period, timestamp: now };
        return filtered;
      }
    } catch { /* */ }
    return [];
  }

  const entries: Array<{ wallet: string; walletFull: string; totalSolved: number; totalEarned: number; bestStreak: number; fastestSolveMs: number; lastSolveTime: number }> = [];

  for (const [addr, agent] of agents) {
    const stats = await getMinerStats(addr);
    if (stats && stats.totalSolved > 0) {
      entries.push({
        wallet: shortAddr(addr),
        walletFull: addr,
        totalSolved: stats.totalSolved,
        totalEarned: stats.totalBlipEarned,
        bestStreak: stats.bestStreak,
        fastestSolveMs: agent.solveTimeMs || 0,
        lastSolveTime: stats.lastSolveTime,
      });
    }
  }

  entries.sort((a, b) => b.totalSolved - a.totalSolved);
  const filtered = filterByPeriod(entries, period, now);
  lbCache = { entries: filtered, period, timestamp: now };
  return filtered;
}

function filterByPeriod<T extends { lastSolveTime: number }>(entries: T[], period: "24h" | "7d" | "all", now: number): T[] {
  if (period === "all") return entries;
  const cutoff = now / 1000 - (period === "24h" ? 86400 : 604800);
  return entries.filter((e) => e.lastSolveTime >= cutoff);
}
