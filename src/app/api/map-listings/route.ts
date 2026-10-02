import { NextResponse } from "next/server";
import { getListingsProvider, listingsConnected, listingsProviderName } from "@/lib/listings";
import { findLotForListing, libraryAvailable } from "@/lib/server/lot-library-store";
import { inBuyBox } from "@/lib/buy-box";
import { isForSale } from "@/lib/listings/status";
import { dealMachineCache } from "@/lib/listings/dealmachine";

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
  /** True for sample listings (the fixture provider). Real listings come from the live feed. */
  test: boolean;
}

/**
 * GET /api/map-listings?zip=98103,98107
 * Active MLS listings that sit on a library lot that can take a DADU. A listing counts when its lot is in the library, which means the engine found room for a DADU. Listings off the library are dropped.
 * `connected: false` means no MLS feed is configured, so an empty list is not "no listings".
 */
export async function GET(req: Request) {
  const zipParam = new URL(req.url).searchParams.get("zip");
  const zips = zipParam ? zipParam.split(",").filter((z) => /^98\d{3}$/.test(z)) : undefined;
  const source = listingsProviderName();
  const connected = listingsConnected();
  if (!libraryAvailable()) {
    return NextResponse.json({ error: "The lot library has not been built.", listings: [], scanned: 0, source, connected }, { status: 503 });
  }
  if (!connected) return NextResponse.json({ listings: [], scanned: 0, total: 0, source, connected });
  try {
    const { listings, total } = await getListingsProvider().search({ city: source === "flex" || source === "redfin" ? "Seattle" : undefined, zips, pageSize: 250 });
    const out: MapListing[] = [];
    for (const l of listings) {
      if (!isForSale(l.status)) continue; // active listings only: no pending, contingent, sold or expired
      if ((l.hoaMonthly ?? 0) > 0) continue; // screening rule: a property with an HOA is never a DADU candidate
      const lot = findLotForListing(l.address, l.lat, l.lng);
      if (!lot) continue; // the lot library only holds lots where the engine finds a DADU of at least 300 sf
      // The buy box: NR zoning, one unit, lot 3,800 sf+, under 25% built on, score 75+ (src/lib/buy-box.ts).
      if (!inBuyBox({ zoning: lot.zoning, lotSqft: lot.lotSqft, coveragePct: lot.coveragePct, existingAdus: lot.existingAdus, score: lot.score })) continue;
      out.push({
        mlsId: l.mlsId, address: l.address, lat: l.lat, lng: l.lng, price: l.listPrice, lotSqft: l.lotSqft || lot.lotSqft,
        status: l.status, photo: l.photos[0] ?? null, pin: lot.pin, score: lot.score, tier: lot.tier, corner: lot.corner, alley: lot.alley,
        beds: l.beds ?? null, baths: l.baths ?? null, sqft: l.livingSqft ?? null, daduSqft: lot.daduSqft ?? null, zip: l.zip, daysOnMarket: l.daysOnMarket ?? null, listingUrl: l.listingUrl ?? null, test: source === "fixture",
      });
    }
    // How the truly-active check went (DealMachine feed): shown under the list, and useful when a status looks wrong.
    const statusCheck = source === "dealmachine" ? (await dealMachineCache.get()).value.check : null;
    return NextResponse.json({ listings: out, scanned: listings.length, total, source, connected, statusCheck });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Listings unavailable", listings: [], scanned: 0, source, connected }, { status: 502 });
  }
}
