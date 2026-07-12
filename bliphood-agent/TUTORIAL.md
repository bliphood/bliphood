# Tutorial: Mint BLIPHD via AI (Claude Desktop + Cursor)

## Setup

### 1. Clone repository
```bash
git clone https://github.com/bliphood/bliphood.git
cd bliphood/bliphood-agent
```

### 2. Install dependencies
```bash
pip install web3 pycryptodome mcp
```

### 3. Setup .env
Create `.env` file in the `bliphood-agent` folder:
```
BLIPHOOD_PRIVATE_KEY=your_64_hex_private_key_without_0x
BLIPHOOD_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLIPHOOD_CHAIN_ID=46630
```

### 4. Get ETH testnet
Claim faucet at: https://explorer.testnet.chain.robinhood.com

---

## Method 1: Claude Desktop (Recommended)

### Install Claude Desktop
1. Download from https://claude.ai/download
2. Install & login

### Add MCP Server
1. Open **Settings → Developer → Edit Config**
2. Edit `claude_desktop_config.json`:
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
3. Restart Claude Desktop
4. Check the 🔌 icon at the bottom right — if green, the MCP server is connected

### Start Minting
Open Claude, type a natural language command:

```
mint 2 BLIPHD
```

Claude will automatically call `mint_blip(2)` — solve puzzle + send transaction. Output:

```
Round 1: 20,000 BLIPHD minted | nonce=5,234,891 | 8.2s | tx: 0xabc123...
Round 2: 20,000 BLIPHD minted | nonce=12,890,334 | 12.1s | tx: 0xdef456...
BLIPHD Balance: 40,000 BLIPHD
ETH Balance: 0.0210 ETH
```

### Other Commands
| Command | Function |
|---|---|
| `cek saldo` | View ETH & BLIPHD balance |
| `show stats` | Puzzle info + mining analytics |
| `buka dashboard` | Link to web dashboard |
| `mint 3 blip` | Mint 3x at once (max 5) |

---

## Method 2: Cursor IDE

### Setup
1. Open Cursor → Settings → Features
2. Scroll to **MCP Servers**
3. Add a new server:
   - Name: `bliphood`
   - Type: `command`
   - Command: `python D:\PROJECT\BLIP BLOP\bliphood-agent\mcp_server.py`
4. Save

### Usage
In Cursor chat, type:
```
@bliphood mint 2 BLIPHD
```

---

## Method 3: Run Agent Solver Directly (24/7 Mining)

```bash
cd bliphood-agent
python agent_solver.py --workers 4
```

- `--once` — run 1 solve
- `--rounds 10` — stop after 10 rounds
- `--workers 4` — use 4 CPU cores
- `--stats` — view local analytics database

---

## Project Structure

```
BLIP BLOP/
├── bliphood-agent/        ← Agent mining + MCP server
│   ├── agent_solver.py    # 24/7 mining bot
│   ├── mcp_server.py      # AI agent bridge (Claude/Cursor)
│   ├── bliphood_v1_abi.json
│   ├── db.py              # SQLite analytics
│   └── skill.md           # Contract config & seed
└── bliphood-dashboard-v2/ ← Next.js web dashboard
    └── src/
        ├── app/            # Pages + API routes
        ├── components/     # UI components
        └── lib/            # Contract service, store, types
```

---

## Troubleshooting

**MCP server not connecting:**
- Check `mcp` is installed: `pip show mcp`
- Check Python path is correct in `claude_desktop_config.json`

**Insufficient ETH:**
- Claim faucet from Robinhood Testnet explorer
- 1 mint = 0.001 ETH

**Puzzle not solved:**
- Difficulty 3 zero bytes = ~16 million nonces scanned per round
- Use `--workers 4` for speed-up
