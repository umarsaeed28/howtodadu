/**
 * How a construction budget is spent over the build months. Straight-line spends the same each month; the S-curve
 * follows a normal distribution centred on the build (slow start, fast middle, slow finish), the usual shape of a
 * draw schedule. Both return cents that sum exactly to the budget.
 */
import { splitByWeights, type Cents } from "./money";

export type DrawCurve = "straight" | "scurve";

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, max error 1.5e-7); Excel NORM.S.DIST does the same job. */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return 0.5 * (1 + (z < 0 ? -erf : erf));
}

/**
 * Month weights for an S-curve over `months`: the share of the budget drawn in month m is the normal CDF step from
 * (m-1) to m, with the mean at the middle of the build and a standard deviation of a quarter of it, normalised so
 * the whole build sums to one.
 */
export function scurveWeights(months: number): number[] {
  if (months <= 0) return [];
  const mean = months / 2, sd = Math.max(months / 4, 1e-9);
  const F = (m: number) => normCdf((m - mean) / sd);
  const lo = F(0), hi = F(months);
  return Array.from({ length: months }, (_, i) => (F(i + 1) - F(i)) / (hi - lo));
}

/** Cents drawn in each month of the build, summing exactly to `budget`. */
export function drawSchedule(budget: Cents, months: number, curve: DrawCurve): Cents[] {
  if (months <= 0) return [];
  const weights = curve === "scurve" ? scurveWeights(months) : Array.from({ length: months }, () => 1);
  return splitByWeights(budget, weights);
}
