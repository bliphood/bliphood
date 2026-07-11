import { Metadata } from "next";
import { LiveMonitor } from "@/components/Live/LiveMonitor";

export const metadata: Metadata = {
  title: "LIVE — BlipHood",
  description: "Real-time puzzle state, difficulty, and live solve feed via SSE.",
};

export default function Page() {
  return <LiveMonitor />;
}
