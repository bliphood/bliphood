export const BLIPHOOD_CONFIG = {
  contract: "0x08f8C4aeb91c1881385C6922641A501d68bA9575",
  chainId: 46630,
  chainName: "Robinhood Testnet",
  rpc: process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://robinhood-testnet.g.alchemy.com/v2/demo",
  explorer: "https://explorer.testnet.chain.robinhood.com",
  token: "BLIPHD",
  maxSupply: 1_000_000_000,
};

export const HALVING_AMOUNTS = [20_000, 15_000, 10_000, 5_000];
export const HALVING_SUPPLY_MILESTONES = [100_000_000, 200_000_000, 300_000_000, 400_000_000];
export const SUPPLY_MILESTONES = [100_000, 500_000, 1_000_000];

export type FilterPeriod = "24h" | "7d" | "all";
