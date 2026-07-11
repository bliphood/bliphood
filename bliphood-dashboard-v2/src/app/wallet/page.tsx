import { Metadata } from "next";
import { WalletDashboard } from "@/components/Wallet/WalletDashboard";

export const metadata: Metadata = {
  title: "WALLET — BlipHood",
  description: "Your personal mining dashboard — stats, solve history, and jackpot wins.",
};

export default function Page() {
  return <WalletDashboard />;
}
