import { createCache } from "./refresh-cache";
import type { ListingQuery, ListingsProvider, RawListing } from "./provider";

/**
 * Live on-market listings from DealMachine (https://api.docs.dealmachine.com). Needs DEALMACHINE_API_KEY.
 *
 * One pull every 2 days (the 11am Pacific cron, or the first request after 48 hours): every Seattle single-family home that is
 * Active on the MLS, NR zoning, one unit, lot 3,800 sf or more. About 650 homes, 250 a page, so 3 requests. Credits: 1 per
 * unique property per billing month (repeat pulls are free), and `contact_audience: "none"` keeps owner and contact data
 * (and their credits) out entirely. Page views read the cached copy (Supabase `listing_cache`) and never call DealMachine.
 *
 * DealMachine has no listing photos, description, agent or listing link; the listing page falls back to the assessor photo,
 * street view and aerial. Before showing this publicly, confirm DealMachine's terms allow displaying MLS-derived fields.
 */
const BASE = "https://api.v2.dealmachine.com/v1";
const SEATTLE_CITY_ID = "21637"; // from GET /v1/locations?q=Seattle&type=city&state=WA
/** Every 2 days. The cron forces the pull; this only stops page views from pulling sooner. */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const PER_PAGE = 250;
const MAX_PAGES = 12; // 3,000 homes: far above Seattle's active count, a guard against a filter mistake spending credits

/** The buy box on DealMachine's side. The app applies the rest (coverage, score) once a listing is matched to its lot. */
export const DM_ACTIVE_FILTERS = [
  { filter_id: "property_type", operator: "contains_any", value: [1] }, // Single Family
  { filter_id: "zoning", operator: "starts_with", value: "NR" },
  { filter_id: "num_units", operator: "equals", value: 1 },
  { filter_id: "lot_size_sqft", operator: "greater_than_or_equal", value: 3800 },
  { filter_id: "is_mls_active", value: true },
];
const FIELDS = ["mls_current_listing_price", "mls_days_on_market", "mls_last_initial_listing_date", "market_status", "lot_size_sqft", "year_built", "living_area_sqft", "num_bedrooms", "num_bathrooms", "has_hoa", "hoa_1_fee_amount", "zoning", "num_units"];

type Obj = Record<string, unknown>;
const num = (v: unknown): number | undefined => {
  const x = typeof v === "string" ? Number(v.replace(/[^0-9.\-]/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : undefined;
};
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** One DealMachine property record as a listing. Null when it lacks what the map needs (price, place). */
export function fromDealMachine(r: Obj): RawListing | null {
  const id = str(r.dm_property_id);
  const lat = num(r.latitude), lng = num(r.longitude), price = num(r.mls_current_listing_price);
  const street = str(r.address);
  if (!id || lat == null || lng == null || !price || !street) return null;
  const zip = str(r.zip) ?? "";
  const city = str(r.city) ? title(str(r.city)!) : "Seattle";
  // has_hoa arrives as "Yes"/"No" (or a boolean); a fee only counts when there is one.
  const hoaFlag = typeof r.has_hoa === "boolean" ? r.has_hoa : str(r.has_hoa)?.toLowerCase() === "yes" ? true : str(r.has_hoa)?.toLowerCase() === "no" ? false : undefined;
  const fee = num(r.hoa_1_fee_amount);
  const images = (r.images && typeof r.images === "object" ? r.images : {}) as Obj;
  return {
    mlsId: `dm-${id.replace(/^prop_/, "")}`,
    address: `${street}, ${city}, ${str(r.state) ?? "WA"} ${zip}`.trim(),
    city,
    zip,
    lat,
    lng,
    listPrice: price,
    lotSqft: num(r.lot_size_sqft) ?? 0,
    livingSqft: num(r.living_area_sqft),
    yearBuilt: num(r.year_built),
    beds: num(r.num_bedrooms),
    baths: num(r.num_bathrooms),
    status: (str(r.market_status) ?? "active").toLowerCase(),
    daysOnMarket: num(r.mls_days_on_market),
    photos: [str(images.street_view)].filter((x): x is string => !!x),
    propertyType: "Single family",
    hoaMonthly: hoaFlag === false ? 0 : fee != null ? fee : undefined,
    updatedAt: str(r.mls_last_initial_listing_date) ?? new Date().toISOString(),
  };
}

async function search(page: number): Promise<{ data: Obj[]; hasNext: boolean }> {
  const key = process.env.DEALMACHINE_API_KEY;
  if (!key) throw new Error("DEALMACHINE_API_KEY is not set.");
  const res = await fetch(`${BASE}/properties/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ locations: [{ type: "city", code: SEATTLE_CITY_ID }], filters: DM_ACTIVE_FILTERS, fields: FIELDS, contact_audience: "none", page, per_page: PER_PAGE }),
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`DealMachine ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { data?: Obj[]; pagination?: { has_next_page?: boolean } };
  return { data: j.data ?? [], hasNext: !!j.pagination?.has_next_page };
}

async function pullAll(): Promise<RawListing[]> {
  const out: RawListing[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await search(page);
    for (const x of r.data) {
      const l = fromDealMachine(x);
      if (l) out.push(l);
    }
    if (!r.hasNext) break;
  }
  return out;
}

export const dealMachineCache = createCache<RawListing[]>("dealmachine-active", pullAll, MAX_AGE_MS);

export class DealMachineProvider implements ListingsProvider {
  async search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    const { value } = await dealMachineCache.get();
    const zips = q.zips?.length ? new Set(q.zips) : null;
    const listings = value.filter((l) => (!zips || zips.has(l.zip)) && (q.minPrice == null || l.listPrice >= q.minPrice) && (q.maxPrice == null || l.listPrice <= q.maxPrice));
    return { listings, total: listings.length };
  }
  async getById(mlsId: string): Promise<RawListing | null> {
    const { value } = await dealMachineCache.get();
    return value.find((l) => l.mlsId === mlsId) ?? null;
  }
}
