import { NextResponse } from "next/server";
import { listingsProviderName } from "@/lib/listings";
import { listingsCache } from "@/lib/listings/redfin";
import { dealMachineCache } from "@/lib/listings/dealmachine";

export const maxDuration = 300;

/** Scheduled every 2 days at 19:00 UTC, 11am Pacific standard time (see the schedule in vercel.json: every other day of the month). Forces a fresh pull from the live listings source. Send `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const name = listingsProviderName();
  const cache = name === "dealmachine" ? dealMachineCache : name === "redfin" ? listingsCache : null;
  if (!cache) return NextResponse.json({ skipped: `LISTINGS_PROVIDER ${name} has nothing to refresh` });
  try {
    const { value, fetchedAt } = await cache.get(true);
    return NextResponse.json({ listings: value.length, fetchedAt: new Date(fetchedAt).toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refresh failed" }, { status: 502 });
  }
}
