"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

let _sharedES: EventSource | null = null;
let _sharedRefs = 0;
let _sharedStopped = false;

function sharedConnect(onSolve: (data: any) => void, onConnected: () => void, onDisconnected: () => void) {
  _sharedStopped = false;
  const es = new EventSource("/api/sse");
  _sharedES = es;

  es.onopen = () => {
    onConnected();
  };

  es.onerror = () => {
    onDisconnected();
    es.close();
    _sharedES = null;
    if (!_sharedStopped) {
      setTimeout(() => sharedConnect(onSolve, onConnected, onDisconnected), 3000);
    }
  };

  es.addEventListener("solve", (e: MessageEvent) => {
    try {
      onSolve(JSON.parse(e.data));
    } catch { /* ignore */ }
  });

  return es;
}

function sharedClose() {
  _sharedStopped = true;
  if (_sharedES) {
    _sharedES.close();
    _sharedES = null;
  }
}

export function useSSE<T>() {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const prevConnected = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    _sharedRefs++;

    const onSolve = (parsed: any) => {
      setData((prev) => {
        if (prev.some((item: any) => item.txHash && item.txHash === parsed.txHash)) return prev;
        return [parsed as unknown as T, ...prev].slice(0, 100);
      });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["puzzle"] });
    };

    const onConnected = () => {
      setConnected(true);
      if (!prevConnected.current) {
        prevConnected.current = true;
        fetch("/api/recent")
          .then((r) => r.json())
          .then((res) => {
            if (_sharedStopped) return;
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

    const onDisconnected = () => {
      prevConnected.current = false;
      setConnected(false);
    };

    if (!_sharedES) {
      sharedConnect(onSolve, onConnected, onDisconnected);
    }

    return () => {
      _sharedRefs--;
      if (_sharedRefs <= 0) {
        sharedClose();
      }
    };
  }, [queryClient]);

  const clearData = useCallback(() => setData([]), []);

  return { data, connected, clearData };
}

export function useCountUp(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let rafId = 0;
    let start = 0;
    const step = () => {
      start += 16;
      const progress = Math.min(start / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}
