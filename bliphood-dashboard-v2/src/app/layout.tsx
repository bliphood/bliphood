import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers/Providers";
import { AppProvider } from "@/components/Providers/AppProvider";
import { Layout } from "@/components/Layout/Layout";

export const metadata: Metadata = {
  title: "BLIPHOOD — Puzzle Mining Protocol",
  description: "Proof-of-Work puzzle mining protocol. Solve keccak256 zero-prefix hashes, mint BLIPHD tokens.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "BLIPHOOD — Puzzle Mining Protocol",
    description: "Solve the puzzle. Claim the reward. Institutional-grade PoW mining on-chain.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-off-white font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <AppProvider>
            <Layout>{children}</Layout>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
