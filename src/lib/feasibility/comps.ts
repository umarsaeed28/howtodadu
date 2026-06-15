import { usd } from "@/lib/format";

/**
 * Comp-based resale suggestion for the exit assumptions.
 *
 * TODO: replace this neighborhood lookup with live sold comps from the MLS
 * aggregator (RESO `Property` with `StandardStatus=Closed`, filtered to recent
 * new-construction sales near the subject). For now these are calibrated
 * placeholders so the suggestion is realistic without a data agreement.
 */

export interface CompSuggestion {
  /** Suggested resale price per finished sq ft. */
  pricePerSqft: number;
  /** Suggested total resale value (ARV). */
  arv: number;
  /** Suggested sale price per unit. */
  pricePerUnit: number;
  /** Short, human-readable basis for the number. */
  basis: string;
}

/** Recent new-construction resale $/finished sq ft by Seattle-area submarket. */
const PRICE_PER_SQFT: Record<string, number> = {
  ballard: 650,
  greenwood: 600,
  "phinney ridge": 640,
  wallingford: 680,
  "beacon hill": 560,
  "columbia city": 560,
  delridge: 520,
  "rainier beach": 500,
  "west seattle junction": 600,
  edmonds: 520,
};

const DEFAULT_PRICE_PER_SQFT = 575;

function key(neighborhood?: string | null): string {
  return (neighborhood ?? "").trim().toLowerCase();
}

/** Resale $/sq ft for a submarket, falling back to a Seattle-area default. */
export function compsPricePerSqft(neighborhood?: string | null): number {
  return PRICE_PER_SQFT[key(neighborhood)] ?? DEFAULT_PRICE_PER_SQFT;
}

export function suggestComps(opts: {
  neighborhood?: string | null;
  units: number;
  buildableSqft: number;
}): CompSuggestion {
  const pricePerSqft = compsPricePerSqft(opts.neighborhood);
  const arv = Math.round(pricePerSqft * Math.max(opts.buildableSqft, 0));
  const units = Math.max(opts.units, 1);
  const pricePerUnit = Math.round(arv / units);
  const where = opts.neighborhood?.trim() || "this area";
  return {
    pricePerSqft,
    arv,
    pricePerUnit,
    basis: `Comps in ${where} ≈ ${usd(pricePerSqft)}/sq ft finished`,
  };
}
