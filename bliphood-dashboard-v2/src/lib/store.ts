import type { NotificationItem } from "./types";

const clientStore = global as unknown as {
  __bliphood_sse?: Set<(data: string) => void>;
  __bliphood_activity?: Array<{ wallet: string; totalSolves: number; nonce: number; solveMs: number; gasUsed: number; txHash: string; time: number }>;
  __bliphood_agents?: Map<string, { lastSeen: number; totalSolves: number; lastNonce: number; solveTimeMs: number }>;
};

const MAX_LOG = 50;

export function getSSEClients() {
  if (!clientStore.__bliphood_sse) clientStore.__bliphood_sse = new Set();
  return clientStore.__bliphood_sse;
}

export function getActivityLog() {
  if (!clientStore.__bliphood_activity) clientStore.__bliphood_activity = [];
  return clientStore.__bliphood_activity;
}

export function getAgentStore() {
  if (!clientStore.__bliphood_agents) clientStore.__bliphood_agents = new Map();
  return clientStore.__bliphood_agents;
}

export function countActiveAgents() {
  const now = Date.now();
  let active = 0;
  for (const [, v] of getAgentStore()) {
    if (now - v.lastSeen < 30000) active++;
  }
  return active;
}

export function addActivity(entry: { wallet: string; totalSolves: number; nonce: number; solveMs: number; gasUsed: number; txHash: string; time: number }) {
  const log = getActivityLog();
  log.push(entry);
  if (log.length > MAX_LOG) log.shift();
}

export function broadcastSSE(event: string, data: string) {
  for (const send of getSSEClients()) {
    try { send(`event: ${event}\ndata: ${data}\n\n`); } catch { /* */ }
  }
}
