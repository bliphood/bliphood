# Tutorial: Mint BLIPHD via AI (Claude Desktop + Cursor)

## Persiapan

### 1. Clone repository
```bash
git clone https://github.com/Vivy110/BlipHood.git
cd BlipHood/bliphood-agent
```

### 2. Install dependencies
```bash
pip install web3 pycryptodome mcp
```

### 3. Setup .env
Buat file `.env` di folder `bliphood-agent`:
```
BLIPHOOD_PRIVATE_KEY=private_key_kamu_64_hex_tanpa_0x
BLIPHOOD_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLIPHOOD_CHAIN_ID=46630
```

### 4. Dapatkan ETH testnet
Claim faucet di: https://explorer.testnet.chain.robinhood.com

---

## Cara 1: Claude Desktop (Direkomendasikan)

### Install Claude Desktop
1. Download dari https://claude.ai/download
2. Install & login

### Tambahkan MCP Server
1. Buka **Settings → Developer → Edit Config**
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
4. Lihat icon 🔌 di kanan bawah — jika hijau, MCP server sudah connect

### Mulai Mint
Buka Claude, ketik perintah natural:

```
mint 2 BLIPHD
```

Claude akan otomatis memanggil `mint_blip(2)` — solve puzzle + kirim transaksi. Output:

```
Round 1: 20,000 BLIPHD minted | nonce=5,234,891 | 8.2s | tx: 0xabc123...
Round 2: 20,000 BLIPHD minted | nonce=12,890,334 | 12.1s | tx: 0xdef456...
BLIPHD Balance: 40,000 BLIPHD
ETH Balance: 0.0210 ETH
```

### Perintah Lain
| Perintah | Fungsi |
|---|---|
| `cek saldo` | Lihat ETH & BLIPHD balance |
| `show stats` | Info puzzle + mining analytics |
| `buka dashboard` | Link ke dashboard web |
| `mint 3 blip` | Mint 3x sekaligus (max 5) |

---

## Cara 2: Cursor IDE

### Setup
1. Buka Cursor → Settings → Features
2. Scroll ke **MCP Servers**
3. Tambah server baru:
   - Name: `bliphood`
   - Type: `command`
   - Command: `python D:\PROJECT\BLIP BLOP\bliphood-agent\mcp_server.py`
4. Save

### Gunakan
Di Cursor chat, ketik:
```
@bliphood mint 2 BLIPHD
```

---

## Cara 3: Pakai Agent Solver Langsung (24/7 Mining)

```bash
cd bliphood-agent
python agent_solver.py --workers 4
```

- `--once` — jalankan 1x solve
- `--rounds 10` — berhenti setelah 10 round
- `--workers 4` — gunakan 4 CPU core
- `--stats` — lihat analytics database lokal

---

## Struktur Proyek

```
BLIP BLOP/
├── bliphood-agent/       ← Agent mining + MCP server
│   ├── agent_solver.py   # Bot mining 24/7
│   ├── mcp_server.py     # AI agent bridge (Claude/Cursor)
│   ├── bliphood_v1_abi.json
│   ├── db.py             # SQLite analytics
│   └── skill.md          # Konfigurasi kontrak & seed
└── bliphood-dashboard-v2/ ← Dashboard web Next.js
    └── src/
        ├── app/           # Halaman + API routes
        ├── components/    # UI components
        └── lib/           # Contract service, store, types
```

---

## Troubleshooting

**MCP server tidak connect:**
- Cek `mcp` terinstall: `pip show mcp`
- Cek Python path benar di `claude_desktop_config.json`

**Insufficient ETH:**
- Claim faucet di explorer Robinhood Testnet
- 1 mint = 0.001 ETH

**Puzzle tidak solved:**
- Difficulty 3 zero bytes = ~16 juta nonce di-scan per round
- Pakai `--workers 4` untuk speed-up
