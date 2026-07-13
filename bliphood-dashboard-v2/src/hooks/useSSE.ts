"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

let _pollingRefs = 0;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _connected = false;

function startPolling(cb: () => void) {
  _pollingRefs++;
  if (_pollTimer) return;
  _connected = true;
  const poll = async () => {
    try {
      await cb();
    } catch { /* */ }
  };
  poll();
  _pollTimer = setInterval(poll, 5000);
}

function stopPolling() {
  _pollingRefs--;
  if (_pollingRefs <= 0 && _pollTimer) {
    _connected = false;
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

export function useSSE<T>() {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch("/api/recent");
        if (!res.ok) return;
        const json = await res.json();
        if (!connectedRef.current) {
          connectedRef.current = true;
          setConnected(true);
          const recent = ((json.activity || []) as any[]).map((item: any) => ({
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
            setData(recent.slice(0, 100));
          }
          return;
        }
        const items = ((json.activity || []) as any[]).map((item: any) => ({
          wallet: item.wallet || "",
          amount: item.amount || 20000,
          nonce: item.nonce || 0,
          timestamp: item.timestamp || Math.floor((item.time || Date.now()) / 1000),
          txHash: item.txHash || "",
          difficulty: item.difficulty || 3,
          solveTimeMs: item.solveTimeMs || item.solveMs || 0,
          isJackpot: item.isJackpot || false,
        })) as unknown as T[];
        if (items.length > 0) {
          setData((prev) => {
            const existing = new Set(prev.map((item: any) => item.txHash || item.time));
            const merged = [...items.filter((item: any) => !existing.has(item.txHash || item.time)), ...prev];
            return merged.slice(0, 100);
          });
        }
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["puzzle"] });
      } catch {
        setConnected(false);
        connectedRef.current = false;
      }
    };

    startPolling(fetchRecent);
    return () => stopPolling();
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
