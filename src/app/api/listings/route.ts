import { NextRequest, NextResponse } from "next/server";
import { getListingsProvider, type ListingQuery } from "@/lib/listings";
import { listingToParcel } from "@/lib/enrich/toParcel";

function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** GET /api/listings → enriched, underwritten parcels for the map and list. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const query: ListingQuery = {
    city: sp.get("city") ?? undefined,
    zips: sp.get("zips")?.split(",").filter(Boolean),
    minPrice: num(sp.get("minPrice")),
    maxPrice: num(sp.get("maxPrice")),
    minLotSqft: num(sp.get("minLotSqft")),
    page: num(sp.get("page")),
    pageSize: num(sp.get("pageSize")),
  };

  const north = num(sp.get("north"));
  const south = num(sp.get("south"));
  const east = num(sp.get("east"));
  const west = num(sp.get("west"));
  if (north != null && south != null && east != null && west != null) {
    query.bounds = { north, south, east, west };
  }

  try {
    const provider = getListingsProvider();
    const { listings, total } = await provider.search(query);
    const parcels = await Promise.all(listings.map(listingToParcel));
    return NextResponse.json({ parcels, total });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Listings unavailable", parcels: [], total: 0 },
      { status: 502 }
    );
  }
}
