"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  if (!mounted) {
    return (
      <button
        className="font-mono text-xs font-semibold uppercase tracking-wider bg-accent text-black px-4 py-2 rounded-sm hover:bg-accent-dim transition-colors"
        disabled
      >
        CONNECT WALLET
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-white/40 bg-dark-400 px-3 py-1.5 rounded-sm border border-white/5">
          {shortAddr}
        </span>
        <button
          onClick={() => {
            disconnect();
          }}
          className="font-mono text-xs text-white/30 hover:text-danger transition-colors uppercase px-2"
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const connector = connectors[0];
        if (connector) connect({ connector });
      }}
      className="font-mono text-xs font-semibold uppercase tracking-wider bg-accent text-black px-4 py-2 rounded-sm hover:bg-accent-dim transition-colors"
    >
      CONNECT WALLET
    </button>
  );
}
