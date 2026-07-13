#!/usr/bin/env python3
"""
BlipHood Agent Solver
- Solves:   keccak256("BLIPHOOD_PUZZLE_SEED" + seed + uint64(nonce)) starts with N zero bytes
- Pays native ETH (msg.value) per mint
- Listens for NewPuzzleSeed event -> auto-updates skill.md
- Windows-compatible multiprocessing (spawn context)
"""

import os
import sys
import json
import time
import struct
import atexit
import argparse
import warnings
import tempfile
import multiprocessing as mp
import urllib.request
from pathlib import Path
from typing import Optional, Tuple

from web3 import Web3
from web3.contract import Contract
from web3.exceptions import TimeExhausted
from web3.middleware import SignAndSendRawMiddlewareBuilder
from Crypto.Hash import keccak as _keccak_mod
import urllib3
urllib3.disable_warnings()
import requests as _requests

import db

warnings.filterwarnings("ignore", message=".*MismatchedABI.*")

def keccak(data: bytes) -> bytes:
    return _keccak_mod.new(digest_bits=256, data=data).digest()

# -----------------------------------------------------------
# ANSI Color Palette
# -----------------------------------------------------------
class C:
    RST    = "\033[0m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    RED    = "\033[91m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    BLUE   = "\033[94m"
    MAG    = "\033[95m"
    CYAN   = "\033[96m"
    WHITE  = "\033[97m"
    GRAY   = "\033[90m"

if sys.platform == "win32":
    try:
        import ctypes as _ct
        _ct.windll.kernel32.SetConsoleMode(_ct.windll.kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

def c(tag: str) -> str:
    return {
        "solver": C.BOLD + C.CYAN,
        "eth":    C.BOLD + C.BLUE,
        "mint":   C.BOLD + C.MAG,
        "skill":  C.BOLD + C.CYAN,
        "sync":   C.BOLD + C.YELLOW,
        "round":  C.BOLD + C.GREEN,
        "ok":     C.BOLD + C.GREEN,
        "fail":   C.BOLD + C.RED,
        "warn":   C.BOLD + C.YELLOW,
        "err":    C.BOLD + C.RED,
        "val":    C.CYAN,
        "hdr":    C.BOLD + C.CYAN,
        "dim":    C.DIM,
    }.get(tag, "")

# -----------------------------------------------------------
# Configuration
# -----------------------------------------------------------
SKILL_PATH      = Path(__file__).parent / "skill.md"
SKILL_LOCK_PATH = Path(__file__).parent / "skill.md.lock"
ABI_PATH        = Path(__file__).parent

def _cleanup():
    if SKILL_LOCK_PATH.exists():
        SKILL_LOCK_PATH.unlink()
    tmp_path = SKILL_PATH.with_suffix(".md.tmp")
    if tmp_path.exists():
        tmp_path.unlink()
atexit.register(_cleanup)

# Load .env FIRST, before reading config
_ENV_PATH = Path(__file__).parent / ".env"
if _ENV_PATH.exists():
    with open(_ENV_PATH, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _val = _line.split("=", 1)
                _key = _key.strip()
                _val = _val.strip().strip("'").strip('"')
                if _key and _val and _key not in os.environ:
                    os.environ[_key] = _val

CHAIN_ID     = 46630
RPC_URL      = os.getenv("BLIPHOOD_RPC_URL", "https://rpc.testnet.chain.robinhood.com")

MINT_COST_ETH = 0.001
MINT_COST     = Web3.to_wei(MINT_COST_ETH, 'ether')
MINT_AMOUNT   = 20_000 * 10**18
ZERO_PREFIX   = bytes(6)
PUZZLE_KW     = keccak(b"BLIPHOOD_PUZZLE_SEED")
MAX_NONCE     = 2**64 - 1

_raw_key = os.getenv("BLIPHOOD_PRIVATE_KEY") or os.getenv("DEPLOYER_PRIVATE_KEY", "")
PRIVATE_KEY = _raw_key[2:] if _raw_key.startswith("0x") or _raw_key.startswith("0X") else _raw_key
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://bliphood-dashboard.vercel.app/api/report")

# -----------------------------------------------------------
# Puzzle Functions
# -----------------------------------------------------------
def hash_puzzle(seed: bytes, nonce: int) -> bytes:
    data = PUZZLE_KW + seed + b'\x00' * 24 + struct.pack(">Q", nonce)
    return keccak(data)

def verify_puzzle(seed: bytes, nonce: int, zero_prefix: bytes) -> bool:
    return hash_puzzle(seed, nonce)[:len(zero_prefix)] == zero_prefix

def solve_chunk(args: tuple) -> Optional[int]:
    seed, start, end, zero_prefix = args
    total = end - start
    checkpoint = max(total // 10, 1_000_000)
    next_check = start + checkpoint
    for nonce in range(start, min(end, MAX_NONCE + 1)):
        if nonce >= next_check:
            pct = int((nonce - start) / total * 100)
            sys.stdout.write(f'\r{c("solver")}[Solver]{C.RST} Worker searching... {c("val")}{pct}%{C.RST}')
            sys.stdout.flush()
            next_check = nonce + checkpoint
        if verify_puzzle(seed, nonce, zero_prefix):
            return nonce
    return None

def solve_puzzle_parallel(
    seed: bytes,
    zero_prefix: bytes,
    num_workers: Optional[int] = None,
    chunk_size: int = 1_000_000,
    offset: int = 0
) -> Optional[int]:
    if num_workers is None:
        num_workers = max(1, mp.cpu_count() - 1)

    ranges = [
        (seed, offset + i * chunk_size, min(offset + (i + 1) * chunk_size, MAX_NONCE + 1), zero_prefix)
        for i in range(num_workers)
    ]

    S = c("solver"); R = C.RST; V = c("val")
    print(f"{S}[Solver]{R} Workers : {V}{num_workers}{R}")
    print(f"{S}[Solver]{R} Chunk   : {V}{chunk_size:,}{R} nonces/worker")
    print(f"{S}[Solver]{R} Offset  : {V}{offset:,}{R}")
    print(f"{S}[Solver]{R} Total   : {V}{chunk_size * num_workers:,}{R} nonces")
    print(f"{S}[Solver]{R} Seed    : {C.DIM}0x{seed.hex()}{R}")

    start_time = time.time()
    pool = mp.Pool(processes=num_workers)
    try:
        for result in pool.imap_unordered(solve_chunk, ranges):
            if result is not None:
                elapsed = time.time() - start_time
                print(f"{c('solver')}[Solver]{R} {c('ok')}[OK]{R} Found nonce={c('val')}{result:,}{R} in {c('val')}{elapsed:.2f}s{R}")
                return result
    finally:
        pool.close()
        pool.join()

    print(f"{c('solver')}[Solver]{R} {c('fail')}[FAIL]{R} No solution found in search space.")
    return None

# -----------------------------------------------------------
# Skill File Management
# -----------------------------------------------------------
def load_skill() -> dict:
    if not SKILL_PATH.exists():
        raise FileNotFoundError(
            f"skill.md not found at {SKILL_PATH}\n"
            "Copy from skill.md.template and fill in contract address + seed."
        )

    content = SKILL_PATH.read_text(encoding="utf-8")
    seed, contract_address = None, None

    for line in content.splitlines():
        line = line.strip()
        if "**Seed:**" in line:
            seed_str = line.split("**Seed:**", 1)[-1].strip()
            seed_str = seed_str[2:] if seed_str.startswith("0x") else seed_str
            seed = bytes.fromhex(seed_str.zfill(64))
        elif "**Contract Address:**" in line:
            contract_address = line.split("**Contract Address:**", 1)[-1].strip()

    if not seed or len(seed) != 32:
        raise ValueError(f"Invalid seed in skill.md (need 32 bytes): {seed}")
    if not contract_address:
        raise ValueError("Contract address missing from skill.md")

    return {
        "seed":             seed,
        "contract_address": Web3.to_checksum_address(contract_address),
    }

def save_skill(seed: bytes, contract_address: str) -> None:
    lock_file = SKILL_LOCK_PATH
    waited = 0
    while lock_file.exists():
        time.sleep(0.1)
        waited += 1
        if waited > 50:
            print(f"{c('skill')}[Skill]{C.RST} {c('warn')}[WARN]{C.RST} Lock timeout -- writing anyway")
            break

    lock_file.write_text(str(time.time()), encoding="utf-8")
    try:
        content = SKILL_PATH.read_text(encoding="utf-8")
        found_seed = False
        lines = []
        for line in content.splitlines():
            if "**Seed:**" in line:
                found_seed = True
                lines.append(f"- **Seed:** 0x{seed.hex()}")
            else:
                lines.append(line)

        if not found_seed:
            lines.append(f"- **Seed:** 0x{seed.hex()}")

        new_content = "\n".join(lines)
        tmp_path = SKILL_PATH.with_suffix(".md.tmp")
        tmp_path.write_text(new_content, encoding="utf-8")
        os.replace(tmp_path, SKILL_PATH)
        print(f"{c('skill')}[Skill]{C.RST} {c('ok')}[OK]{C.RST} skill.md updated: seed={c('dim')}0x{seed.hex()}{C.RST}")
    finally:
        if lock_file.exists():
            lock_file.unlink()

# -----------------------------------------------------------
# Blockchain Interaction
# -----------------------------------------------------------
def mint_bliphood(w3: Web3, contract: Contract, nonce: int, owner: str) -> Tuple[bool, str, int, int, int]:
    M = c("mint"); R = C.RST
    print(f"{M}[Mint]{R} solveAndMint({c('val')}{nonce:,}{R}) sending {c('val')}{MINT_COST_ETH}{R} ETH ...")

    onchain_cost = MINT_COST
    try:
        if not contract.functions.mintingEnabled().call():
            print(f"{M}[Mint]{R} {c('fail')}[FAIL]{R} Minting is DISABLED by owner")
            return False, "", 0, 0, 0

        remaining = contract.functions.remainingSupply().call()
        if remaining < MINT_AMOUNT:
            print(f"{M}[Mint]{R} {c('fail')}[FAIL]{R} Max supply reached. Remaining: {c('val')}{remaining:,}{R}")
            return False, "", 0, 0, 0

        onchain_cost = contract.functions.mintCost().call()
        cost_to_send = max(MINT_COST, onchain_cost)

        max_priority = w3.eth.max_priority_fee
        tx = contract.functions.solveAndMint(nonce).transact({
            "from":                owner,
            "value":               cost_to_send,
            "maxFeePerGas":        max_priority + 2 * w3.eth.get_block('latest')['baseFeePerGas'],
            "maxPriorityFeePerGas": max_priority,
        })

        receipt = w3.eth.wait_for_transaction_receipt(tx, timeout=120)
        tx_hash = receipt['transactionHash'].hex()
        gas_used = receipt['gasUsed']
        if receipt["status"] == 1:
            print(f"{M}[Mint]{R} {c('ok')}[OK]{R} {C.BOLD}{C.GREEN}SUCCESS!{R} Tx: {c('dim')}{tx_hash}{R}")
            print(f"{M}[Mint]{R} Gas used: {c('val')}{gas_used:,}{R}")
            # Extract actual mint amount from Minted event
            actual_amount = MINT_AMOUNT
            try:
                mint_logs = contract.events.Minted().process_receipt(receipt)
                if mint_logs:
                    actual_amount = mint_logs[0]["args"]["amount"]
            except Exception:
                pass
            logs = contract.events.NewPuzzleSeed().process_receipt(receipt)
            if logs:
                new_seed = logs[0]["args"]["newSeed"]
                print(f"{M}[Mint]{R} New seed: {c('dim')}0x{new_seed.hex()}{R}")
                save_skill(new_seed, contract.address)
            return True, tx_hash, gas_used, actual_amount, cost_to_send
        else:
            print(f"{M}[Mint]{R} {c('fail')}[FAIL]{R} FAILED! Tx: {c('dim')}{tx_hash}{R}")
            return False, tx_hash, gas_used, 0, 0

    except TimeExhausted:
        print(f"{M}[Mint]{R} {c('fail')}[FAIL]{R} Transaction timed out")
        return False, "", 0, 0, 0
    except Exception as e:
        print(f"{M}[Mint]{R} {c('fail')}[FAIL]{R} ERROR: {e}")
        return False, "", 0, 0, 0

# -----------------------------------------------------------
# Dashboard Report
# -----------------------------------------------------------
def report_solve(wallet: str, total_solves: int, last_nonce: int, solve_time_ms: int, gas_used: int = 0, tx_hash: str = "") -> None:
    try:
        data = json.dumps({
            "wallet": wallet,
            "totalSolves": total_solves,
            "lastNonce": last_nonce,
            "solveTimeMs": solve_time_ms,
            "gasUsed": gas_used,
            "txHash": tx_hash,
        }).encode()
        req = urllib.request.Request(DASHBOARD_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST")
        resp = urllib.request.urlopen(req, timeout=5)
        body = resp.read().decode()
        print(f"{c('dim')}[Report] OK -> {DASHBOARD_URL}: {body}{C.RST}")
    except Exception as e:
        print(f"{c('warn')}[Report] FAIL -> {DASHBOARD_URL}: {e}{C.RST}")

def report_stats(wallet: str) -> None:
    try:
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
        resp = urllib.request.urlopen(req, timeout=5)
        body = resp.read().decode()
        print(f"{c('dim')}[Stats] OK -> {DASHBOARD_URL}: {body}{C.RST}")
    except Exception as e:
        print(f"{c('warn')}[Stats] FAIL -> {DASHBOARD_URL}: {e}{C.RST}")

# -----------------------------------------------------------
# Stats Display
# -----------------------------------------------------------
def _show_stats() -> None:
    db.init_db()
    stats = db.get_stats()
    recents = db.get_recent_solves(10)
    daily = db.get_daily_summary(7)

    R = C.RST; B = C.BOLD; V = c("val"); D = C.DIM; G = c("ok"); E = c("err")

    print(f"\n{B}{C.CYAN}{'='*60}")
    print(f"{B}{C.WHITE}  BLIPHOOD MINING ANALYTICS{C.CYAN}")
    print(f"{D}  Historical Database{C.CYAN}")
    print(f"{'='*60}{R}\n")

    print(f"{B}Performance{R}")
    print(f"  Total attempts   : {V}{stats['total_attempts']}{R}")
    print(f"  Successful       : {V}{stats['total_solves']}{R}")
    print(f"  Failed           : {V}{stats['total_failures']}{R}")
    print(f"  Success rate     : {V}{stats['success_rate']}%{R}")
    print(f"  Current streak   : {V}{stats['current_streak']}{R}")
    print(f"  Best solve time  : {V}{stats['best_solve_ms']:,}ms{R}")
    print(f"  Avg solve time   : {V}{stats['avg_solve_ms']:,}ms{R}")
    print(f"  Worst solve time : {V}{stats['worst_solve_ms']:,}ms{R}")

    print(f"\n{B}Earnings{R}")
    print(f"  Total BLIPHD mined : {V}{stats['total_bliphd']:,}{R}")
    print(f"  Total ETH spent  : {V}{stats['total_eth_spent']:.4f} ETH{R}")
    print(f"  Total gas used   : {V}{stats['total_gas']:,}{R}")
    print(f"  Time span        : {V}{stats['time_span_hours']}h{R}")
    print(f"  Solves/hour      : {V}{stats['solves_per_hour']}{R}")
    print(f"  Solves last hour : {V}{stats['solves_last_hour']}{R}")

    if recents:
        print(f"\n{B}Recent Solves{R}")
        print(f"  {'#':<5} {'Time':<8} {'Status':<8} {'Solve MS':<10} {'Gas':<10} {'Nonce':<16} {'Tx Hash'}")
        print(f"  {'-'*5} {'-'*8} {'-'*8} {'-'*10} {'-'*10} {'-'*16} {'-'*20}")
        for r in recents:
            import datetime
            ts = datetime.datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S')
            status = f"{G}OK{R}" if r['success'] else f"{E}FAIL{R}"
            tx_short = r['tx_hash'][:18] + "..." if len(r['tx_hash']) > 18 else r['tx_hash']
            print(f"  {r['id']:<5} {ts:<8} {status:<17} {r['solve_ms']:<10,} {r['gas_used']:<10,} {r['nonce']:<16,} {D}{tx_short}{R}")

    if daily:
        print(f"\n{B}Daily Summary (7d){R}")
        print(f"  {'Day':<12} {'Attempts':<10} {'Solves':<8} {'Fails':<7} {'Avg MS':<10} {'Gas'}")
        print(f"  {'-'*12} {'-'*10} {'-'*8} {'-'*7} {'-'*10} {'-'*10}")
        for d in daily:
            print(f"  {d['day']:<12} {d['attempts']:<10} {d['solves']:<8} {d['failures']:<7} {d['avg_solve_ms']:<10,} {d['total_gas']:<10,}")

    print()

# -----------------------------------------------------------
# Main Loop
# -----------------------------------------------------------
def main() -> None:
    global PRIVATE_KEY

    mp.freeze_support()

    parser = argparse.ArgumentParser(description="BlipHood Agent Solver")
    parser.add_argument("--rounds", type=int, default=0, help="Run N rounds then exit (0=infinite)")
    parser.add_argument("--once", action="store_true", help="Run 1 round then exit")
    parser.add_argument("--workers", type=int, default=0, help="Number of worker processes (0=auto: cpu_count-1)")
    parser.add_argument("--stats", action="store_true", help="Show analytics from local database and exit")
    args = parser.parse_args()

    if args.stats:
        _show_stats()
        sys.exit(0)

    max_rounds = 1 if args.once else args.rounds
    num_workers = args.workers if args.workers > 0 else None

    R = C.RST; B = C.BOLD; D = C.DIM; V = c("val"); G = c("ok"); E = c("err"); W = c("warn")

    print(f"\n{C.BOLD}{C.CYAN}{'='*60}")
    print(f"{C.BOLD}{C.WHITE}  BLIPHOOD AGENT SOLVER{C.CYAN}")
    print(f"{D}  Robinhood Testnet  |  Chain ID: 46630{C.CYAN}")
    print(f"{'='*60}{R}\n")

    if not PRIVATE_KEY:
        print(f"{E}ERROR{R}: Set BLIPHOOD_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) env var")
        sys.exit(1)

    _session = _requests.Session()
    _session.verify = False
    w3 = Web3(Web3.HTTPProvider(RPC_URL, session=_session))
    if not w3.is_connected():
        print(f"{E}ERROR{R}: Cannot connect to {c('val')}{RPC_URL}{R}")
        sys.exit(1)

    print(f"{D}Connected{R}   : {c('val')}{RPC_URL}{R}")
    print(f"{D}Chain ID{R}   : {c('val')}{w3.eth.chain_id}{R}  (expect {CHAIN_ID})")

    if w3.eth.chain_id != CHAIN_ID:
        print(f"{W}[WARN]{R}  WARNING: Chain ID mismatch -- wrong network?")

    wallet = w3.eth.account.from_key(PRIVATE_KEY)
    w3.middleware_onion.add(SignAndSendRawMiddlewareBuilder.build(wallet))
    w3.eth.default_account = wallet.address
    WALLET_ADDRESS = wallet.address
    print(f"{D}Wallet{R}     : {c('val')}{WALLET_ADDRESS}{R}")

    db.init_db()

    try:
        skill = load_skill()
        CONTRACT_ADDRESS = skill["contract_address"]
        current_seed = skill["seed"]
    except (FileNotFoundError, ValueError) as e:
        print(f"{E}ERROR{R}: {e}")
        sys.exit(1)

    print(f"{D}Contract{R}   : {c('val')}{CONTRACT_ADDRESS}{R}")
    print(f"{D}Seed (local){R}: {c('dim')}0x{current_seed.hex()}{R}")

    with open(ABI_PATH / "bliphood_v1_abi.json") as f:
        abi = json.load(f)

    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)

    onchain_seed = contract.functions.currentPuzzleSeed().call()
    if onchain_seed != current_seed:
        print(f"{c('sync')}[Sync]{R} Seed changed, updating skill.md")
        save_skill(onchain_seed, CONTRACT_ADDRESS)
        current_seed = onchain_seed

    global ZERO_PREFIX
    puzzle_bytes = contract.functions.PUZZLE_BYTE_PREFIX().call()
    ZERO_PREFIX = bytes(puzzle_bytes)
    print(f"{D}Difficulty{R} : {c('val')}{puzzle_bytes}{R} zero bytes ({puzzle_bytes * 8} bits)")

    eth_bal = w3.eth.get_balance(WALLET_ADDRESS)
    print(f"{c('eth')}ETH Balance{R}: {c('val')}{eth_bal / 1e18:.4f}{R} ETH")

    # Read on-chain mint cost
    onchain_cost = contract.functions.mintCost().call()
    global MINT_COST
    MINT_COST = max(MINT_COST, onchain_cost)
    print(f"{D}Mint cost{R}  : {c('val')}{Web3.from_wei(MINT_COST, 'ether')}{R} ETH")

    if eth_bal < MINT_COST:
        print(f"{E}ERROR{R}: Need >= {c('val')}{Web3.from_wei(MINT_COST, 'ether')}{R} ETH. Get ETH from Robinhood testnet faucet")
        sys.exit(1)

    blip_bal = contract.functions.balanceOf(WALLET_ADDRESS).call()
    print(f"{c('mint')}BLIPHD Balance{R}: {c('val')}{blip_bal / 1e18:,.0f}{R} BLIPHD")

    print(f"\n{c('solver')}[Solver]{R} Starting continuous puzzle solving loop ...")
    print(f"{D}Press Ctrl+C to stop.{R}\n")

    solve_count = 0
    error_count = 0
    round_num = 0
    nonce_offset = 0
    prev_seed = None
    actual_workers = num_workers if num_workers else max(1, mp.cpu_count() - 1)
    stride = actual_workers * 1_000_000

    S = c("solver"); RD = c("round"); F = c("fail")
    while True:
        if max_rounds and solve_count >= max_rounds:
            print(f"\n{S}[Solver]{R} {G}Done: {max_rounds} round(s) completed{R}. Total solves: {c('val')}{solve_count}{R}")
            sys.exit(0)

        try:
            current_seed = contract.functions.currentPuzzleSeed().call()

            skill = load_skill()
            if skill["seed"] != current_seed:
                save_skill(current_seed, CONTRACT_ADDRESS)

            if prev_seed is not None and current_seed != prev_seed:
                nonce_offset = 0
            prev_seed = current_seed

            round_num += 1
            print(f"\n{C.DIM}---{R} {RD}Round {c('val')}{round_num}{R} {C.DIM}---{R}")
            print(f"{RD}[Round]{R} Seed: {C.DIM}0x{current_seed.hex()}{R}")

            # Check ETH balance before mining
            eth_bal = w3.eth.get_balance(WALLET_ADDRESS)
            if eth_bal < MINT_COST:
                print(f"{RD}[Round]{R} {F}Insufficient ETH{R}: {c('val')}{eth_bal / 1e18:.4f}{R} ETH (need {c('val')}{Web3.from_wei(MINT_COST, 'ether')}{R})")
                print(f"{S}[Solver]{R} {W}Paused{R} — waiting 60s for wallet top-up...")
                time.sleep(60)
                continue

            solve_start = time.time()
            nonce = solve_puzzle_parallel(current_seed, ZERO_PREFIX, offset=nonce_offset, num_workers=num_workers)
            solve_ms = int((time.time() - solve_start) * 1000)

            if nonce is None:
                error_count += 1
                nonce_offset += stride
                print(f"{RD}[Round]{R} {F}No nonce found{R}. Error streak: {c('val')}{error_count}{R}/3")
                db.record_failure(
                    error_msg="no_nonce_found",
                    seed=current_seed.hex(),
                    round_num=round_num,
                    workers=actual_workers,
                )
                if error_count >= 3:
                    print(f"{S}[Solver]{R} {W}3 consecutive failures{R} -- pausing 60s")
                    time.sleep(60)
                    error_count = 0
                continue

            success, tx_hash, gas_used, actual_bliphd, actual_eth_spent = mint_bliphood(w3, contract, nonce, WALLET_ADDRESS)
            report_solve(WALLET_ADDRESS, solve_count + 1, nonce, solve_ms, gas_used, tx_hash)

            if success:
                solve_count += 1
                error_count = 0
                nonce_offset = 0

                db.record_solve(
                    nonce=nonce,
                    seed=current_seed.hex(),
                    solve_ms=solve_ms,
                    gas_used=gas_used,
                    tx_hash=tx_hash,
                    round_num=round_num,
                    workers=actual_workers,
                    bliphd_amount=actual_bliphd / 1e18,
                    eth_spent_wei=actual_eth_spent,
                )
                report_stats(WALLET_ADDRESS)
                new_blip_bal = contract.functions.balanceOf(WALLET_ADDRESS).call()
                new_eth_bal = w3.eth.get_balance(WALLET_ADDRESS)
                print(f"{RD}[Round]{R} {c('mint')}BLIPHD Balance{R}: {c('val')}{new_blip_bal / 1e18:,.0f}{R} BLIPHD")
                print(f"{RD}[Round]{R} {c('eth')}ETH Balance{R} : {c('val')}{new_eth_bal / 1e18:.4f}{R} ETH")
                print(f"{RD}[Round]{R} {G}Total solves{R} : {c('val')}{solve_count}{R}")
            else:
                error_count += 1
                nonce_offset += stride
                db.record_failure(
                    error_msg="mint_tx_failed",
                    seed=current_seed.hex(),
                    round_num=round_num,
                    workers=actual_workers,
                )
                print(f"{RD}[Round]{R} {F}Mint failed{R}. Error streak: {c('val')}{error_count}{R}")

            time.sleep(2)

        except KeyboardInterrupt:
            print(f"\n{S}[Solver]{R} {G}Stopped{R}. Total solves: {c('val')}{solve_count}{R}")
            sys.exit(0)
        except Exception as e:
            error_count += 1
            print(f"{RD}[Round]{R} {E}Unexpected error{R}: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
