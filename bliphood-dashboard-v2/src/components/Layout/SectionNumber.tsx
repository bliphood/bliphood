"use client";

import { useEffect, useState } from "react";

export function SectionNumber({ section }: { section: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-30 hidden lg:flex">
      <span className="font-mono text-[10px] text-accent font-semibold tracking-[0.3em] uppercase rotate-90 origin-center whitespace-nowrap">
        SECTION
      </span>
      <div className="w-px h-8 bg-white/10" />
      <span className="font-display text-4xl text-white/15 leading-none">
        {section}
      </span>
    </div>
  );
}
