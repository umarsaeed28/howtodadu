import { MIN_SHOWN_SCORE } from "@/lib/dadu-score";

/**
 * The buy box: what the app shows, on market and off. Seattle single-family lots, zoned NR (NR, NR2, NR3; NR1 is out),
 * one unit on the lot (no existing ADU), lot of 3,800 sf or more, under 25% of the lot built on, and a DADU site score of
 * 75 or more. One place, so the map, the off-market dots and the listings feed never disagree.
 */
export const BUY_BOX = { minLotSqft: 3800, maxCoveragePct: 25, zones: ["NR", "NR2", "NR3"] } as const;

export interface BuyBoxLot {
  zoning: string | null;
  lotSqft: number;
  coveragePct?: number | null;
  existingAdus?: number | null;
  score: number;
}

/** Why a lot is outside the buy box, or null when it is inside. */
export function buyBoxMiss(l: BuyBoxLot): string | null {
  const zone = (l.zoning ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!(BUY_BOX.zones as readonly string[]).includes(zone)) return `zoning ${l.zoning ?? "unknown"}`;
  if (!(l.lotSqft >= BUY_BOX.minLotSqft)) return `lot ${l.lotSqft} sf`;
  if (l.coveragePct == null) return "lot coverage unknown";
  if (!(l.coveragePct < BUY_BOX.maxCoveragePct)) return `coverage ${l.coveragePct}%`;
  if ((l.existingAdus ?? 0) > 0) return "more than one unit";
  if (l.score < MIN_SHOWN_SCORE) return `score ${l.score}`;
  return null;
}

export const inBuyBox = (l: BuyBoxLot): boolean => buyBoxMiss(l) === null;
