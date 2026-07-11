import { Navbar } from "./Navbar";
import { MarqueeTicker } from "./MarqueeTicker";
import { Footer } from "./Footer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="noise-bg min-h-screen bg-black">
      <Navbar />
      <MarqueeTicker />
      <main className="pt-[92px]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
