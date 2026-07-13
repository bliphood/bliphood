import json, sys, os, time
sys.path.insert(0, ".")

# Load .env
with open(".env") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip("'\"")

from web3 import Web3
import requests, urllib3
urllib3.disable_warnings()

RPC = os.getenv("BLIPHOOD_RPC_URL", "https://46630.rpc.thirdweb.com")
session = requests.Session()
session.verify = False

w3 = Web3(Web3.HTTPProvider(RPC, session=session))
print(f"RPC: {RPC}")
print(f"Connected: {w3.is_connected()}")
print(f"Chain ID: {w3.eth.chain_id}")

with open("bliphood_v1_abi.json") as f:
    abi = json.load(f)

contract = w3.eth.contract(address="0x08f8C4aeb91c1881385C6922641A501d68bA9575", abi=abi)

seed = contract.functions.currentPuzzleSeed().call()
diff = contract.functions.currentDifficulty().call()
minting = contract.functions.mintingEnabled().call()
mint_amt = contract.functions.currentMintAmount().call()
mint_cost = contract.functions.mintCost().call()
remaining = contract.functions.remainingSupply().call()

print(f"Seed: 0x{seed.hex()}")
print(f"Difficulty: {diff} zero bytes")
print(f"Minting: {minting}")
print(f"Mint Amount: {mint_amt / 1e18:,.0f} BLIPHD")
print(f"Mint Cost: {Web3.from_wei(mint_cost, 'ether')} ETH")
print(f"Remaining: {remaining / 1e18:,.0f} BLIPHD")

# Check wallet
addr = "0x608072175aC8e7D8c54A14C392b3BafEDce85D67"
eth = w3.eth.get_balance(addr)
blip = contract.functions.balanceOf(addr).call()
print(f"\nWallet: {addr}")
print(f"ETH: {Web3.from_wei(eth, 'ether')} ETH")
print(f"BLIPHD: {blip / 1e18:,.0f}")

# Update skill.md seed
import re
with open("skill.md", "r") as f:
    content = f.read()
content = re.sub(r"\*\*Seed:\*\*.*", f"**Seed:** 0x{seed.hex()}", content)
with open("skill.md", "w") as f:
    f.write(content)
print("\nskill.md updated")
