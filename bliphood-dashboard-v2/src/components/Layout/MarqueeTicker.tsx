"use client";

import { useEffect, useState } from "react";

interface Activity {
  wallet: string;
  nonce: number;
  solveMs: number;
  time: number;
}

function generatePlaceholder(): Activity[] {
  const items: Activity[] = [];
  const sMul = 214013;
  const sAdd = 2531011;
  let seed = Date.now() & 0x7fffffff;
  const rand = () => { seed = (seed * sMul + sAdd) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let i = 0; i < 12; i++) {
    const chars = "0123456789abcdef";
    let addr = "0x";
    for (let j = 0; j < 40; j++) addr += chars[Math.floor(rand() * 16)];
    items.push({
      wallet: addr.slice(0, 6) + "..." + addr.slice(-4),
      nonce: Math.floor(rand() * 9000000000) + 1000000000,
      solveMs: Math.floor(rand() * 120000) + 5000,
      time: Date.now() - Math.floor(rand() * 60000),
    });
  }
  return items;
}

export function MarqueeTicker() {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    setItems(generatePlaceholder());
    const fetchData = async () => {
      try {
        const res = await fetch("/api/recent");
        const data = await res.json();
        if (data.activity?.length) {
          setItems(data.activity);
        }
      } catch { /* keep placeholders */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) {
    return <div className="fixed top-16 left-0 right-0 z-40 bg-dark-200 border-b border-white/5 h-7" />;
  }

  const doubled = [...items, ...items];

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-dark-200 border-b border-white/5 h-7 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-4 px-6 text-[11px] font-mono text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-live" />
            <span className="text-accent font-semibold">SOLVE</span>
            <span className="text-white/50">{item.wallet}</span>
            <span className="text-white/20">NONCE</span>
            <span className="text-white/40">{item.nonce.toLocaleString()}</span>
            <span className="text-white/20">TIME</span>
            <span className="text-white/40">{(item.solveMs / 1000).toFixed(1)}s</span>
            <span className="text-white/10">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}
