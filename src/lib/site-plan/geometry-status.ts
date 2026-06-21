import type { FeasibilityResult } from "@/lib/feasibility";

export interface SitePlanGeometryStatus {
  ok: boolean;
  reason?: string;
}

/**
 * A site plan requires BOTH an authoritative parcel polygon AND at least one
 * GIS building footprint. Missing geometry → no plan (never fabricate).
 */
export function sitePlanGeometryStatus(result: FeasibilityResult): SitePlanGeometryStatus {
  const rings = result.lot?.rings;
  if (!rings || rings.length < 3) {
    return {
      ok: false,
      reason: "Parcel boundary polygon unavailable from GIS.",
    };
  }

  const buildings = result.sitePlan?.buildings ?? [];
  const valid = buildings.filter((b) => b.rings && b.rings.length >= 3);
  if (valid.length === 0) {
    return {
      ok: false,
      reason: "Existing building footprint unavailable from GIS.",
    };
  }

  return { ok: true };
}

export function validBuildingFootprints(result: FeasibilityResult) {
  return (result.sitePlan?.buildings ?? []).filter((b) => b.rings && b.rings.length >= 3);
}
