import { NextResponse } from "next/server";
import { getInvestFeed } from "@/lib/server/invest";
import { bestOpportunities, toTile } from "@/lib/invest/opportunity";
import { adminOnly } from "@/lib/admin/gate";

/** GET /api/invest/top?limit=3: the best opportunities for the home page section. */
export async function GET(req: Request) {
  const denied = await adminOnly(req); // lot data is admin-only (src/lib/admin/gate.ts)
  if (denied) return denied;
  const limit = Math.min(6, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 3));
  try {
    const feed = await getInvestFeed();
    return NextResponse.json({ generatedAt: feed.generatedAt, source: feed.source, opportunities: bestOpportunities(feed.opportunities, limit).map(toTile) });
  } catch {
    return NextResponse.json({ generatedAt: null, opportunities: [] });
  }
}
