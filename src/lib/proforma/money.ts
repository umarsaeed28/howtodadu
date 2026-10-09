/**
 * Money is integer cents everywhere in the proforma engine. A JS number holds every cent up to $90 trillion exactly,
 * so sums never drift; only multiplications by a rate produce fractions, and each one is rounded here, once, the
 * way Excel's ROUND does (half away from zero), so the exported workbook reconciles to the cent.
 */
export type Cents = number;

/** Round to whole cents, half away from zero (Excel ROUND). */
export function roundCents(x: number): Cents {
  if (!Number.isFinite(x)) throw new Error(`Not a finite amount: ${x}`);
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** `pct` percent of an amount, in cents. */
export const pctOf = (amount: Cents, pct: number): Cents => roundCents((amount * pct) / 100);

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Dollars (a number the UI typed) to cents. */
export const dollars = (d: number): Cents => roundCents(d * 100);

/** Cents to a ratio of a base, or null when the base is zero. */
export const ratio = (part: Cents, base: Cents): number | null => (base === 0 ? null : part / base);

/** Split `total` into `n` parts that sum exactly to `total`; the last part takes the rounding. */
export function splitEvenly(total: Cents, n: number): Cents[] {
  if (n <= 0) return [];
  const each = roundCents(total / n);
  const parts = Array.from({ length: n }, () => each);
  parts[n - 1] = total - each * (n - 1);
  return parts;
}

/** Split `total` by weights (any non-negative numbers) so the parts sum exactly to `total`. */
export function splitByWeights(total: Cents, weights: readonly number[]): Cents[] {
  const w = sum(weights);
  if (weights.length === 0) return [];
  if (w <= 0) return splitEvenly(total, weights.length);
  let running = 0;
  const parts: Cents[] = [];
  let cumWeight = 0;
  for (let i = 0; i < weights.length; i++) {
    cumWeight += weights[i];
    // Cumulative rounding: each part is the rounded cumulative total less what was already given out, so the parts
    // always add up to the total and no single part carries all the rounding.
    const cum = i === weights.length - 1 ? total : roundCents((total * cumWeight) / w);
    parts.push(cum - running);
    running = cum;
  }
  return parts;
}
