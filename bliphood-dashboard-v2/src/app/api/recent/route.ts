import { NextResponse } from "next/server";
import { getActivityLog } from "@/lib/store";
import { getProvider, getContract, shortAddr } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = getActivityLog();
  const txHashes = new Set(log.map((e) => e.txHash));

  // Query on-chain Transfer(0x0, to, amount) = mint events as fallback
  try {
    const p = getProvider();
    const c = getContract();
    const current = await p.getBlockNumber();
    const fromBlock = Math.max(current - 100, 89410651);

    for (let f = fromBlock; f <= current; f += 11) {
      const to = Math.min(f + 10, current);
      try {
        const events = await c.queryFilter(
          c.filters.Transfer("0x0000000000000000000000000000000000000000", null, null),
          f,
          to
        );
        for (const e of events) {
          const evt = e as ethers.EventLog;
          const txHash = evt.transactionHash;
          if (txHashes.has(txHash)) continue;
          txHashes.add(txHash);

          const block = await p.getBlock(evt.blockNumber);
          log.unshift({
            wallet: shortAddr(evt.args[1]),
            totalSolves: 0,
            nonce: 0,
            solveMs: 0,
            gasUsed: 0,
            txHash,
            time: (block?.timestamp || 0) * 1000,
          });
        }
      } catch { /* skip batch */ }
    }
  } catch { /* */ }

  return NextResponse.json({ activity: log.slice(-30).reverse() });
}
