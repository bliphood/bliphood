# BlipHood

**Solve puzzles. Mint tokens. Earn rewards.**

BlipHood is a Proof-of-Work mining protocol on Robinhood Testnet. Your computer solves mathematical puzzles — each solution mints BLIPHD tokens directly to your wallet.

---

## How It Works

```
You run the miner → It finds a special number (nonce) → Submits to smart contract → You get BLIPHD tokens
```

The puzzle: find a number where `keccak256(BLIPHOOD_PUZZLE_SEED + seed + nonce)` starts with 3 zero bytes. Each solve costs 0.001 ETH and rewards 20,000 BLIPHD.

Difficulty auto-adjusts based on how fast people are solving. Reward halves every 100M tokens mined (4 eras total).

---

## Quick Start

### Option 1: Mine via AI (Easiest)

```
pip install web3 pycryptodome mcp
mint 2 BLIPHD          # Type this in Claude or Cursor
```

[See full AI setup guide →](bliphood-agent/TUTORIAL.md)

### Option 2: Mine with the Bot

```bash
pip install web3 pycryptodome
cd bliphood-agent
python agent_solver.py --once         # Mine 1 time
python agent_solver.py --workers 4    # Mine 24/7 with 4 CPU cores
```

### Option 3: Run the Dashboard

```bash
cd bliphood-dashboard-v2
npm install
npm run dev                           # Opens at http://localhost:3000
```

---

## Tokenomics

| Detail | Value |
|---|---|
| Max Supply | 1,000,000,000 BLIPHD |
| Mineable | 900,000,000 BLIPHD |
| LP + Dev | 50M + 50M BLIPHD |
| Mint Cost | 0.001 ETH |
| Difficulty | 3-8 zero bytes (adaptive) |

| Era | Reward | Supply Range |
|---|---|---|
| Era 0 | 20,000 BLIPHD | 0 – 100M mined |
| Era 1 | 15,000 BLIPHD | 100M – 200M mined |
| Era 2 | 10,000 BLIPHD | 200M – 300M mined |
| Era 3 | 5,000 BLIPHD | 300M – 400M mined |

**Bonuses:**
- 🎰 **Jackpot**: 0.25% chance of 3x reward with difficulty 8
- 🔥 **Streak**: Solve within 1 hour of last solve = up to 10% bonus

---

## Project Structure

```
├── bliphood-agent/           Python mining bot
│   ├── agent_solver.py       Multi-core PoW solver
│   ├── mcp_server.py         AI bridge (Claude / Cursor)
│   ├── deploy.py             Deploy smart contract
│   └── BlipHoodV1.sol        Solidity source code
│
├── bliphood-dashboard-v2/    Next.js web dashboard
│   ├── Live Monitor          Real-time puzzle state (SSE)
│   ├── Leaderboard           On-chain miner rankings
│   ├── Analytics             Charts + supply curve
│   └── Wallet Dashboard      Your stats + solve history
│
└── bliphood-agent/TUTORIAL.md   How to mint via AI
```

---

## Dashboard Features

| Page | What It Shows |
|---|---|
| **Home** | Hero + canvas animation + network stats |
| **Live** | Current puzzle seed, difficulty, live solve feed (SSE) |
| **Leaderboard** | Top miners ranked by solves, streak, speed |
| **Analytics** | Mint volume chart, difficulty trends, supply curve |
| **Wallet** | Connect MetaMask → personal stats, solve history, streak |

All data pulled directly from the smart contract on-chain. No mock, no fake data.

---

## For Developers

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/stats` | GET | Network stats (supply, solvers, progress) |
| `/api/leaderboard` | GET | Miner rankings |
| `/api/recent` | GET | Latest solve activity |
| `/api/agents` | GET | Active miner agents |
| `/api/report` | POST | Agent reports a solve |
| `/api/sse` | GET | Real-time event stream |

Agent bots automatically report solves via `POST /api/report`. The dashboard updates in real-time.

### Smart Contract

```
Chain:    Robinhood Testnet (46630)
Contract: 0x08f8C4aeb91c1881385C6922641A501d68bA9575
Token:    BLIPHD (ERC-20)
Explorer: https://explorer.testnet.chain.robinhood.com
```

---

## Requirements

**Mining bot:** Python 3.9+, web3.py, pycryptodome
**Dashboard:** Node.js 20+, Next.js 16
**AI bridge:** mcp (pip install mcp)

---

## Links

- 📊 Dashboard: https://bliphood-dashboard.vercel.app
- 🔍 Explorer: https://explorer.testnet.chain.robinhood.com/address/0x08f8C4aeb91c1881385C6922641A501d68bA9575
- 📖 Tutorial AI Mint: [bliphood-agent/TUTORIAL.md](bliphood-agent/TUTORIAL.md)
