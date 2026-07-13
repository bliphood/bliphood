"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE<T>() {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const prevConnected = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/sse");

      es.onopen = () => {
        setConnected(true);
        if (!prevConnected.current) {
          prevConnected.current = true;
          fetch("/api/recent")
            .then((r) => r.json())
            .then((res) => {
              if (stopped) return;
              const recent = ((res.activity || []) as any[]).map((item: any) => ({
                wallet: item.wallet || "",
                amount: item.amount || 20000,
                nonce: item.nonce || 0,
                timestamp: item.timestamp || Math.floor((item.time || Date.now()) / 1000),
                txHash: item.txHash || "",
                difficulty: item.difficulty || 3,
                solveTimeMs: item.solveTimeMs || item.solveMs || 0,
                isJackpot: item.isJackpot || false,
              })) as unknown as T[];
              if (recent.length > 0) {
                setData((prev) => {
                  const existing = new Set(prev.map((item: any) => item.txHash || item.time));
                  const merged = [...recent.filter((item: any) => !existing.has(item.txHash || item.time)), ...prev];
                  return merged.slice(0, 100);
                });
              }
            })
            .catch(() => {});
        }
      };

      es.onerror = () => {
        prevConnected.current = false;
        setConnected(false);
        es?.close();
        es = null;
        setTimeout(connect, 3000);
      };

      es.addEventListener("solve", (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          setData((prev) => {
            if (prev.some((item: any) => item.txHash && item.txHash === parsed.txHash)) return prev;
            return [parsed, ...prev].slice(0, 100);
          });
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["puzzle"] });
        } catch { /* ignore */ }
      });

      es.addEventListener("stats", (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          setData((prev) => {
            const idx = prev.findIndex((item: any) => item.wallet === parsed.wallet && item.nonce === parsed.nonce);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...parsed };
            return updated;
          });
        } catch { /* ignore */ }
      });
    };

    connect();

    return () => {
      stopped = true;
      es?.close();
    };
  }, [queryClient]);

  const clearData = useCallback(() => setData([]), []);

  return { data, connected, clearData };
}

export function useCountUp(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = 0;
    const step = () => {
      start += 16;
      const progress = Math.min(start / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}
