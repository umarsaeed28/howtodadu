import { NextResponse } from "next/server";
import { listingsProviderName } from "@/lib/listings";
import { listingsCache } from "@/lib/listings/redfin";

export const maxDuration = 300;

/** Scheduled every 12 hours (vercel.json). Forces a fresh pull from Redfin. Send `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (listingsProviderName() !== "redfin") return NextResponse.json({ skipped: "LISTINGS_PROVIDER is not redfin" });
  try {
    const { value, fetchedAt } = await listingsCache.get(true);
    return NextResponse.json({ listings: value.length, fetchedAt: new Date(fetchedAt).toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refresh failed" }, { status: 502 });
  }
}
