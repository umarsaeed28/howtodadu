/**
 * LP/GP distribution waterfall, European (whole-deal) style, settled at each distribution:
 *   1. Return of capital and the preferred return, pro rata, until all equity has earned `prefPct` a year (IRR).
 *   2. Each promote tier in turn: the LP takes `lpSharePct` of distributions (the GP the rest) until the LP's
 *      IRR to date reaches the tier's hurdle.
 *   3. Anything beyond the last hurdle is split at the last tier's share.
 * Contributions are pro rata by `lpPct`. IRRs use the same dated flows as the deal's XIRR.
 */
import { xirr, type DatedFlow } from "./finance";
import { roundCents, type Cents } from "./money";

export interface WaterfallInput {
  /** Equity cash flows by month: negative contributions, positive distributions. */
  flows: Cents[];
  /** Days from closing for each month index (for XIRR). */
  days: number[];
  lpPct: number;
  prefPct: number;
  tiers: { hurdleIrrPct: number; lpSharePct: number }[];
}

export interface WaterfallResult {
  lp: { contributions: Cents; distributions: Cents; irr: number | null; multiple: number | null; flows: Cents[] };
  gp: { contributions: Cents; distributions: Cents; irr: number | null; multiple: number | null; flows: Cents[] };
  /** Distributions by tier, whole deal. */
  byTier: { label: string; lp: Cents; gp: Cents }[];
}

/** The LP's IRR if it received `extra` more at index `at`, on top of `flows`. */
function lpIrrWith(flows: Cents[], days: number[], at: number, extra: Cents): number | null {
  const f: DatedFlow[] = flows.map((a, i) => ({ amount: a + (i === at ? extra : 0), day: days[i] }));
  return xirr(f);
}

/** Largest amount to the LP at `at` that keeps its IRR at or under `hurdle` (fraction). 0 when already over. */
function roomToHurdle(flows: Cents[], days: number[], at: number, hurdle: number, cap: Cents): Cents {
  const cur = lpIrrWith(flows, days, at, 0);
  if (cur != null && cur >= hurdle) return 0;
  if (cap <= 0) return 0;
  const atCap = lpIrrWith(flows, days, at, cap);
  if (atCap == null || atCap <= hurdle) return cap;
  let lo = 0, hi = cap;
  for (let k = 0; k < 60 && hi - lo > 1; k++) {
    const mid = Math.floor((lo + hi) / 2);
    const r = lpIrrWith(flows, days, at, mid);
    if (r != null && r > hurdle) hi = mid; else lo = mid;
  }
  return lo;
}

export function waterfall(inp: WaterfallInput): WaterfallResult {
  const lpShare = inp.lpPct / 100;
  const n = inp.flows.length;
  const lp: Cents[] = Array(n).fill(0), gp: Cents[] = Array(n).fill(0);
  const tiers = [{ label: "Return of capital and preferred return", hurdle: inp.prefPct / 100, lpShare }, ...inp.tiers.map((t, k) => ({ label: `Tier ${k + 1}: to ${t.hurdleIrrPct}% IRR`, hurdle: t.hurdleIrrPct / 100, lpShare: t.lpSharePct / 100 }))];
  const byTier = tiers.map((t) => ({ label: t.label, lp: 0, gp: 0 }));
  const residual = { label: "Above the last hurdle", lp: 0, gp: 0 };
  const lastShare = tiers[tiers.length - 1].lpShare;

  for (let m = 0; m < n; m++) {
    const f = inp.flows[m];
    if (f < 0) {
      const l = roundCents(f * lpShare);
      lp[m] += l;
      gp[m] += f - l;
      continue;
    }
    let left = f;
    for (let k = 0; k < tiers.length && left > 0; k++) {
      const t = tiers[k];
      // The LP's room under this hurdle bounds the whole-tier distribution through its share.
      const lpRoom = roomToHurdle(lp, inp.days, m, t.hurdle, roundCents(left * t.lpShare));
      if (lpRoom <= 0) continue;
      const tierTotal = t.lpShare > 0 ? Math.min(left, roundCents(lpRoom / t.lpShare)) : 0;
      const toLp = Math.min(lpRoom, roundCents(tierTotal * t.lpShare));
      const toGp = tierTotal - toLp;
      lp[m] += toLp;
      gp[m] += toGp;
      byTier[k].lp += toLp;
      byTier[k].gp += toGp;
      left -= tierTotal;
    }
    if (left > 0) {
      const toLp = roundCents(left * lastShare);
      lp[m] += toLp;
      gp[m] += left - toLp;
      residual.lp += toLp;
      residual.gp += left - toLp;
    }
  }
  const side = (flows: Cents[]) => {
    const contributions = -flows.filter((x) => x < 0).reduce((a, b) => a + b, 0);
    const distributions = flows.filter((x) => x > 0).reduce((a, b) => a + b, 0);
    return { contributions, distributions, irr: xirr(flows.map((a, i) => ({ amount: a, day: inp.days[i] }))), multiple: contributions > 0 ? distributions / contributions : null, flows };
  };
  return { lp: side(lp), gp: side(gp), byTier: [...byTier, residual] };
}
