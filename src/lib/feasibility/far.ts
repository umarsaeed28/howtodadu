/**
 * Floor Area Ratio (FAR) helpers.
 *
 * FAR = total building floor area / lot area. It is the single clearest measure
 * of how much building a lot can hold, so it is computed for every property the
 * moment a feasibility run completes (existing FAR from city records, proposed
 * FAR from the live deal scenario, and a max-by-zone estimate).
 *
 * The max-FAR figures below are EDITABLE PLACEHOLDERS for Seattle middle-housing
 * zones, meant to be calibrated against the Land Use Code. They are labeled
 * "est." everywhere they surface and are not a legal determination.
 */

export interface FarReadout {
  /** floorArea / lotSqft, rounded to 2 decimals, or null when inputs are missing. */
  ratio: number | null;
  /** Pre-formatted "0.42" style string, or "—". */
  display: string;
}

/** Compute a FAR value from a floor area and lot area. */
export function computeFar(
  floorAreaSqft: number | null | undefined,
  lotSqft: number | null | undefined
): FarReadout {
  if (
    floorAreaSqft == null ||
    lotSqft == null ||
    !Number.isFinite(floorAreaSqft) ||
    !Number.isFinite(lotSqft) ||
    lotSqft <= 0 ||
    floorAreaSqft < 0
  ) {
    return { ratio: null, display: "—" };
  }
  const ratio = Number((floorAreaSqft / lotSqft).toFixed(2));
  return { ratio, display: ratio.toFixed(2) };
}

/** Max FAR estimate by Seattle zone family. Editable placeholder, labeled "est." */
export function maxFarForZone(zoning: string | null | undefined): number | null {
  const z = (zoning ?? "").toUpperCase();
  if (!z) return null;
  if (z.includes("LR3")) return 1.4;
  if (z.includes("LR2")) return 1.3;
  if (z.includes("LR")) return 1.2;
  if (z.includes("NR1") || z.includes("NR2") || z.includes("NR3") || z === "NR") return 0.9;
  if (z.includes("RSL")) return 0.75;
  if (z.includes("RS") || z.includes("SF")) return 0.5;
  return 0.9;
}

/** Max buildable floor area implied by the zone's FAR estimate and lot size. */
export function maxFloorAreaForZone(
  zoning: string | null | undefined,
  lotSqft: number | null | undefined
): number | null {
  const far = maxFarForZone(zoning);
  if (far == null || lotSqft == null || !Number.isFinite(lotSqft) || lotSqft <= 0) return null;
  return Math.round(far * lotSqft);
}
