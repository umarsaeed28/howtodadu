import { NextResponse } from "next/server";
import { getListingsProvider, listingsConnected, listingsProviderName } from "@/lib/listings";
import { findLotForListing, libraryAvailable } from "@/lib/server/lot-library-store";
import { MIN_SHOWN_SCORE } from "@/lib/dadu-score";

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
      if (/sold|closed|off_?market|withdrawn/i.test(l.status)) continue; // only listings that can still be bought
      if ((l.hoaMonthly ?? 0) > 0) continue; // screening rule: a property with an HOA is never a DADU candidate
      const lot = findLotForListing(l.address, l.lat, l.lng);
      if (!lot) continue; // the lot library only holds lots where the engine finds a DADU of at least 300 sf
      if (lot.score < MIN_SHOWN_SCORE) continue; // only lots that score 75 or more are shown
      out.push({
        mlsId: l.mlsId, address: l.address, lat: l.lat, lng: l.lng, price: l.listPrice, lotSqft: l.lotSqft || lot.lotSqft,
        status: l.status, photo: l.photos[0] ?? null, pin: lot.pin, score: lot.score, tier: lot.tier, corner: lot.corner, alley: lot.alley,
        beds: l.beds ?? null, baths: l.baths ?? null, sqft: l.livingSqft ?? null, daduSqft: lot.daduSqft ?? null, zip: l.zip, daysOnMarket: l.daysOnMarket ?? null, test: source === "fixture",
      });
    }
    return NextResponse.json({ listings: out, scanned: listings.length, total, source, connected });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Listings unavailable", listings: [], scanned: 0, source, connected }, { status: 502 });
  }
}
