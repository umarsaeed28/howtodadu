import { parcels } from "@/lib/parcels";
import { aerialPhoto } from "@/lib/property-image";
import type { ListingQuery, ListingsProvider, RawListing } from "./provider";

type ListingStatus = NonNullable<ListingQuery["status"]>[number];

/**
 * Mock provider. Sources listings from the app's existing sample parcels so the
 * UI looks identical to today. When live data is wired in, swap to mlsgrid.
 */
function parcelToRawListing(p: (typeof parcels)[number]): RawListing {
  return {
    mlsId: p.id,
    address: p.address,
    city: p.neighborhood,
    zip: "",
    lat: p.lat,
    lng: p.lng,
    listPrice: p.listPrice,
    lotSqft: p.lotSqft,
    status: "active",
    daysOnMarket: p.dom,
    photos: [p.photo, aerialPhoto(p.lat, p.lng, 0.0032, "1200,720")],
    updatedAt: new Date().toISOString(),
  };
}

function matches(l: RawListing, q: ListingQuery): boolean {
  if (q.minPrice != null && l.listPrice < q.minPrice) return false;
  if (q.maxPrice != null && l.listPrice > q.maxPrice) return false;
  if (q.minLotSqft != null && l.lotSqft < q.minLotSqft) return false;
  if (q.zips?.length && !q.zips.includes(l.zip)) return false;
  if (q.city && l.city.toLowerCase() !== q.city.toLowerCase()) return false;
  if (q.status?.length && !q.status.includes(l.status as ListingStatus)) return false;
  if (q.bounds) {
    const { north, south, east, west } = q.bounds;
    if (l.lat > north || l.lat < south || l.lng > east || l.lng < west) return false;
  }
  return true;
}

export class MockListingsProvider implements ListingsProvider {
  async search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    const all = parcels.map(parcelToRawListing).filter((l) => matches(l, q));
    const page = q.page ?? 0;
    const pageSize = q.pageSize ?? all.length;
    const start = page * pageSize;
    return { listings: all.slice(start, start + pageSize), total: all.length };
  }

  async getById(mlsId: string): Promise<RawListing | null> {
    const p = parcels.find((x) => x.id === mlsId);
    return p ? parcelToRawListing(p) : null;
  }
}
