"use client";

import { Hero } from "@/components/Hero/Hero";
import { Leaderboard } from "@/components/Leaderboard/Leaderboard";
import { AnalyticsCharts } from "@/components/Analytics/AnalyticsCharts";
import { LiveMonitor } from "@/components/Live/LiveMonitor";
import { useState, useEffect, useRef } from "react";

export function HomePage() {
  const [activeSection, setActiveSection] = useState("01");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sections = document.querySelectorAll("[data-section]");
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          setActiveSection(visible.target.getAttribute("data-section") || "01");
        }
      },
      { threshold: 0.3 }
    );
    sections.forEach((s) => observerRef.current?.observe(s));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <>
      <div data-section="01" id="top">
        <Hero />
      </div>
      <div data-section="02" id="leaderboard">
        <Leaderboard />
      </div>
      <div data-section="03" id="analytics">
        <AnalyticsCharts />
      </div>
      <div data-section="05" id="live">
        <LiveMonitor />
      </div>

      {/* Fixed section indicator */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-4">
        {["01", "02", "03", "05"].map((num) => (
          <a
            key={num}
            href={`#${num === "01" ? "top" : num === "02" ? "leaderboard" : num === "03" ? "analytics" : "live"}`}
            className={`font-mono text-xs transition-all ${
              activeSection === num ? "text-accent scale-125" : "text-white/15 hover:text-white/40"
            }`}
          >
            {num}
          </a>
        ))}
        <div className="w-px h-12 bg-white/5" />
      </div>
    </>
  );
}
