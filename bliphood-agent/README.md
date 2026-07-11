# BlipHood Agent Solver

Automated puzzle-mining bot for BLIPHD token minting on Robinhood Chain Testnet. Solves 48-bit keccak256 hash puzzles, submits solutions on-chain, and mints 20,000 BLIPHD per solve (0.001 ETH cost).

## ⚡ One-Click AI Agent Install

```bash
pip install web3 pycryptodome mcp
copy .env.example .env
# Edit .env → BLIPHOOD_PRIVATE_KEY=your_64_char_hex_key

# Claude Desktop
claude mcp add bliphood -- python mcp_server.py
```

Then just tell your AI:
> "mint some BLIPHD to my wallet"

---

## CLI Mining (24/7 Background)

```bash
python agent_solver.py           # Continuous mining
python agent_solver.py --once    # One-shot mint
python agent_solver.py --workers 8
python agent_solver.py --stats   # View analytics
```

---

## Requirements

- Python 3.11+
- 0.001 ETH per mint
- ETH for gas (Robinhood testnet faucet)
- Private key with funds

---

## Files

| File | Purpose |
|------|---------|
| `BlipHoodV1.sol` | Smart contract (Solidity 0.8.20) |
| `agent_solver.py` | 24/7 CLI miner with multiprocessing |
| `mcp_server.py` | MCP server for AI agent control |
| `db.py` | Local SQLite analytics |
| `deploy.py` | Deployment script |

---

## Network

- **Chain:** Robinhood Testnet (46646)
- **RPC:** https://rpc.testnet.chain.robinhood.com
- **Currency:** Native ETH
- **Explorer:** https://testnet.explorer.chain.robinhood.com
