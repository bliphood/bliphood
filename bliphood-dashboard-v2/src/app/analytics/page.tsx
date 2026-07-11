import { Metadata } from "next";
import { AnalyticsPage } from "@/components/Analytics/AnalyticsPage";

export const metadata: Metadata = {
  title: "ANALYTICS — BlipHood",
  description: "On-chain mining data, difficulty trends, and supply progression charts.",
};

export default function Page() {
  return <AnalyticsPage />;
}
