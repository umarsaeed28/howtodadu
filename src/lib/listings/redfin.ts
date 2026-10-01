import { createCache } from "./refresh-cache";
import type { ListingDetail, ListingQuery, ListingsProvider, RawListing } from "./provider";

/**
 * Redfin listings through the HasData API (the same service as the "redfin" MCP server).
 * Needs HASDATA_API_KEY. Pulled at most once every 12 hours, see ./refresh-cache.ts.
 *
 * NOT VERIFIED against a live response: the key available while this was written returned 401, so the
 * field names below follow HasData's documented Redfin schema and are read defensively. Run a refresh
 * with a valid key and check /api/map-listings before relying on it.
 */
const BASE = process.env.HASDATA_API_URL ?? "https://api.hasdata.com/scrape/redfin";
const MAX_PAGES = Number(process.env.REDFIN_MAX_PAGES ?? 12);

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const n = (v: unknown): number | undefined => {
  const x = typeof v === "string" ? Number(v.replace(/[^0-9.\-]/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : undefined;
};
const s = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
/** Redfin values often arrive as { value } or plain numbers. */
const val = (v: unknown) => n(o(v).value ?? v);

async function call(path: string, params: Record<string, string | string[]>): Promise<Obj> {
  const key = process.env.HASDATA_API_KEY;
  if (!key) throw new Error("HASDATA_API_KEY is not set.");
  const u = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) (Array.isArray(v) ? v : [v]).forEach((x) => u.searchParams.append(Array.isArray(v) ? `${k}[]` : k, x));
  const res = await fetch(u, { headers: { "x-api-key": key }, cache: "no-store" });
  if (!res.ok) throw new Error(`HasData ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()) as Obj;
}

export function fromRedfin(r: Obj): RawListing | null {
  const coords = o(r.coordinates ?? r.latLong ?? r.location);
  const lat = n(coords.latitude ?? coords.lat ?? r.latitude ?? r.lat);
  const lng = n(coords.longitude ?? coords.lng ?? coords.lon ?? r.longitude ?? r.lng);
  const price = val(r.price ?? r.listPrice);
  const addr = o(r.address);
  const street = s(r.address) ?? s(addr.streetAddress) ?? s(addr.street) ?? s(r.streetLine) ?? "";
  const url = s(r.url) ?? s(r.redfinUrl);
  const id = s(r.mlsId) ?? s(r.mlsNumber) ?? String(r.propertyId ?? r.listingId ?? url ?? "");
  if (!id || lat == null || lng == null || !price || !street) return null;
  const photos = Array.isArray(r.photos) ? (r.photos as unknown[]).map((p) => s(p) ?? s(o(p).url)).filter((x): x is string => !!x) : [];
  const status = (s(r.status) ?? "active").toLowerCase();
  return {
    mlsId: id,
    address: [street, s(addr.city) ?? s(r.city), s(addr.state) ?? s(r.state), s(addr.zip) ?? s(r.zip) ?? s(r.postalCode)].filter(Boolean).join(", "),
    city: s(addr.city) ?? s(r.city) ?? "Seattle",
    zip: s(addr.zip) ?? s(r.zip) ?? s(r.postalCode) ?? "",
    lat,
    lng,
    listPrice: price,
    lotSqft: val(r.lotSize ?? r.lotSqft) ?? 0,
    livingSqft: val(r.squareFeet ?? r.sqft ?? r.squareFootage),
    yearBuilt: n(r.yearBuilt),
    beds: n(r.beds ?? r.bedrooms),
    baths: n(r.baths ?? r.bathrooms),
    status,
    daysOnMarket: n(r.daysOnMarket ?? r.dom),
    photos,
    listingUrl: url ? (url.startsWith("http") ? url : `https://www.redfin.com${url}`) : undefined,
    propertyType: s(r.propertyType),
    hoaMonthly: val(r.hoa ?? r.hoaFee ?? r.hoaDues),
    updatedAt: new Date().toISOString(),
  };
}

const listArr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

export function fromRedfinDetail(r: Obj): ListingDetail {
  const p = o(r.property ?? r);
  const photos = listArr(p.photos).map((x) => s(x) ?? s(o(x).url)).filter((x): x is string => !!x);
  const sc = o(p.scores ?? p.walkScore);
  return {
    description: s(p.description) ?? s(p.remarks),
    photos: photos.length ? photos : (Array.isArray(p.photos) ? (p.photos as string[]) : []),
    propertyType: s(p.propertyType),
    hoaMonthly: val(p.hoa ?? p.hoaFee),
    estimate: val(p.redfinEstimate ?? p.estimate),
    pricePerSqft: val(p.pricePerSqft),
    garage: s(p.garage) ?? s(p.parking),
    priceHistory: listArr(p.priceHistory).map((h) => ({ date: s(h.date) ?? "", event: s(h.event) ?? s(h.description) ?? "", price: val(h.price) })).filter((h) => h.date),
    taxHistory: listArr(p.taxHistory).map((t) => ({ year: n(t.year) ?? 0, tax: val(t.taxPaid ?? t.tax), assessed: val(t.assessedValue ?? t.assessed) })).filter((t) => t.year),
    schools: listArr(p.schools).map((x) => ({ name: s(x.name) ?? "", rating: n(x.rating ?? x.greatSchoolsRating), level: s(x.level ?? x.type), distance: s(x.distance) })).filter((x) => x.name),
    scores: { walk: n(sc.walk ?? p.walkScore), transit: n(sc.transit ?? p.transitScore), bike: n(sc.bike ?? p.bikeScore) },
    agent: s(o(p.listingAgent).name) ?? s(p.listingAgent),
    brokerage: s(p.brokerage) ?? s(o(p.listingAgent).brokerage),
  };
}

/** One full pull: every page of Seattle single-family listings. Runs at most once per 12 hours. */
async function pullAll(): Promise<RawListing[]> {
  const out = new Map<string, RawListing>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await call("listing", { keyword: "Seattle, WA", type: "forSale", homeTypes_: ["house"], page: String(page) });
    const rows = listArr(body.properties ?? body.listings ?? body.results ?? body.data);
    if (!rows.length) break;
    for (const row of rows) {
      const l = fromRedfin(row);
      if (l) out.set(l.mlsId, l);
    }
  }
  return [...out.values()];
}

export const listingsCache = createCache<RawListing[]>("redfin-listings", pullAll);

const detailCaches = new Map<string, ReturnType<typeof createCache<ListingDetail>>>();
export function getDetail(listing: RawListing): Promise<ListingDetail> {
  if (!listing.listingUrl) return Promise.resolve({ photos: listing.photos, priceHistory: [], taxHistory: [], schools: [], scores: {} });
  let c = detailCaches.get(listing.mlsId);
  if (!c) {
    const url = listing.listingUrl;
    c = createCache<ListingDetail>(`redfin-detail-${listing.mlsId.replace(/\W/g, "")}`, async () => fromRedfinDetail(await call("property", { url })));
    detailCaches.set(listing.mlsId, c);
  }
  return c.get().then((r) => r.value);
}

export class RedfinProvider implements ListingsProvider {
  async search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    const { value } = await listingsCache.get();
    const list = value.filter((l) => (!q.zips?.length || q.zips.includes(l.zip)) && (q.maxPrice == null || l.listPrice <= q.maxPrice));
    return { listings: list, total: list.length };
  }
  async getById(id: string): Promise<RawListing | null> {
    const { value } = await listingsCache.get();
    return value.find((l) => l.mlsId === id) ?? null;
  }
}
