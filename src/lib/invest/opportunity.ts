import { DADU_MAX_GROSS_SQFT } from "@/lib/adu-analysis";
import type { InvestAssumptions } from "./assumptions";
import { areaFor } from "./areas";
import { underwrite, type Underwriting } from "./underwriting";

/** One screened listing with the lot facts it was screened on and its underwriting: a map card and an investment summary. */
export interface Opportunity {
  /** The listing id. */
  id: string;
  address: string;
  street: string;
  zip: string;
  area: string;
  lat: number;
  lng: number;
  price: number;
  photo: string | null;
  /** Up to five images: the listing's own photos first, then street-level and aerial imagery of the lot. */
  photos: string[];
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number;
  daysOnMarket: number | null;
  pin: string;
  score: number;
  tier: number;
  alley: boolean;
  corner: boolean;
  lotWidth: number | null;
  lotDepth: number | null;
  sideClearanceFt: number | null;
  /** The biggest DADU the lot allows (capped at the code's 1,000 sf). */
  daduSqft: number;
  /** Listing brokerage, when the feed names it (IDX attribution). */
  brokerage: string | null;
  /** The listing page at the source, when there is one. */
  listingUrl: string | null;
  insight: string;
  u: Underwriting;
  /** The map's "Top pick" grade: a DADU score of 93 or more (tier 3). */
  topPick: boolean;
  newToday: boolean;
  /** Under contract: shown with a tag, never ranked first. */
  pending: boolean;
}

/** The screened listing an opportunity is built from (the lot library's facts joined to the listing). */
export interface OpportunityInput {
  id: string;
  address: string;
  zip: string;
  lat: number;
  lng: number;
  price: number;
  photo: string | null;
  photos: string[];
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number;
  daysOnMarket: number | null;
  pin: string;
  score: number;
  tier: number;
  alley: boolean;
  corner: boolean;
  lotWidth: number | null;
  lotDepth: number | null;
  sideClearanceFt: number | null;
  daduSqft: number | null;
  brokerage: string | null;
  listingUrl: string | null;
  pending: boolean;
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export const streetOf = (address: string) => titleCase(address.split(",")[0].trim());
const sfText = (n: number) => `${Math.round(n).toLocaleString("en-US")} sf`;

/**
 * One line on what makes the lot work, from facts only: access, lot size and shape, and the DADU it allows.
 * Like the engine's footprint (adu-analysis.ts), a DADU of 500 sf or more is laid out on two stories.
 */
export function insightFor(i: Pick<OpportunityInput, "alley" | "corner" | "lotSqft" | "lotDepth" | "sideClearanceFt"> & { daduSqft: number }): string {
  const access = i.alley ? "Alley access" : i.corner ? "A corner lot with two street sides" : i.sideClearanceFt != null && i.sideClearanceFt >= 10 ? `A ${Math.round(i.sideClearanceFt)} ft side yard for access` : null;
  const yard = i.lotDepth != null && i.lotDepth >= 120 ? "a deep rear yard" : i.lotSqft >= 7000 ? `a ${sfText(i.lotSqft)} lot` : null;
  const first = access && yard ? `${access} and ${yard}.` : access ? `${access}.` : yard ? `${yard[0].toUpperCase()}${yard.slice(1)}.` : `A ${sfText(i.lotSqft)} lot.`;
  const fits = i.daduSqft >= 500 ? `Fits a two-story DADU up to ${sfText(i.daduSqft)}.` : `Fits a DADU up to ${sfText(i.daduSqft)}.`;
  return `${first} ${fits}`;
}

export function buildOpportunity(i: OpportunityInput, a: InvestAssumptions): Opportunity {
  const daduSqft = Math.min(DADU_MAX_GROSS_SQFT, Math.max(0, Math.round(i.daduSqft ?? 0)));
  return {
    ...i,
    street: streetOf(i.address),
    area: areaFor(i.zip),
    daduSqft,
    insight: insightFor({ ...i, daduSqft }),
    u: underwrite({ price: i.price, daduSqft, houseSqft: i.sqft }, a),
    topPick: i.tier === 3,
    newToday: i.daysOnMarket != null && i.daysOnMarket <= 1,
  };
}

/** A lot qualifies when it can take the largest DADU the code allows (1,000 sf). */
export const takesMaxDadu = (o: Pick<Opportunity, "daduSqft">) => o.daduSqft >= DADU_MAX_GROSS_SQFT;

/**
 * Orders the feed: lots that take the largest DADU first, then by Pencil's DADU score, with lower cash required
 * breaking a tie; pending listings go last. TODO(comps): rank by return on cost once MLS comps give sale values.
 */
export function rankOpportunities(list: Opportunity[]): Opportunity[] {
  return [...list].sort(
    (x, y) => Number(x.pending) - Number(y.pending) || Number(takesMaxDadu(y)) - Number(takesMaxDadu(x)) || y.score - x.score || x.u.cashRequired - y.u.cashRequired,
  );
}

/** The best opportunities for the home page: on the market, taking the largest DADU, in feed order. */
export const bestOpportunities = (list: Opportunity[], n: number) => list.filter((o) => !o.pending && takesMaxDadu(o)).slice(0, n);

/** What a tile needs: the map's cards and the home section both draw from this. */
export type TileData = Pick<Opportunity, "id" | "price" | "photo" | "area" | "street" | "score" | "daduSqft" | "insight" | "topPick" | "newToday" | "pending" | "brokerage"> & {
  u: Pick<Underwriting, "cashRequired" | "totalProjectCost">;
};

export const toTile = (o: Opportunity): TileData => ({
  id: o.id, price: o.price, photo: o.photo, area: o.area, street: o.street, score: o.score, daduSqft: o.daduSqft, insight: o.insight,
  topPick: o.topPick, newToday: o.newToday, pending: o.pending, brokerage: o.brokerage, u: { cashRequired: o.u.cashRequired, totalProjectCost: o.u.totalProjectCost },
});
