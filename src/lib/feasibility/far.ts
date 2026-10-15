import { NR, nrFarFor } from "@/lib/rules/seattle-adu";

/**
 * Floor Area Ratio (FAR) helpers.
 *
 * FAR = total building floor area / lot area. It is the single clearest measure
 * of how much building a lot can hold, so it is computed for every property the
 * moment a feasibility run completes (existing FAR from city records, proposed
 * FAR from the live deal scenario, and the zone's limit).
 *
 * Neighborhood Residential (NR1-3, and the legacy SF 5000/7200/9600 labels the
 * city layers still carry) follows SMC 23.44.050 as amended by Ordinance 127211
 * and Council Bill 120993 (effective January 2026). The Lowrise and RSL figures
 * below are still EDITABLE PLACEHOLDERS, labeled "est." where they surface.
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

/**
 * Dwelling units Pencil studies on an NR lot: the existing house plus one new DADU. Accessory units count toward
 * density (SMC 23.42.022.J), and density sets the FAR (SMC 23.44.050 Table A).
 */
export const NR_UNITS_HOUSE_AND_DADU = 2;

/** NR1, NR2, NR3 and the pre-2021 single-family names the city layers still carry (SF 5000/7200/9600). */
export function isNeighborhoodResidential(zoning: string | null | undefined): boolean {
  const z = (zoning ?? "").trim().toUpperCase();
  return /^NR\d?\b/.test(z) || /^SF\b/.test(z);
}

/**
 * NR floor area ratio by density, SMC 23.44.050 Table A (residential use, attached or detached units):
 * less dense than 1 unit / 4,000 sf: 0.6; 1 / 4,000 to 1 / 2,201: 0.8; 1 / 2,200 to 1 / 1,601: 1.0; 1 / 1,600 or
 * denser: 1.6. The bonuses in 23.44.050.D-E (stacked units near schools, tree retention, Green Factor) are not modeled.
 */
export function nrFar(lotSqft: number, units: number): number {
  return nrFarFor(lotSqft, units);
}

/** Lots under 5,000 sf may always have 2,500 sf of chargeable floor area, whatever the FAR gives (SMC 23.44.050.B). */
export const NR_SMALL_LOT_FLOOR_SQFT = NR.smallLotFloorSqft.value;
const NR_SMALL_LOT_SQFT = NR.smallLotUnderSqft.value;

/** NR maximum chargeable floor area for all structures on the lot (SMC 23.44.050.B). */
export function nrMaxFloorArea(lotSqft: number, units: number): number {
  const byFar = Math.round(nrFar(lotSqft, units) * lotSqft);
  return lotSqft < NR_SMALL_LOT_SQFT ? Math.max(byFar, NR_SMALL_LOT_FLOOR_SQFT) : byFar;
}

/**
 * Max FAR for the zone. NR needs the lot size and unit count (SMC 23.44.050), so it is null without a lot size;
 * `units` defaults to the house plus one DADU. Lowrise and RSL figures are placeholders, labeled "est.".
 */
export function maxFarForZone(
  zoning: string | null | undefined,
  lotSqft?: number | null,
  units: number = NR_UNITS_HOUSE_AND_DADU
): number | null {
  const z = (zoning ?? "").toUpperCase();
  if (!z) return null;
  if (isNeighborhoodResidential(z)) return lotSqft != null && lotSqft > 0 ? nrFar(lotSqft, units) : null;
  if (z.includes("LR3")) return 1.4;
  if (z.includes("LR2")) return 1.3;
  if (z.includes("LR")) return 1.2;
  if (z.includes("RSL")) return 0.75;
  if (z.includes("RS")) return 0.5;
  return 0.9;
}

/** Max buildable floor area for the zone and lot: NR per SMC 23.44.050, other zones from the placeholder FAR. */
export function maxFloorAreaForZone(
  zoning: string | null | undefined,
  lotSqft: number | null | undefined,
  units: number = NR_UNITS_HOUSE_AND_DADU
): number | null {
  if (lotSqft == null || !Number.isFinite(lotSqft) || lotSqft <= 0) return null;
  if (isNeighborhoodResidential(zoning)) return nrMaxFloorArea(lotSqft, units);
  const far = maxFarForZone(zoning, lotSqft, units);
  return far == null ? null : Math.round(far * lotSqft);
}
