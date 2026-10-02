import { COST_PER_SF, constructionEstimate } from "@/lib/config/costs";

/**
 * What a finished DADU sells for and what it returns, from the team's market read (Oct 2026): about $800 per sf for an
 * 800 sf cottage and $680 per sf for a 1,000 sf one. Smaller units sell for more per foot, so the rate is a straight
 * line through those two points, held flat outside 500 to 1,000 sf where there is no data. Costs are the $350 per sf
 * construction estimate plus $50,000 of soft costs (design, permits, fees, utilities). Resale value, not rent.
 */
export const SALE_PSF_AT_800 = 800;
export const SALE_PSF_AT_1000 = 680;
export const SOFT_COSTS = 50_000;
const SLOPE = (SALE_PSF_AT_1000 - SALE_PSF_AT_800) / 200; // dollars per sf, per extra sf of size

export function salePricePerSf(sf: number): number {
  const s = Math.min(1000, Math.max(500, sf));
  return Math.round(SALE_PSF_AT_800 + SLOPE * (s - 800));
}

/** Rehab of the existing house, per sf of the house: a cost the buyer takes on with the lot. */
export type RehabLevel = "none" | "light" | "moderate" | "heavy";
export const REHAB_RATES: Record<RehabLevel, number> = { none: 0, light: 70, moderate: 95, heavy: 120 };
export const REHAB_LABELS: Record<RehabLevel, string> = { none: "No rehab", light: "Light rehab", moderate: "Moderate rehab", heavy: "Heavy rehab" };

export interface EconomicsOptions {
  rehab?: RehabLevel;
  /** The existing house's living area, sf. Rehab cost is this times the level's rate. */
  houseSqft?: number | null;
}

export interface DaduEconomics {
  sf: number;
  salePsf: number;
  saleValue: number;
  buildCost: number;
  softCosts: number;
  rehab: RehabLevel;
  rehabRate: number;
  rehabCost: number;
  /** Build plus soft costs plus any rehab. */
  allInCost: number;
  profit: number;
  /** Profit over all-in cost, 0 to 1. */
  roi: number;
}

/** Sale value, cost, profit and ROI for a DADU of `sf` square feet. Null when there is no room for one. */
export function daduEconomics(sf: number | null | undefined, costPerSf: number = COST_PER_SF, opts: EconomicsOptions = {}): DaduEconomics | null {
  if (!sf || !Number.isFinite(sf) || sf <= 0) return null;
  const s = Math.round(sf);
  const salePsf = salePricePerSf(s);
  const saleValue = Math.round(s * salePsf);
  const buildCost = constructionEstimate(s, costPerSf);
  const rehab = opts.rehab ?? "none";
  const rehabRate = REHAB_RATES[rehab];
  const rehabCost = opts.houseSqft && opts.houseSqft > 0 ? Math.round(opts.houseSqft * rehabRate) : 0;
  const allInCost = buildCost + SOFT_COSTS + rehabCost;
  const profit = saleValue - allInCost;
  return { sf: s, salePsf, saleValue, buildCost, softCosts: SOFT_COSTS, rehab, rehabRate, rehabCost, allInCost, profit, roi: profit / allInCost };
}

export const ECONOMICS_LABEL = "Resale value from the team's market read: about $800 per sf at 800 sf, $680 per sf at 1,000 sf. Costs: $350 per sf to build plus $50,000 soft costs. An estimate, not an appraisal.";
