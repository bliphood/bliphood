import Link from "next/link";

const FOOTER_COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "PROTOCOL",
    links: [
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Analytics", href: "/analytics" },
      { label: "Live Monitor", href: "/#live" },
      { label: "Wallet", href: "/wallet" },
    ],
  },
  {
    title: "DEVELOPERS",
    links: [
      { label: "Smart Contract", href: "https://explorer.testnet.chain.robinhood.com/address/0x08f8C4aeb91c1881385C6922641A501d68bA9575" },
      { label: "GitHub", href: "https://github.com/bliphood/bliphood" },
    ],
  },
  {
    title: "COMMUNITY",
    links: [
      { label: "Twitter", href: "https://x.com" },
      { label: "Discord", href: "https://discord.com" },
      { label: "Telegram", href: "https://telegram.org" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dark-100">
      <div className="max-w-[1440px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.svg" alt="BlipHood" className="w-6 h-6" />
            <span className="font-display text-xl tracking-wider text-white">BLIPHOOD</span>
          </div>
          <p className="text-xs text-white/30 leading-relaxed max-w-xs">
            INSTITUTIONAL-GRADE PUZZLE MINING PROTOCOL. SOLVE. MINT. STREAK.
          </p>
        </div>

        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-mono text-[10px] text-white/20 uppercase tracking-[0.2em] mb-4">{col.title}</h4>
            <div className="space-y-2">
              {col.links.map((link) => (
                link.href.startsWith("http") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-white/50 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-white/50 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="font-mono text-[10px] text-white/20">© 2024 BLIPHOOD PROTOCOL</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-live" />
            <span className="font-mono text-[10px] text-white/20">NETWORK LIVE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
