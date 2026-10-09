import { getListingsProvider, listingsConnected, listingsProviderName, type RawListing } from "@/lib/listings";
import { findLotForListing } from "@/lib/server/lot-library-store";
import { inBuyBox } from "@/lib/buy-box";
import { isForSale, isPending } from "@/lib/listings/status";
import { overrideFor, statusOverrides } from "@/lib/listings/status-overrides";
import type { Candidate } from "@/lib/server/candidates";

export interface MapListing {
  mlsId: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  lotSqft: number;
  status: string;
  photo: string | null;
  pin: string;
  score: number;
  tier: number;
  corner: boolean;
  alley: boolean;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  daduSqft: number | null;
  zip: string;
  daysOnMarket: number | null;
  /** The listing page at the source, when it gave one (Redfin feed). DealMachine does not. */
  listingUrl: string | null;
  /** Under contract (pending or contingent): shown with a tag; users can hide these. */
  pending: boolean;
  /** Why it is marked pending, when we know. */
  pendingNote: string | null;
  /** True for sample listings (the fixture provider). Real listings come from the live feed. */
  test: boolean;
}

/** A screened listing with the library lot it sits on, the brokerage and its first five photos, for the Invest feed. */
export type ScreenedListing = MapListing & { lot: Candidate; brokerage: string | null; photos: string[] };

/**
 * Whether the feed lets this listing be shown: a listing flagged `internetDisplay: false` is dropped.
 * TODO(idx): once the IDX/MLS feed is connected, map its display flags (internet display, address display,
 * broker opt-outs) onto this; the current sources carry none, so every listing passes.
 */
export function idxDisplayAllowed(l: RawListing): boolean {
  return (l as RawListing & { internetDisplay?: boolean }).internetDisplay !== false;
}

/** The map's fields only: the lot, brokerage and photo set stay with the Invest feed. */
export function toMapListing(l: ScreenedListing): MapListing {
  const m: Partial<ScreenedListing> = { ...l };
  delete m.lot;
  delete m.brokerage;
  delete m.photos;
  return m as MapListing;
}

/**
 * Active listings that sit on a library lot that can take a DADU and fall in the buy box. The map and the Invest
 * feed both read this, so a listing is screened the same way everywhere.
 */
export async function screenListings(zips?: string[]): Promise<{ listings: ScreenedListing[]; scanned: number; total: number; source: string; connected: boolean }> {
  const source = listingsProviderName();
  const connected = listingsConnected();
  if (!connected) return { listings: [], scanned: 0, total: 0, source, connected };
  const { listings, total } = await getListingsProvider().search({ city: source === "flex" || source === "redfin" ? "Seattle" : undefined, zips, pageSize: 250 });
  const out: ScreenedListing[] = [];
  const overrides = statusOverrides();
  for (const l of listings) {
    if (!idxDisplayAllowed(l)) continue;
    // Active listings, plus pending ones we show with a tag (from the feed, our status list, or the Redfin check).
    const override = overrideFor(overrides, l.address, l.zip);
    const pending = !!override || isPending(l.status);
    if (!pending && !isForSale(l.status)) continue; // sold, closed, expired, withdrawn and the rest are out
    if ((l.hoaMonthly ?? 0) > 0) continue; // screening rule: a property with an HOA is never a DADU candidate
    const lot = findLotForListing(l.address, l.lat, l.lng);
    if (!lot) continue; // the lot library only holds lots where the engine finds a DADU of at least 300 sf
    // The buy box: NR zoning, one unit, lot 3,800 sf+, under 25% built on, score 75+ (src/lib/buy-box.ts).
    if (!inBuyBox({ zoning: lot.zoning, lotSqft: lot.lotSqft, coveragePct: lot.coveragePct, existingAdus: lot.existingAdus, score: lot.score })) continue;
    out.push({
      mlsId: l.mlsId, address: l.address, lat: l.lat, lng: l.lng, price: l.listPrice, lotSqft: l.lotSqft || lot.lotSqft,
      status: l.status, photo: l.photos[0] ?? null, pin: lot.pin, score: lot.score, tier: lot.tier, corner: lot.corner, alley: lot.alley,
      beds: l.beds ?? null, baths: l.baths ?? null, sqft: l.livingSqft ?? null, daduSqft: lot.daduSqft ?? null, zip: l.zip, daysOnMarket: l.daysOnMarket ?? null, listingUrl: l.listingUrl ?? null, pending, pendingNote: override?.note ?? (pending ? "Marked pending by the listing source." : null), test: source === "fixture",
      lot, brokerage: l.detail?.brokerage ?? null, photos: (l.detail?.photos?.length ? l.detail.photos : l.photos).slice(0, 5),
    });
  }
  return { listings: out, scanned: listings.length, total, source, connected };
}
