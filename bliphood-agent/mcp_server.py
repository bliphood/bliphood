#!/usr/bin/env python3
"""
BlipHood MCP Server — exposes BlipHood Agent tools to AI agents (Claude, OpenClaw, etc.)
Pays native ETH (msg.value) per mint.

Install:
  pip install mcp web3 pycryptodome

One-click add to Claude:
  claude mcp add bliphood -- python mcp_server.py
"""

import os
import sys
import json
import time
import struct
import warnings
import multiprocessing as mp
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP
from web3 import Web3
from web3.middleware import SignAndSendRawMiddlewareBuilder
from Crypto.Hash import keccak as _keccak_mod

import db

warnings.filterwarnings("ignore", message=".*MismatchedABI.*")

def keccak(data: bytes) -> bytes:
    return _keccak_mod.new(digest_bits=256, data=data).digest()

SKILL_PATH = Path(__file__).parent / "skill.md"
ABI_DIR    = Path(__file__).parent

CHAIN_ID     = 46630
RPC_URL      = os.getenv("BLIPHOOD_RPC_URL", "https://rpc.testnet.chain.robinhood.com")
MINT_COST_ETH = 0.001
MINT_COST    = Web3.to_wei(MINT_COST_ETH, 'ether')
MINT_AMOUNT  = 20_000 * 10**18
PUZZLE_KW    = keccak(b"BLIPHOOD_PUZZLE_SEED")
MAX_NONCE    = 2**64 - 1
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://bliphood-dashboard.vercel.app/api/report")

ENV_PATH = Path(__file__).parent / ".env"
if ENV_PATH.exists():
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip("'\"").strip("\"'")
                if k and v and k not in os.environ:
                    os.environ[k] = v

_raw_key = os.getenv("BLIPHOOD_PRIVATE_KEY") or os.getenv("DEPLOYER_PRIVATE_KEY", "")
PRIVATE_KEY = _raw_key[2:] if _raw_key.startswith("0x") or _raw_key.startswith("0X") else _raw_key

def hash_puzzle(seed: bytes, nonce: int) -> bytes:
    return keccak(PUZZLE_KW + seed + b'\x00' * 24 + struct.pack(">Q", nonce))

def verify_puzzle(seed: bytes, nonce: int, zero_prefix: bytes) -> bool:
    return hash_puzzle(seed, nonce)[:len(zero_prefix)] == zero_prefix

def solve_chunk(args: tuple) -> Optional[int]:
    seed, start, end, zero_prefix = args
    for nonce in range(start, min(end, MAX_NONCE + 1)):
        if verify_puzzle(seed, nonce, zero_prefix):
            return nonce
    return None

def solve_puzzle(seed: bytes, zero_prefix: bytes, num_workers: int = None) -> Optional[int]:
    if num_workers is None:
        num_workers = max(1, mp.cpu_count() - 1)
    chunk = 1_000_000
    ranges = [(seed, i * chunk, min((i + 1) * chunk, MAX_NONCE + 1), zero_prefix)
              for i in range(num_workers)]
    with mp.Pool(processes=num_workers) as pool:
        for result in pool.imap_unordered(solve_chunk, ranges):
            if result is not None:
                return result
    return None

def load_skill() -> dict:
    if not SKILL_PATH.exists():
        raise FileNotFoundError(f"skill.md not found at {SKILL_PATH}")
    content = SKILL_PATH.read_text(encoding="utf-8")
    seed, contract_address = None, None
    for line in content.splitlines():
        line = line.strip()
        if "**Seed:**" in line:
            s = line.split("**Seed:**", 1)[-1].strip()
            s = s[2:] if s.startswith("0x") else s
            seed = bytes.fromhex(s.zfill(64))
        elif "**Contract Address:**" in line:
            contract_address = line.split("**Contract Address:**", 1)[-1].strip()
    if not seed or len(seed) != 32:
        raise ValueError(f"Invalid seed: {seed}")
    if not contract_address:
        raise ValueError("Contract address missing")
    return {"seed": seed, "contract_address": Web3.to_checksum_address(contract_address)}

def get_w3() -> Web3:
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        raise ConnectionError(f"Cannot connect to {RPC_URL}")
    wallet = w3.eth.account.from_key(PRIVATE_KEY)
    w3.middleware_onion.add(SignAndSendRawMiddlewareBuilder.build(wallet))
    w3.eth.default_account = wallet.address
    return w3

