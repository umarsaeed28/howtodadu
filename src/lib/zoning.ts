/**
 * Zoning: the one gate between city data and anything Pencil shows. Pencil studies Neighborhood Residential (NR)
 * lots only. A property in any other zone, or whose zone we cannot confirm, never gets a feasibility run, a map dot,
 * a listing card or an investment summary. Showing a DADU analysis for a lot that cannot take one would be wrong data,
 * and the data is the product.
 *
 * The city's layers still carry the pre-2021 single-family names: SF 5000 is NR3, SF 7200 is NR2, SF 9600 is NR1.
 * Labels can also carry a suffix, such as "(M)" for Mandatory Housing Affordability: "NR3 (M)" is NR3.
 */

const LEGACY: Record<string, string> = { "SF 5000": "NR3", "SF 7200": "NR2", "SF 9600": "NR1" };

/** The four NR zone names (bare "NR" is what the lot library records). */
export const NR_ZONES = ["NR", "NR1", "NR2", "NR3"] as const;

/** A zoning label in its current, canonical form: "sf 7200 (m)" → "NR2", " NR3 " → "NR3", "LR2 (M1)" → "LR2". */
export function canonicalZone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw)
    .toUpperCase()
    .replace(/\(.*?\)/g, " ") // suffixes like (M), (M1), (M2)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^SF(\d)/, "SF $1"); // "SF5000" → "SF 5000"
  if (!t) return null;
  return LEGACY[t] ?? t;
}

/** True only for Neighborhood Residential: NR, NR1, NR2, NR3, or their legacy SF names. Anything else is false. */
export function isNrZone(raw: string | null | undefined): boolean {
  const z = canonicalZone(raw);
  return z != null && (NR_ZONES as readonly string[]).includes(z);
}

export const NOT_NR_MESSAGE =
  "This property is not zoned Neighborhood Residential (NR), so it is not suitable for a DADU. Search NR-zoned properties for the best development opportunities.";
export const ZONING_UNKNOWN_MESSAGE =
  "We could not confirm this property's zoning from city records, so we will not run a feasibility check on it. Search NR-zoned properties for the best development opportunities.";

export type ZoningGate =
  | { ok: true; zone: string }
  | { ok: false; code: "not_nr" | "zoning_unknown"; zoning: string | null; message: string };

/**
 * The gate every property passes before any analysis. The first non-empty label wins, in the order given (the
 * parcel layer's ZONING, then its base zone, then its category), so a property is judged on its recorded zone.
 */
export function zoningGate(...labels: (string | null | undefined)[]): ZoningGate {
  const raw = labels.find((l) => l != null && String(l).trim() !== "") ?? null;
  if (raw == null) return { ok: false, code: "zoning_unknown", zoning: null, message: ZONING_UNKNOWN_MESSAGE };
  if (!isNrZone(raw)) return { ok: false, code: "not_nr", zoning: String(raw).trim(), message: NOT_NR_MESSAGE };
  return { ok: true, zone: canonicalZone(raw)! };
}
