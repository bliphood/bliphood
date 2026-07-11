import { NextResponse } from "next/server";
import { getActivityLog } from "@/lib/store";

export async function GET() {
  const log = getActivityLog();
  return NextResponse.json({ activity: log.slice(-30).reverse() });
}
