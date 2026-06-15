/**
 * Zoning enrichment. A raw listing is not a parcel; this resolves what a lot is
 * allowed to become. Stubbed against King County and Seattle GIS with realistic
 * mock values now; live calls are TODO.
 */
import type { RawListing } from "@/lib/listings/provider";

export interface ZoningInfo {
  zoning: string;
  unitsAllowed: number;
  /** Seattle middle housing: within a quarter mile of frequent transit unlocks 6 units. */
  nearFrequentTransit: boolean;
  overlays: string[];
  lotDimensions: { widthFt: number; depthFt: number };
  bestUse: string;
}

const ZONE_UNIT_BASE: Record<string, number> = {
  NR1: 4,
  NR2: 4,
  NR3: 4,
  RSL: 3,
  LR1: 8,
  LR2: 12,
  "RS-8": 2,
};

function bestUseFor(units: number): string {
  if (units >= 8) return `${units}-unit stacked flats`;
  if (units >= 6) return `${units}-unit stacked flats`;
  if (units >= 4) return `${units}-plex`;
  if (units >= 3) return `${units} townhomes`;
  return "SFR + DADU";
}

/**
 * Resolve zoning for a listing.
 * TODO: replace mock with live King County parcel + Seattle zoning/GIS lookups
 * keyed by parcel PIN or point-in-polygon on lat/lng.
 */
export async function enrichZoning(listing: RawListing): Promise<ZoningInfo> {
  // TODO: live GIS call. Mock derives a believable result from lot size + coords.
  const zoning = listing.lotSqft >= 6000 ? "NR2" : "NR1";
  const base = ZONE_UNIT_BASE[zoning] ?? 4;

  // Quarter-mile transit test (mock): treat denser, larger lots as transit-served.
  const nearFrequentTransit = listing.lotSqft >= 5500;
  const unitsAllowed = nearFrequentTransit ? Math.max(base, 6) : base;

  const widthFt = Math.round(Math.sqrt(listing.lotSqft) * 0.8);
  const depthFt = Math.round(listing.lotSqft / Math.max(widthFt, 1));

  return {
    zoning,
    unitsAllowed,
    nearFrequentTransit,
    overlays: [],
    lotDimensions: { widthFt, depthFt },
    bestUse: bestUseFor(unitsAllowed),
  };
}
