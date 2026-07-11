"use client";

import { useEffect, useState, useCallback } from "react";

export function useSSE<T>() {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/sse");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("solve", (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        setData((prev) => [parsed, ...prev].slice(0, 100));
      } catch { /* ignore */ }
    });

    es.addEventListener("stats", (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        setData((prev) => {
          const updated = [...prev];
          if (updated.length > 0) updated[0] = { ...updated[0], ...parsed };
          return updated;
        });
      } catch { /* ignore */ }
    });

    return () => { es.close(); };
  }, []);

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
