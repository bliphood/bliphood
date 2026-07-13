import urllib3, ssl, requests, time, json, sys
urllib3.disable_warnings()

endpoints = [
    "https://robinhood-testnet.g.alchemy.com/v2/demo",
    "https://rpc.testnet.chain.robinhood.com",
    "https://rpc.robinhood-testnet.quiknode.pro",
    "https://robinhood-testnet.drpc.org",
    "https://robinhood-testnet.rpc.siliconbackend.com",
    "https://46630.rpc.thirdweb.com",
    "https://robinhood-testnet.rpc.blxrbdn.com",
]

session = requests.Session()
session.verify = False
session.timeout = 8

for ep in endpoints:
    try:
        r = session.post(ep, json={"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1})
        if r.status_code == 200:
            data = r.json()
            if "result" in data:
                block = int(data["result"], 16)
                print(f"OK  [{block}] {ep}")
            else:
                print(f"ERR {r.status_code} {ep}: {str(data)[:100]}")
        else:
            print(f"ERR {r.status_code} {ep}: {r.text[:100]}")
    except Exception as e:
        print(f"FAIL {type(e).__name__} {ep}: {e}")
