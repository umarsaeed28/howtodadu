/**
 * Cost assumptions shared by the map, the report and the calculator.
 * Mirrors the Supabase `config.cost_per_sf` row (the database value wins once connected).
 *
 * This is a construction estimate only: no soft costs, financing, land or sale value.
 */
export const COST_PER_SF = 350;

/** Construction estimate for a DADU of the given area, in whole dollars. */
export function constructionEstimate(sf: number, costPerSf: number = COST_PER_SF): number {
  if (!Number.isFinite(sf) || sf <= 0) return 0;
  return Math.round(sf * costPerSf);
}

export const COST_LABEL = "Construction only, estimate";
