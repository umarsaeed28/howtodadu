import { NextResponse } from "next/server";
import { getListingsProvider, listingsConnected } from "@/lib/listings";
import { findLotForListing, getOffMarketLots, libraryAvailable } from "@/lib/server/lot-library-store";

/**
 * GET /api/offmarket
 * Off-market lots in the buy box (src/lib/buy-box.ts), for the map's Off-market switch. They come from the city lot
 * library, which already scores every lot, so they cost no DealMachine credits. Lots listed right now are left out
 * (they show as priced listings instead). Columnar to keep the payload small.
 */
export async function GET() {
  if (!libraryAvailable()) return NextResponse.json({ error: "The lot library has not been built." }, { status: 503 });
  const onMarket = new Set<string>();
  if (listingsConnected()) {
    try {
      const { listings } = await getListingsProvider().search({ city: "Seattle", pageSize: 1000 });
      for (const l of listings) {
        const lot = findLotForListing(l.address, l.lat, l.lng);
        if (lot) onMarket.add(lot.pin);
      }
    } catch {
      /* the feed is down: show every buy-box lot rather than nothing */
    }
  }
  const lots = getOffMarketLots(onMarket);
  return NextResponse.json({ lots }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
