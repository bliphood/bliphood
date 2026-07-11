export interface MinerEntry {
  rank: number;
  wallet: string;
  totalSolved: number;
  totalEarned: number;
  bestStreak: number;
  fastestSolveMs: number;
  lastSolveTime: number;
}

export interface LeaderboardResponse {
  entries: MinerEntry[];
  totalMiners: number;
  period: string;
}

export interface ActivityEntry {
  wallet: string;
  totalSolves: number;
  nonce: number;
  solveMs: number;
  gasUsed: number;
  txHash: string;
  time: number;
}

export interface PuzzleInfo {
  seed: string;
  difficulty: number;
  mintAmount: number;
  costWei: string;
  remaining: number;
  era: number;
  enabled: boolean;
  totalMinted: number;
  avgSolveTimeMs: number;
}

export interface ChainStats {
  totalMinted: number;
  remainingSupply: number;
  progressPct: string;
  maxSupply: number;
  activeSolvers: number;
}

export interface AgentEntry {
  wallet: string;
  totalSolves: number;
  lastSeen: number;
  online: boolean;
  solveTimeMs: number;
  lastNonce: number;
}

export interface NotificationItem {
  id: string;
  type: "halving" | "milestone" | "jackpot" | "difficulty" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
  data?: Record<string, unknown>;
}

export interface DailyMintData {
  date: string;
  mints: number;
  volume: number;
  avgSolveMs: number;
  difficulty: number;
}

export interface SolveEvent {
  wallet: string;
  amount: number;
  nonce: number;
  timestamp: number;
  txHash: string;
  difficulty: number;
  solveTimeMs: number;
  isJackpot: boolean;
}
