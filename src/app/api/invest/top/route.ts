import { NextResponse } from "next/server";
import { getInvestFeed } from "@/lib/server/invest";

/** GET /api/invest/top?limit=3: the best opportunities for the home page section. */
export async function GET(req: Request) {
  const limit = Math.min(6, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 3));
  try {
    const feed = await getInvestFeed();
    return NextResponse.json({ generatedAt: feed.generatedAt, source: feed.source, opportunities: feed.opportunities.filter((o) => o.topPick).slice(0, limit) });
  } catch {
    return NextResponse.json({ generatedAt: null, opportunities: [] });
  }
}
