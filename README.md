# BlipHood Agent Solver

Automated puzzle-mining bot for BLIPHD token on **Robinhood Testnet** (Chain ID: 46630). Solves keccak256 zero-prefix hash puzzles, submits solutions on-chain, and mints **20,000 BLIPHD** per solve at **0.001 ETH** cost.

---

## Prerequisites

- **Python 3.10+** installed
- **Git** installed
- **Ethereum wallet** with ETH balance on Robinhood Testnet
- **Private key** (64 hex characters, without `0x` prefix)

---

## Step 1: Clone & Install Dependencies

```bash
git clone https://github.com/bliphood/bliphood.git
cd bliphood\bliphood-agent
pip install web3 pycryptodome mcp
```

---

## Step 2: Configuration

Create `.env` file in the `bliphood-agent` directory:

```
BLIPHOOD_PRIVATE_KEY=your_64_character_hex_private_key
BLIPHOOD_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/demo
BLIPHOOD_CHAIN_ID=46630
```

Verify setup:

```bash
python _rpc_test.py
```

Expected output: `✅ RPC OK`

---

## Step 3: Choose Mining Method

| Method | Description |
|--------|-------------|
| A. Claude Desktop | Mining via AI chat — easiest |
| B. Cursor IDE | Direct IDE integration |
| C. CLI Agent | 24/7 terminal-based mining |

### A. Claude Desktop

Add MCP server via **Settings → Developer → Edit Config** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bliphood": {
      "command": "python",
      "args": ["D:\\PROJECT\\BLIP BLOP\\bliphood-agent\\mcp_server.py"]
    }
  }
}
```

Restart Claude Desktop. A green 🔌 icon in the bottom right corner indicates the server is connected.

**Available commands:**

| Command | Function |
|---------|----------|
| `mint 2 BLIPHD` | Mine 2 rounds (max 5) |
| `cek saldo` | View ETH & BLIPHD balance |
| `show stats` | Puzzle info & mining statistics |
| `buka dashboard` | Get dashboard URL |

### B. Cursor IDE

**Settings → Features → MCP Servers → Add New MCP Server:**

- Name: `bliphood`
- Type: `command`
- Command: `python D:\PROJECT\BLIP BLOP\bliphood-agent\mcp_server.py`

Usage in chat: `@bliphood mint 2 BLIPHD`

### C. CLI Agent (24/7 Mining)

```bash
cd bliphood-agent
python agent_solver.py --workers 4
```

| Flag | Function |
|------|----------|
| `--once` | Mine 1 round then stop |
| `--rounds N` | Stop after N rounds |
| `--workers N` | Number of CPU cores (default: 4) |
| `--stats` | Display local database statistics |

---

## Technical Information

- **Contract:** `0x08f8C4aeb91c1881385C6922641A501d68bA9575`
- **Mint cost:** 0.001 ETH per transaction
- **Reward:** 20,000 BLIPHD per solve (current era)
- **Difficulty:** Adaptive, 3–8 zero bytes on keccak256 hash
- **Dashboard:** https://bliphood-dashboard.vercel.app
- **RPC:** https://robinhood-testnet.g.alchemy.com/v2/demo
- **Explorer:** https://explorer.testnet.chain.robinhood.com

---

## Files

| File | Purpose |
|------|---------|
| `agent_solver.py` | 24/7 CLI miner with multiprocessing |
| `mcp_server.py` | MCP server for AI agent control (Claude/Cursor) |
| `db.py` | Local SQLite analytics database |
| `BlipHoodV1.sol` | Smart contract (Solidity 0.8.20) |
| `deploy.py` | Contract deployment script |
| `_rpc_test.py` | RPC connectivity test utility |
| `_check2.py` | On-chain state query utility |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MCP server not connecting | Verify `pip show mcp`, check Python path in config |
| Insufficient ETH | Claim faucet at https://explorer.testnet.chain.robinhood.com |
| Puzzle not solved | Early difficulty averages ~16M attempts. Increase `--workers` |
| RPC error/timeout | Switch to alternative endpoint, verify with `python _rpc_test.py` |
| Invalid private key | Ensure format: 64 hex characters, no `0x` prefix |

## Links

- 📊 Dashboard: https://bliphood.vercel.app
- 🔍 Explorer: https://explorer.testnet.chain.robinhood.com/address/0x08f8C4aeb91c1881385C6922641A501d68bA9575
- 📖 Tutorial AI Mint: [bliphood-agent/TUTORIAL.md](bliphood-agent/TUTORIAL.md)
