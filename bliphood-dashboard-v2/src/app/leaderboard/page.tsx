import { Metadata } from "next";
import { LeaderboardPage } from "@/components/Leaderboard/LeaderboardPage";

export const metadata: Metadata = {
  title: "LEADERBOARD — BlipHood",
  description: "Miner rankings by total solves, streak count, and solve speed.",
};

export default function Page() {
  return <LeaderboardPage />;
}
