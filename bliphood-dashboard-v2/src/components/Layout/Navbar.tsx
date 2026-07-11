"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { ConnectWallet } from "./ConnectWallet";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/wallet", label: "Wallet" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <img src="/logo.svg" alt="BlipHood" className="w-8 h-8" />
          <span className="font-display text-2xl tracking-wider text-white">BLIPHOOD</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium transition-colors uppercase tracking-wider ${pathname === item.href ? "text-accent" : "text-white/60 hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}

          <div className="w-px h-5 bg-white/10 mx-2" />

          <NotificationBell />
          <ConnectWallet />
        </div>

        <button
          onClick={() => setMobileOpen((p) => !p)}
          className="lg:hidden flex flex-col gap-1.5 p-2"
          aria-label="Menu"
        >
          <span className={`block w-5 h-px bg-white transition-transform ${mobileOpen ? "rotate-45 translate-y-[5px]" : ""}`} />
          <span className={`block w-5 h-px bg-white transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-px bg-white transition-transform ${mobileOpen ? "-rotate-45 -translate-y-[5px]" : ""}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-dark-200 border-b border-white/5 animate-fade-in">
          <div className="px-6 py-6 space-y-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-lg font-medium uppercase tracking-wider ${pathname === item.href ? "text-accent" : "text-white/60"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
              <NotificationBell />
              <ConnectWallet />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
