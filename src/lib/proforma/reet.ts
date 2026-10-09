/**
 * Washington real estate excise tax (REET). The state portion is graduated by selling price (RCW 82.45.060); the
 * thresholds reset every four years. A local portion is added by the city or county. The seller owes it
 * (RCW 82.45.080), so a proforma charges it at the sale, not the purchase, unless the buyer agrees to pay it.
 *
 * Rates and dates come from content/claims.json (ids reet_state_tiers_2023, reet_state_tiers_2027,
 * reet_local_seattle); this file only applies them.
 */
import { pctOf, roundCents, type Cents } from "./money";

export interface ReetTier {
  /** Upper bound of the tier in cents, or null for the top tier. */
  upTo: Cents | null;
  ratePct: number;
}

export interface ReetSchedule {
  /** ISO dates the schedule applies to, inclusive. */
  from: string;
  to: string | null;
  tiers: ReetTier[];
}

/** State tiers in force 2023-01-01 to 2026-12-31 (claims.json: reet_state_tiers_2023). */
export const WA_STATE_REET_2023: ReetSchedule = {
  from: "2023-01-01",
  to: "2026-12-31",
  tiers: [
    { upTo: 525_000_00, ratePct: 1.1 },
    { upTo: 1_525_000_00, ratePct: 1.28 },
    { upTo: 3_025_000_00, ratePct: 2.75 },
    { upTo: null, ratePct: 3.0 },
  ],
};

/** Thresholds from 2027-01-01 per the RCW 82.45.060 adjustment (claims.json: reet_state_tiers_2027). */
export const WA_STATE_REET_2027: ReetSchedule = {
  from: "2027-01-01",
  to: null,
  tiers: [
    { upTo: 551_000_00, ratePct: 1.1 },
    { upTo: 1_551_000_00, ratePct: 1.28 },
    { upTo: 3_051_000_00, ratePct: 2.75 },
    { upTo: null, ratePct: 3.0 },
  ],
};

export const WA_STATE_REET_SCHEDULES = [WA_STATE_REET_2023, WA_STATE_REET_2027];

/** The schedule in force on an ISO date (the latest whose `from` is on or before it). */
export function stateScheduleOn(isoDate: string): ReetSchedule {
  const inForce = WA_STATE_REET_SCHEDULES.filter((s) => s.from <= isoDate && (s.to == null || isoDate <= s.to));
  return inForce[inForce.length - 1] ?? WA_STATE_REET_2023;
}

/** Graduated state tax on a selling price: each tier's rate on the slice of price inside it. */
export function stateReet(priceCents: Cents, schedule: ReetSchedule): Cents {
  let tax = 0, lower = 0;
  for (const t of schedule.tiers) {
    const upper = t.upTo ?? Infinity;
    if (priceCents <= lower) break;
    const slice = Math.min(priceCents, upper) - lower;
    tax += pctOf(slice, t.ratePct);
    lower = upper;
  }
  return roundCents(tax);
}

export interface ReetBreakdown {
  state: Cents;
  local: Cents;
  total: Cents;
  effectivePct: number;
}

/** State plus local REET on a selling price. `localPct` is the city or county add-on (Seattle: claims.json reet_local_seattle). */
export function reet(priceCents: Cents, isoDate: string, localPct: number): ReetBreakdown {
  const state = stateReet(priceCents, stateScheduleOn(isoDate));
  const local = pctOf(priceCents, localPct);
  const total = state + local;
  return { state, local, total, effectivePct: priceCents > 0 ? (total / priceCents) * 100 : 0 };
}
