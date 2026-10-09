import { supabaseAdmin } from "@/utils/supabase/admin";
import { DEFAULT_ASSUMPTIONS, mergeAssumptions, type InvestAssumptions } from "@/lib/invest/assumptions";
import { buildOpportunity, rankOpportunities, type Opportunity } from "@/lib/invest/opportunity";
import { screenListings } from "@/lib/server/screened-listings";
import { libraryAvailable } from "@/lib/server/lot-library-store";
import { aerialPhoto, propertyPhoto } from "@/lib/property-image";

/**
 * The Invest feed on the server.
 *
 * Pipeline (the daily job is /api/cron/invest):
 * 1. Pull active listings. TODO(idx): today these come from the configured listings provider (LISTINGS_PROVIDER);
 *    switch to the MLS/IDX feed when it is integrated.
 * 2. Screen each one against the lot library, which already ran the parcel through the engine (eligibility, max
 *    DADU sf, buildable envelope), and the buy box.
 * 3. Underwrite with the assumptions admins set in /admin/invest.
 * 4. Rank by cash-on-cash ROI; the top five eligible ones are Top Picks, and the feed shows those five.
 * 5. Store the day's snapshot so tiles show "as of" and the next run can flag price changes and delistings.
 */
export interface InvestFeed {
  generatedAt: string;
  source: string;
  connected: boolean;
  /** True when the feed comes from the stored daily snapshot rather than a live run. */
  fromSnapshot: boolean;
  opportunities: Opportunity[];
}

/** The admins' assumptions, or the defaults when none are stored (or the table is not there yet). */
export async function getInvestAssumptions(): Promise<{ assumptions: InvestAssumptions; stored: boolean }> {
  const db = supabaseAdmin();
  if (!db) return { assumptions: DEFAULT_ASSUMPTIONS, stored: false };
  try {
    const { data, error } = await db.from("invest_settings").select("data").eq("id", 1).maybeSingle();
    if (error || !data) return { assumptions: DEFAULT_ASSUMPTIONS, stored: false };
    return { assumptions: mergeAssumptions(data.data), stored: true };
  } catch {
    return { assumptions: DEFAULT_ASSUMPTIONS, stored: false };
  }
}

/** Up to five images: the listing's photos, then street-level and aerial imagery of the lot to fill the set. */
function photoSet(listing: string[], address: string, lat: number, lng: number): string[] {
  const set = [...listing];
  const street = propertyPhoto(address, lat, lng);
  if (street && !street.includes("arcgisonline") && !set.includes(street)) set.push(street);
  set.push(aerialPhoto(lat, lng), aerialPhoto(lat, lng, 0.0022));
  return [...new Set(set)].slice(0, 5);
}

/** Seattle's calendar day, so "today" turns over at local midnight. */
export const seattleDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

/** Runs the pipeline now. */
export async function computeFeed(): Promise<InvestFeed> {
  const generatedAt = new Date().toISOString();
  if (!libraryAvailable()) return { generatedAt, source: "none", connected: false, fromSnapshot: false, opportunities: [] };
  const [{ assumptions }, screened] = await Promise.all([getInvestAssumptions(), screenListings()]);
  const opportunities = rankOpportunities(
    screened.listings
      .filter((l) => !l.pending && l.price > 0) // under contract is not an opportunity
      .map((l) =>
        buildOpportunity(
          {
            id: l.mlsId, address: l.address, zip: l.zip, lat: l.lat, lng: l.lng, price: l.price, photo: l.photo, photos: photoSet(l.photos, l.address, l.lat, l.lng), beds: l.beds, baths: l.baths,
            sqft: l.sqft, lotSqft: l.lotSqft, daysOnMarket: l.daysOnMarket, pin: l.pin, score: l.score, tier: l.tier, alley: l.alley, corner: l.corner,
            lotWidth: l.lot.lotWidth, lotDepth: l.lot.lotDepth, sideClearanceFt: l.lot.sideClearanceFt, daduSqft: l.daduSqft, brokerage: l.brokerage, listingUrl: l.listingUrl,
          },
          assumptions,
        ),
      ),
  );
  return { generatedAt, source: screened.source, connected: screened.connected, fromSnapshot: false, opportunities };
}

/** Stores the feed as today's snapshot. Quietly does nothing when Supabase or the table is missing. */
export async function storeSnapshot(feed: InvestFeed): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  const { error } = await db.from("invest_snapshots").upsert({ day: seattleDay(new Date(feed.generatedAt)), generated_at: feed.generatedAt, source: feed.source, data: feed.opportunities });
  if (error) console.warn("[invest] snapshot not stored:", error.message);
  return !error;
}

async function todaysSnapshot(): Promise<InvestFeed | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  try {
    const { data, error } = await db.from("invest_snapshots").select("generated_at, source, data").eq("day", seattleDay()).maybeSingle();
    if (error || !data || !Array.isArray(data.data)) return null;
    return { generatedAt: data.generated_at, source: data.source, connected: true, fromSnapshot: true, opportunities: data.data as Opportunity[] };
  } catch {
    return null;
  }
}

let live: { feed: InvestFeed; at: number } | null = null;
const LIVE_TTL_MS = 30 * 60 * 1000;

/** Drops the live copy, so the next read runs the pipeline with fresh assumptions. */
export function clearLiveFeed() {
  live = null;
}

/** Today's snapshot when the daily job has run, else a live run (kept for 30 minutes). */
export async function getInvestFeed(): Promise<InvestFeed> {
  const snap = await todaysSnapshot();
  if (snap) return snap;
  if (live && Date.now() - live.at < LIVE_TTL_MS) return live.feed;
  const feed = await computeFeed();
  live = { feed, at: Date.now() };
  return feed;
}

export async function getOpportunity(id: string): Promise<{ opportunity: Opportunity; feed: InvestFeed } | null> {
  const feed = await getInvestFeed();
  const opportunity = feed.opportunities.find((o) => o.id === id);
  return opportunity ? { opportunity, feed } : null;
}
