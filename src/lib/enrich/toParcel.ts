/**
 * The single place a raw listing becomes an underwritten Parcel.
 * Combines RawListing + zoning enrichment + the feasibility model into the app's
 * existing Parcel shape. Results are cached in memory; a database goes here later.
 */
import type { Parcel } from "@/lib/parcels";
import { verdictFromMargin } from "@/lib/parcels";
import { propertyPhoto } from "@/lib/property-image";
import type { RawListing } from "@/lib/listings/provider";
import { enrichZoning } from "./zoning";
import { baseDealInputs, buildTypeFor } from "@/lib/feasibility/defaults";
import { computeFeasibility } from "@/lib/feasibility/model";

// In-memory cache. TODO: replace with a database / persistent cache keyed by mlsId + dataVersion.
const cache = new Map<string, Parcel>();

export function clearParcelCache(): void {
  cache.clear();
}

export async function listingToParcel(listing: RawListing): Promise<Parcel> {
  const cached = cache.get(listing.mlsId);
  if (cached) return cached;

  const zoning = await enrichZoning(listing);
  const units = zoning.unitsAllowed;
  const buildType = buildTypeFor(units, zoning.bestUse);

  const inputs = baseDealInputs({ purchasePrice: listing.listPrice, units, buildType });
  const result = computeFeasibility(inputs);

  const parcel: Parcel = {
    id: listing.mlsId,
    address: listing.address,
    neighborhood: listing.city,
    lat: listing.lat,
    lng: listing.lng,
    listPrice: listing.listPrice,
    zoning: zoning.zoning,
    unitsUnlocked: units,
    bestUse: zoning.bestUse,
    allInCost: result.costBreakdown.total,
    projectedValue: result.grossRevenue,
    marginPct: result.marginOnCost,
    verdict: verdictFromMargin(result.marginOnCost),
    lotSqft: listing.lotSqft,
    nearTransit: zoning.nearFrequentTransit,
    dom: listing.daysOnMarket ?? 0,
    photo: listing.photos[0] ?? propertyPhoto(listing.address, listing.lat, listing.lng),
  };

  cache.set(listing.mlsId, parcel);
  return parcel;
}
