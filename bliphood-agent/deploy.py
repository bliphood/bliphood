#!/usr/bin/env python3
"""
Deploy BlipHoodV1 to Robinhood Chain Testnet
Usage: python deploy.py
"""

import os
import json
import sys
import time
from pathlib import Path
from web3 import Web3
from web3.middleware import SignAndSendRawMiddlewareBuilder

# Load .env
ENV_PATH = Path(__file__).parent / ".env"
if ENV_PATH.exists():
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip("'\"")

_raw_key = os.getenv("BLIPHOOD_PRIVATE_KEY") or os.getenv("DEPLOYER_PRIVATE_KEY", "")
PRIVATE_KEY = _raw_key[2:] if _raw_key.startswith("0x") or _raw_key.startswith("0X") else _raw_key
RPC_URL = os.getenv("BLIPHOOD_RPC_URL", "https://rpc.testnet.chain.robinhood.com")
CHAIN_ID = int(os.getenv("BLIPHOOD_CHAIN_ID", "46630"))

if not PRIVATE_KEY:
    print("ERROR: Set BLIPHOOD_PRIVATE_KEY in .env")
    sys.exit(1)

# Load bytecode + ABI
BYTECODE = (Path(__file__).parent / "bliphood_v1.bin").read_text().strip()
ABI = json.loads((Path(__file__).parent / "bliphood_v1_abi.json").read_text())

w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    print(f"ERROR: Cannot connect to {RPC_URL}")
    sys.exit(1)

wallet = w3.eth.account.from_key(PRIVATE_KEY)
w3.middleware_onion.add(SignAndSendRawMiddlewareBuilder.build(wallet))
w3.eth.default_account = wallet.address

print(f"Deployer : {wallet.address}")
print(f"Balance  : {w3.eth.get_balance(wallet.address) / 1e18:.4f} ETH")
print(f"Chain    : {w3.eth.chain_id} (expect {CHAIN_ID})")

# Generate initial seed
import time
initial_seed = Web3.keccak(text=f"BLIPHOOD_GENESIS_{int(time.time())}")
print(f"Seed     : 0x{initial_seed.hex()}")

print("\nDeploying BlipHoodV1...")
contract = w3.eth.contract(abi=ABI, bytecode=f"0x{BYTECODE}")

# Estimate gas from constructor
try:
    gas_est = contract.constructor(wallet.address, initial_seed).estimate_gas({
        "from": wallet.address,
        "value": 0,
    })
    gas_limit = int(gas_est * 1.2)
    print(f"Gas est : {gas_est} -> limit {gas_limit}")
except Exception as e:
    print(f"Gas estimation failed: {e}, using default")
    gas_limit = 3_000_000

# Use legacy gas pricing for lower fees
gas_price = w3.eth.gas_price
print(f"Gas price: {w3.from_wei(gas_price, 'gwei'):.2f} gwei")

receipt = None
max_retries = 10
for attempt in range(max_retries):
    try:
        tx = contract.constructor(wallet.address, initial_seed).transact({
            "gas": gas_limit,
            "gasPrice": gas_price,
        })
        print(f"Tx hash  : {tx.hex()}")
        print("  Waiting for confirmation...")
        receipt = None
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx, timeout=600)
        except Exception:
            print("  Still pending, polling every 30s...")
            for _ in range(20):
                time.sleep(30)
                try:
                    receipt = w3.eth.get_transaction_receipt(tx)
                    if receipt: break
                except Exception:
                    pass
        if not receipt:
            print("ERROR: Transaction stuck after 10+ min.")
            print(f"Track manually: https://testnet.explorer.chain.robinhood.com/tx/{tx.hex()}")
            sys.exit(1)
        break
    except Exception as e:
        err = str(e)
        if "txpool" in err.lower() or "full" in err.lower():
            wait = 2 ** attempt
            print(f"  Txpool full, retry {attempt+1}/{max_retries} in {wait}s...")
            time.sleep(wait)
        else:
            raise
else:
    print("ERROR: All retries exhausted — txpool still full. Try again later.")
    sys.exit(1)

if not receipt:
    print("ERROR: No receipt. Deploy may have failed.")
    sys.exit(1)

addr = receipt["contractAddress"]

print(f"\n{'='*50}")
print(f" DEPLOYED: {addr}")
print(f"{'='*50}\n")
print(f"Seed     : 0x{initial_seed.hex()}")
print(f"Payment  : Native ETH (payable)")
print(f"Owner    : {wallet.address}")

# Verify deployment
bliphood = w3.eth.contract(address=addr, abi=ABI)
diff = bliphood.functions.PUZZLE_BYTE_PREFIX().call()
amount = bliphood.functions.currentMintAmount().call()
enabled = bliphood.functions.mintingEnabled().call()

print(f"Difficulty: {diff} zero bytes")
print(f"Mint amount: {Web3.from_wei(amount, 'ether')} BLIPHD")
print(f"Minting: {'enabled' if enabled else 'disabled'}")

# Save deployment info
deploy_info = {
    "address": addr,
    "deployer": wallet.address,
    "seed": "0x" + initial_seed.hex(),
    "chainId": CHAIN_ID,
    "deployedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
(Path(__file__).parent / "deploy.json").write_text(json.dumps(deploy_info, indent=2))
print(f"\nSaved to deploy.json")

# Update dashboard .env.local
dashboard_env = Path(__file__).parent.parent / "bliphood-dashboard-v2" / ".env.local"
if dashboard_env.parent.exists():
    try:
        content = dashboard_env.read_text(encoding="utf-8")
        if "NEXT_PUBLIC_CONTRACT_ADDRESS" not in content:
            content += f"\nNEXT_PUBLIC_CONTRACT_ADDRESS={addr}\n"
            dashboard_env.write_text(content)
            print("Updated dashboard .env.local")
    except Exception:
        pass

# Update skill.md
skill_path = Path(__file__).parent / "skill.md"
if skill_path.exists():
    content = skill_path.read_text(encoding="utf-8", errors="replace")
    # Replace seed line
    import re
    content = re.sub(r"\*\*Seed:\*\* 0x[a-fA-F0-9]{64}", f"**Seed:** 0x{initial_seed.hex()}", content)
    skill_path.write_text(content)
    print("Updated skill.md with new contract address + seed")
