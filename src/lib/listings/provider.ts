/**
 * Listings data layer.
 *
 * Listings are fed by the MLS through a licensed aggregator. We never scrape
 * Redfin or Zillow. The default provider is a mock sourced from the app's own
 * sample parcels so the app runs today; the live feed is a one env swap
 * (LISTINGS_PROVIDER=mlsgrid). See ./index.ts.
 *
 * IMPORTANT: live listing data requires an NWMLS data agreement signed through a
 * broker of record, and use within the aggregator's (e.g. MLS Grid) terms.
 */

export interface ListingQuery {
  bounds?: { north: number; south: number; east: number; west: number };
  city?: string;
  zips?: string[];
  minPrice?: number;
  maxPrice?: number;
  minLotSqft?: number;
  status?: ("active" | "pending" | "coming_soon")[];
  page?: number;
  pageSize?: number;
}

export interface RawListing {
  mlsId: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  listPrice: number;
  lotSqft: number;
  livingSqft?: number;
  yearBuilt?: number;
  beds?: number;
  baths?: number;
  status: string;
  daysOnMarket?: number;
  photos: string[];
  listingUrl?: string;
  propertyType?: string;
  /** Monthly HOA dues. Undefined means unknown, not zero. */
  hoaMonthly?: number;
  /** Rich fields supplied up front (the dataset fixture). The Redfin provider loads these on demand instead. */
  detail?: ListingDetail;
  updatedAt: string;
}

/** Rich fields from the property page. Loaded on demand, cached for 12 hours. */
export interface ListingDetail {
  description?: string;
  photos: string[];
  propertyType?: string;
  hoaMonthly?: number;
  estimate?: number;
  pricePerSqft?: number;
  garage?: string;
  priceHistory: { date: string; event: string; price?: number }[];
  taxHistory: { year: number; tax?: number; assessed?: number }[];
  schools: { name: string; rating?: number; level?: string; distance?: string }[];
  scores: { walk?: number; transit?: number; bike?: number };
  agent?: string;
  brokerage?: string;
}

export interface ListingsProvider {
  search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }>;
  getById(mlsId: string): Promise<RawListing | null>;
}
