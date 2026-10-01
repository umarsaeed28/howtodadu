import { NextResponse } from "next/server";
import { getListingsProvider, listingsConnected, listingsProviderName } from "@/lib/listings";
import { findNearestLot, libraryAvailable } from "@/lib/server/lot-library-store";

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
}

/**
 * GET /api/map-listings?zip=98103,98107
 * Active MLS listings that sit on a library lot that can take a DADU. A listing is a "great candidate"
 * when its lot is tier 2 (good) or 3 (top pick). Listings off the library are dropped.
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
    const { listings, total } = await getListingsProvider().search({ city: source === "flex" ? "Seattle" : undefined, zips, pageSize: 250 });
    const out: MapListing[] = [];
    for (const l of listings) {
      const lot = findNearestLot(l.lat, l.lng);
      if (!lot || lot.tier < 2) continue;
      out.push({
        mlsId: l.mlsId, address: l.address, lat: l.lat, lng: l.lng, price: l.listPrice, lotSqft: l.lotSqft || lot.lotSqft,
        status: l.status, photo: l.photos[0] ?? null, pin: lot.pin, score: lot.score, tier: lot.tier, corner: lot.corner, alley: lot.alley,
      });
    }
    return NextResponse.json({ listings: out, scanned: listings.length, total, source, connected });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Listings unavailable", listings: [], scanned: 0, source, connected }, { status: 502 });
  }
}
