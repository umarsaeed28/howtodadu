import type { ListingQuery, ListingsProvider, RawListing } from "./provider";

/**
 * Flex MLS listings through the FBS Spark API (the API behind Flexmls).
 *
 * Needs SPARK_ACCESS_TOKEN: a Spark API key or OAuth access token issued with an
 * approved data license from the MLS (NWMLS), plus the broker's agreement.
 * Optional: SPARK_API_URL (default https://sparkapi.com/v1), SPARK_USER_AGENT.
 *
 * NOT VERIFIED against a live account: field names follow the Spark API "StandardFields"
 * documentation. Confirm them with your key before relying on this in production.
 */
const BASE = process.env.SPARK_API_URL ?? "https://sparkapi.com/v1";
const AGENT = process.env.SPARK_USER_AGENT ?? "pencil-dadu-map";

interface SparkStandardFields {
  ListingKey?: string;
  ListingId?: string;
  ListPrice?: number;
  UnparsedFirstLineAddress?: string;
  UnparsedAddress?: string;
  City?: string;
  PostalCode?: string;
  Latitude?: number | string;
  Longitude?: number | string;
  LotSizeSquareFeet?: number;
  LotSizeArea?: number;
  LotSizeUnits?: string;
  BuildingAreaTotal?: number;
  YearBuilt?: number;
  BedsTotal?: number;
  BathsTotal?: number;
  MlsStatus?: string;
  DaysOnMarket?: number;
  ModificationTimestamp?: string;
  Photos?: { Uri800?: string; Uri640?: string; UriLarge?: string }[];
}

const toNum = (v: number | string | undefined) => (v == null || v === "" ? 0 : Number(v));

function lotSqft(f: SparkStandardFields): number {
  if (f.LotSizeSquareFeet) return f.LotSizeSquareFeet;
  if (f.LotSizeArea) return /acre/i.test(f.LotSizeUnits ?? "") ? f.LotSizeArea * 43560 : f.LotSizeArea;
  return 0;
}

export function fromSpark(r: { Id?: string; StandardFields: SparkStandardFields }): RawListing {
  const f = r.StandardFields;
  return {
    mlsId: f.ListingKey ?? f.ListingId ?? r.Id ?? "",
    address: f.UnparsedAddress ?? f.UnparsedFirstLineAddress ?? "",
    city: f.City ?? "",
    zip: f.PostalCode ?? "",
    lat: toNum(f.Latitude),
    lng: toNum(f.Longitude),
    listPrice: f.ListPrice ?? 0,
    lotSqft: lotSqft(f),
    livingSqft: f.BuildingAreaTotal,
    yearBuilt: f.YearBuilt,
    beds: f.BedsTotal,
    baths: f.BathsTotal,
    status: f.MlsStatus ?? "Active",
    daysOnMarket: f.DaysOnMarket,
    photos: (f.Photos ?? []).map((p) => p.Uri800 ?? p.Uri640 ?? p.UriLarge).filter((u): u is string => !!u),
    updatedAt: f.ModificationTimestamp ?? new Date().toISOString(),
  };
}

export function toSparkFilter(q: ListingQuery): string {
  const c = ["PropertyType Eq 'A'", "MlsStatus Eq 'Active'", `City Eq '${q.city ?? "Seattle"}'`];
  if (q.zips?.length) c.push("(" + q.zips.map((z) => `PostalCode Eq '${z}'`).join(" Or ") + ")");
  if (q.minPrice != null) c.push(`ListPrice Ge ${q.minPrice}`);
  if (q.maxPrice != null) c.push(`ListPrice Le ${q.maxPrice}`);
  return c.join(" And ");
}

export class SparkProvider implements ListingsProvider {
  private token = process.env.SPARK_ACCESS_TOKEN ?? "";

  private async get(path: string, params: Record<string, string>) {
    if (!this.token) throw new Error("SPARK_ACCESS_TOKEN is not set.");
    const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json", "X-SparkApi-User-Agent": AGENT },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Spark API returned ${res.status}`);
    return res.json();
  }

  async search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    const limit = Math.min(q.pageSize ?? 250, 250);
    const data = await this.get("/listings", {
      _filter: toSparkFilter(q),
      _limit: String(limit),
      _page: String(q.page ?? 1),
      _expand: "Photos",
      _pagination: "1",
    });
    const results = (data.D?.Results ?? []) as { Id?: string; StandardFields: SparkStandardFields }[];
    let listings = results.map(fromSpark).filter((l) => l.lat && l.lng);
    if (q.bounds) {
      const b = q.bounds;
      listings = listings.filter((l) => l.lat <= b.north && l.lat >= b.south && l.lng <= b.east && l.lng >= b.west);
    }
    return { listings, total: data.D?.Pagination?.TotalRows ?? listings.length };
  }

  async getById(mlsId: string): Promise<RawListing | null> {
    const data = await this.get(`/listings/${encodeURIComponent(mlsId)}`, { _expand: "Photos" });
    const r = data.D?.Results?.[0];
    return r ? fromSpark(r) : null;
  }
}
