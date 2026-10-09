import { NextResponse } from "next/server";
import { listingsConnected, listingsProviderName } from "@/lib/listings";
import { libraryAvailable } from "@/lib/server/lot-library-store";
import { screenListings, toMapListing } from "@/lib/server/screened-listings";
import { getInvestAssumptions, opportunityFromScreened } from "@/lib/server/invest";
import { toTile } from "@/lib/invest/opportunity";

export type { MapListing } from "@/lib/server/screened-listings";

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
    const [r, { assumptions }] = await Promise.all([screenListings(zips), getInvestAssumptions()]);
    // Each card carries its investment tile, built the same way as the listing's investment summary.
    const listings = r.listings.map((l) => ({ ...toMapListing(l), invest: toTile(opportunityFromScreened(l, assumptions)) }));
    return NextResponse.json({ listings, scanned: r.scanned, total: r.total, source, connected });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Listings unavailable", listings: [], scanned: 0, source, connected }, { status: 502 });
  }
}
