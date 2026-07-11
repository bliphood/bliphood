"use client";

import { useAccount, useConnect } from "wagmi";
import { SectionNumber } from "@/components/Layout/SectionNumber";
import { PuzzleCanvas } from "./PuzzleCanvas";

export function Hero() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <SectionNumber section="01" />
      <PuzzleCanvas />

      {/* Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 w-full py-32">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-live" />
            <span className="font-mono text-xs text-accent tracking-[0.3em] uppercase">Robinhood Testnet · Now Live</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] leading-[0.85] text-white mb-6">
            SOLVE THE
            <br />
            <span className="text-accent">PUZZLE.</span>
            <br />
            CLAIM THE REWARD.
          </h1>

          {/* Subheadline */}
          <p className="font-mono text-sm text-white/40 max-w-lg mb-10 leading-relaxed">
            Proof-of-Work puzzle mining protocol. Find the nonce that cracks a keccak256
            zero-prefix hash, mint BLIPHD tokens directly to your wallet. 
            Adaptive difficulty ensures fair distribution across all eras.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            {!isConnected ? (
              <button
                onClick={() => {
                  const c = connectors[0];
                  if (c) connect({ connector: c });
                }}
                className="font-mono text-sm font-bold uppercase tracking-wider bg-accent text-black px-8 py-4 rounded-sm hover:bg-accent-dim transition-colors flex items-center gap-3 group"
              >
                CONNECT WALLET
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <a
                href="/wallet"
                className="font-mono text-sm font-bold uppercase tracking-wider bg-accent text-black px-8 py-4 rounded-sm hover:bg-accent-dim transition-colors"
              >
                VIEW DASHBOARD
              </a>
            )}
            <a
              href="/leaderboard"
              className="font-mono text-sm font-bold uppercase tracking-wider border border-white/10 text-white px-8 py-4 rounded-sm hover:border-accent/30 hover:text-accent transition-all"
            >
              LEADERBOARD
            </a>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-12 border-t border-white/5">
            {[
              { value: "1,000,000,000", label: "MAX SUPPLY", accent: false },
              { value: "20,000", label: "REWARD / SOLVE", accent: false },
              { value: "4", label: "HALVING ERAS", accent: false },
              { value: "3-8", label: "ZERO BYTE DIFFICULTY", accent: true },
            ].map((stat) => (
              <div key={stat.label}>
                <p className={`font-display text-3xl md:text-4xl leading-none mb-1 ${stat.accent ? "text-accent" : "text-white"}`}>
                  {stat.value}
                </p>
                <p className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="font-mono text-[10px] text-white/10 tracking-[0.3em] uppercase">SCROLL</span>
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none" className="text-white/10">
          <rect x="0.5" y="0.5" width="11" height="19" rx="5.5" stroke="currentColor" />
          <circle cx="6" cy="6" r="2" fill="currentColor" className="animate-pulse-live" />
        </svg>
      </div>
    </section>
  );
}
