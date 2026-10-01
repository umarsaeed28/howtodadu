/**
 * Investor-facing analysis on top of the underwriting model: sensitivity grid and
 * maximum offer at a target margin. Used by the calculator page.
 * Pure functions. Every figure comes from DealInputs through computeWithScalars.
 */
import { computeFeasibility, computeWithScalars, type DealInputs, type DealResult } from "./model";

export const TARGET_MARGIN_PCT = 15;

export interface SensitivityGrid {
  /** Hard cost change in percent, one per row. */
  hardSteps: number[];
  /** Sale or rent value change in percent, one per column. */
  valueSteps: number[];
  /** marginOnCost in percent, [row][col]. */
  margin: number[][];
}

export function sensitivityGrid(
  inputs: DealInputs,
  hardSteps: number[] = [-10, 0, 10, 20],
  valueSteps: number[] = [-15, -10, -5, 0, 5, 10]
): SensitivityGrid {
  return {
    hardSteps,
    valueSteps,
    margin: hardSteps.map((h) =>
      valueSteps.map((v) => computeWithScalars(inputs, 1 + h / 100, 1 + v / 100).marginOnCost)
    ),
  };
}

/**
 * Highest purchase price that still clears the target margin on cost.
 * Margin falls as price rises, so bisect. Returns null when even a free lot misses the target.
 */
export function maxOffer(inputs: DealInputs, targetMarginPct: number = TARGET_MARGIN_PCT): number | null {
  const marginAt = (price: number) =>
    computeFeasibility({ ...inputs, acquisition: { ...inputs.acquisition, purchasePrice: price } }).marginOnCost;
  if (marginAt(0) < targetMarginPct) return null;
  let lo = 0;
  let hi = Math.max(inputs.acquisition.purchasePrice, 100_000) * 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (marginAt(mid) >= targetMarginPct) lo = mid;
    else hi = mid;
  }
  return Math.round(lo / 1000) * 1000;
}
