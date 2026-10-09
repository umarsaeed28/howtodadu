import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getListingsProvider } from "@/lib/listings";
import { isForSale } from "@/lib/listings/status";
import { computeFeed, storeSnapshot } from "@/lib/server/invest";

export const maxDuration = 300;

/**
 * The Invest feed's daily run (vercel.json: 15:00 UTC, 7 or 8am in Seattle). Re-runs the pipeline, stores the day's
 * snapshot, then checks every watched opportunity: a new price flags "price_changed", a listing gone from the
 * market flags "off_market". Needs the CRON_SECRET bearer token, like the other cron routes.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const feed = await computeFeed();
    const stored = await storeSnapshot(feed);
    const alerts = await checkWatchlist(new Map(feed.opportunities.map((o) => [o.id, o.price])));
    return NextResponse.json({ opportunities: feed.opportunities.length, source: feed.source, stored, alerts });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invest run failed" }, { status: 502 });
  }
}

async function checkWatchlist(prices: Map<string, number>): Promise<number> {
  const db = supabaseAdmin();
  if (!db) return 0;
  const { data: rows, error } = await db.from("watchlist").select("id, listing_id, snapshot, alert").eq("status", "watching");
  if (error || !rows) return 0;
  let flagged = 0;
  for (const r of rows as { id: string; listing_id: string; snapshot: { price?: number }; alert: string | null }[]) {
    let price = prices.get(r.listing_id) ?? null;
    let onMarket = price != null;
    if (!onMarket) {
      // Not in today's feed: it may still be listed but fall outside the screen, so ask the source.
      const l = await getListingsProvider().getById(r.listing_id).catch(() => null);
      onMarket = !!l && isForSale(l.status);
      price = l?.listPrice ?? null;
    }
    const alert = !onMarket ? "off_market" : price != null && r.snapshot?.price != null && price !== r.snapshot.price ? "price_changed" : null;
    if (alert && alert !== r.alert) {
      await db.from("watchlist").update({ alert, updated_at: new Date().toISOString() }).eq("id", r.id);
      flagged++;
    }
  }
  return flagged;
}
