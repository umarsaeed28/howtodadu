import type { ListingQuery, ListingsProvider, RawListing } from "./provider";

/**
 * Live provider stub targeting the RESO Web API for NWMLS via an aggregator
 * (MLS Grid or similar). Shape is real; credentials and network calls are TODO.
 *
 * Requires an NWMLS data agreement signed through a broker of record and use
 * within the aggregator's terms. Do not enable without that in place.
 */

// TODO: source from env / secret manager, never commit credentials.
const MLSGRID_BASE_URL = process.env.MLSGRID_BASE_URL ?? "https://api.mlsgrid.com/v2";
const MLSGRID_TOKEN = process.env.MLSGRID_TOKEN ?? ""; // TODO: bearer token
// TODO: member/originating system credentials required by the data agreement.

/** RESO Property resource fields we consume. */
interface ResoProperty {
  ListingKey: string;
  UnparsedAddress?: string;
  City?: string;
  PostalCode?: string;
  Latitude?: number;
  Longitude?: number;
  ListPrice?: number;
  LotSizeSquareFeet?: number;
  LivingArea?: number;
  YearBuilt?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  StandardStatus?: string;
  DaysOnMarket?: number;
  ModificationTimestamp?: string;
  Media?: { MediaURL?: string }[];
}

/** Map a RESO Property record into our RawListing shape. */
function fromReso(p: ResoProperty): RawListing {
  return {
    mlsId: p.ListingKey,
    address: p.UnparsedAddress ?? "",
    city: p.City ?? "",
    zip: p.PostalCode ?? "",
    lat: p.Latitude ?? 0,
    lng: p.Longitude ?? 0,
    listPrice: p.ListPrice ?? 0,
    lotSqft: p.LotSizeSquareFeet ?? 0,
    livingSqft: p.LivingArea,
    yearBuilt: p.YearBuilt,
    beds: p.BedroomsTotal,
    baths: p.BathroomsTotalInteger,
    status: p.StandardStatus ?? "Active",
    daysOnMarket: p.DaysOnMarket,
    photos: (p.Media ?? []).map((m) => m.MediaURL).filter((u): u is string => !!u),
    updatedAt: p.ModificationTimestamp ?? new Date().toISOString(),
  };
}

/** Build the RESO `$filter` clause from a ListingQuery. */
function toResoFilter(q: ListingQuery): string {
  const clauses: string[] = ["PropertyType eq 'Residential'"];
  if (q.minPrice != null) clauses.push(`ListPrice ge ${q.minPrice}`);
  if (q.maxPrice != null) clauses.push(`ListPrice le ${q.maxPrice}`);
  if (q.minLotSqft != null) clauses.push(`LotSizeSquareFeet ge ${q.minLotSqft}`);
  if (q.city) clauses.push(`City eq '${q.city}'`);
  // TODO: map bounds to a geospatial filter supported by the aggregator.
  return clauses.join(" and ");
}

export class MlsGridProvider implements ListingsProvider {
  async search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    // TODO: implement the authenticated RESO request, e.g.
    //   const url = `${MLSGRID_BASE_URL}/Property?$filter=${encodeURIComponent(toResoFilter(q))}&$top=${q.pageSize ?? 50}&$expand=Media`;
    //   const res = await fetch(url, { headers: { Authorization: `Bearer ${MLSGRID_TOKEN}` } });
    //   const json = await res.json();
    //   return { listings: json.value.map(fromReso), total: json["@odata.count"] ?? json.value.length };
    void MLSGRID_BASE_URL;
    void MLSGRID_TOKEN;
    void toResoFilter;
    void fromReso;
    throw new Error(
      "MlsGridProvider is not configured. Set MLSGRID_TOKEN and complete the RESO request, " +
        "and ensure an NWMLS data agreement is in place via your broker of record."
    );
  }

  async getById(mlsId: string): Promise<RawListing | null> {
    // TODO: GET `${MLSGRID_BASE_URL}/Property('${mlsId}')?$expand=Media` with auth, then fromReso().
    void mlsId;
    throw new Error("MlsGridProvider.getById is not configured.");
  }
}