def _report_stats(wallet: str) -> None:
    try:
        import urllib.request
        stats = db.get_stats()
        recents = db.get_recent_solves(5)
        daily = db.get_daily_summary(7)
        data = json.dumps({
            "wallet": wallet,
            "type": "stats",
            "stats": stats,
            "recents": recents,
            "daily": daily,
        }).encode()
        req = urllib.request.Request(DASHBOARD_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

mp.freeze_support()
mcp = FastMCP("BlipHood Agent")

@mcp.tool()
def mint_blip(rounds: int = 1) -> str:
    """
    Solve the BLIPHD puzzle and mint tokens using ETH. Runs N rounds of solve+mint.
    Each round mints 20,000 BLIPHD at 0.001 ETH cost.

    Args:
        rounds: Number of mint rounds to run (default 1, max 5)
    """
    if not PRIVATE_KEY:
        return "ERROR: Set BLIPHOOD_PRIVATE_KEY in .env file"

    rounds = min(max(1, rounds), 5)
    skill = load_skill()
    arch_addr = skill["contract_address"]
    seed = skill["seed"]

    w3 = get_w3()
    wallet = w3.eth.default_account

    with open(ABI_DIR / "bliphood_v1_abi.json") as f:
        abi = json.load(f)

    contract = w3.eth.contract(address=arch_addr, abi=abi)

    puzzle_bytes = contract.functions.PUZZLE_BYTE_PREFIX().call()
    zero_prefix = bytes(puzzle_bytes)

    eth_bal = w3.eth.get_balance(wallet)
    if eth_bal < MINT_COST * rounds:
        return f"Insufficient ETH: {eth_bal / 1e18:.4f} ETH (need {MINT_COST_ETH * rounds} ETH)"

    # Check on-chain mint cost
    onchain_cost = contract.functions.mintCost().call()
    cost_per_mint = max(MINT_COST, onchain_cost)

    results = []
    for r in range(rounds):
        current_seed = contract.functions.currentPuzzleSeed().call()
        t0 = time.time()
        nonce = solve_puzzle(current_seed, zero_prefix)
        solve_ms = int((time.time() - t0) * 1000)

        if nonce is None:
            results.append(f"Round {r+1}: No solution found in {solve_ms}ms")
            continue

        try:
            tx = contract.functions.solveAndMint(nonce).transact({
                "from": wallet,
                "value": cost_per_mint,
            })
            receipt = w3.eth.wait_for_transaction_receipt(tx, timeout=120)
            if receipt["status"] == 1:
                results.append(
                    f"Round {r+1}: {MINT_AMOUNT/1e18:,.0f} BLIPHD minted | "
                    f"nonce={nonce:,} | {solve_ms}ms | "
                    f"tx: {receipt['transactionHash'].hex()[:10]}..."
                )
            else:
                results.append(f"Round {r+1}: Tx failed | nonce={nonce:,}")
        except Exception as e:
            results.append(f"Round {r+1}: {e}")

    blip_bal = contract.functions.balanceOf(wallet).call()
    eth_bal = w3.eth.get_balance(wallet)
    results.append(f"BLIPHD Balance: {blip_bal / 1e18:,.0f} BLIPHD")
    results.append(f"ETH Balance: {eth_bal / 1e18:.4f} ETH")

    _report_stats(wallet)

    import urllib.request
    try:
        data = json.dumps({
            "wallet": wallet,
            "totalSolves": -1,
            "lastNonce": nonce if nonce else 0,
            "solveTimeMs": solve_ms if nonce else 0
        }).encode()
        req = urllib.request.Request(DASHBOARD_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        pass

    return "\n".join(results)


@mcp.tool()
def get_balances() -> str:
    """Get ETH and BLIP token balances for your wallet."""
    if not PRIVATE_KEY:
        return "Set BLIPHOOD_PRIVATE_KEY in .env"

    try:
        w3 = get_w3()
        skill = load_skill()
        wallet = w3.eth.default_account

        with open(ABI_DIR / "bliphood_v1_abi.json") as f:
            contract = w3.eth.contract(address=skill["contract_address"], abi=json.load(f))

        eth_bal = w3.eth.get_balance(wallet)
        blip_bal = contract.functions.balanceOf(wallet).call()

        return (
            f"Wallet: {wallet}\n"
            f"ETH: {eth_bal / 1e18:.4f} ETH\n"
            f"BLIPHD: {blip_bal / 1e18:,.0f} BLIPHD"
        )
    except Exception as e:
        return f"Error: {e}"


@mcp.tool()
def get_stats() -> str:
    """Get current BlipHood stats: seed, difficulty, contract info, dashboard URL, plus local mining analytics."""
    try:
        skill = load_skill()
        w3 = get_w3()

        with open(ABI_DIR / "bliphood_v1_abi.json") as f:
            contract = w3.eth.contract(address=skill["contract_address"], abi=json.load(f))

        onchain_seed = contract.functions.currentPuzzleSeed().call()
        puzzle_bytes = contract.functions.PUZZLE_BYTE_PREFIX().call()
        remaining = contract.functions.remainingSupply().call()
        total_supply = contract.functions.totalSupply().call()
        minting = contract.functions.mintingEnabled().call()
        mint_cost = contract.functions.mintCost().call()

        db.init_db()
        local = db.get_stats()

        lines = [
            f"Contract: {skill['contract_address']}",
            f"Seed: 0x{onchain_seed.hex()}",
            f"Difficulty: {puzzle_bytes} zero bytes ({puzzle_bytes * 8} bits)",
            f"Minting: {'Enabled' if minting else 'Disabled'}",
            f"Mint cost: {Web3.from_wei(mint_cost, 'ether')} ETH",
            f"Total Minted: {total_supply / 1e18:,.0f} BLIPHD",
            f"Remaining: {remaining / 1e18:,.0f} BLIPHD",
            "",
            "Local Mining Stats",
            f"Total attempts: {local['total_attempts']}",
            f"Successful: {local['total_solves']} ({local['success_rate']}%)",
            f"Failed: {local['total_failures']}",
            f"Current streak: {local['current_streak']}",
            f"Best solve: {local['best_solve_ms']:,}ms",
            f"Avg solve: {local['avg_solve_ms']:,}ms",
            f"BLIPHD mined: {local['total_bliphd']:,}",
            f"ETH spent: {local['total_eth_spent']} ETH",
            f"Total gas: {local['total_gas']:,}",
            f"Solves/hr: {local['solves_per_hour']}",
            f"Dashboard: https://bliphood-dashboard.vercel.app",
        ]

        _report_stats(w3.eth.default_account)
        return "\n".join(lines)
    except Exception as e:
        return f"Error: {e}"


@mcp.tool()
def get_dashboard() -> str:
    """Get the BlipHood dashboard URL and instructions."""
    return (
        "Dashboard: https://bliphood-dashboard.vercel.app\n"
        "Agent API: https://bliphood-dashboard.vercel.app/api\n"
        "Live stats, active solvers, minting progress in real-time."
    )


@mcp.tool()
def configure(wallet_key: str = "", contract_address: str = "") -> str:
    """
    Configure the BlipHood agent settings.

    Args:
        wallet_key: Your private key (64 hex chars, no 0x prefix)
        contract_address: BlipHood contract address (0x...)
    """
    changes = []

    if wallet_key:
        if len(wallet_key) == 64:
            global PRIVATE_KEY
            PRIVATE_KEY = wallet_key
            os.environ["BLIPHOOD_PRIVATE_KEY"] = wallet_key

            env_path = Path(__file__).parent / ".env"
            if env_path.exists():
                content = env_path.read_text()
                if "BLIPHOOD_PRIVATE_KEY=" in content:
                    import re
                    content = re.sub(
                        r"BLIPHOOD_PRIVATE_KEY=.*",
                        f"BLIPHOOD_PRIVATE_KEY={wallet_key}",
                        content
                    )
                else:
                    content += f"\nBLIPHOOD_PRIVATE_KEY={wallet_key}\n"
                env_path.write_text(content)
            changes.append("Wallet key updated")
        else:
            return "Invalid key: must be 64 hex characters"

    if contract_address:
        try:
            ca = Web3.to_checksum_address(contract_address)
            skill_path = Path(__file__).parent / "skill.md"
            if skill_path.exists():
                content = skill_path.read_text()
                if "**Contract Address:**" in content:
                    import re
                    content = re.sub(
                        r"\*\*Contract Address:\*\*.*",
                        f"**Contract Address:** {ca}",
                        content
                    )
                    skill_path.write_text(content)
                changes.append(f"Contract address updated to {ca}")
            else:
                changes.append("skill.md not found")
        except Exception as e:
            return f"Invalid address: {e}"

    if not changes:
        return "No changes made."

    return "\n".join(changes)


def main():
    mcp.run(transport="stdio")

if __name__ == "__main__":
    main()
