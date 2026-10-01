import type { ListingsProvider, ListingQuery, RawListing } from "./provider";

/** Default provider: no MLS connected, so no listings. The map says so instead of showing fakes. */
export class NoListingsProvider implements ListingsProvider {
  async search(_q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    void _q;
    return { listings: [], total: 0 };
  }
  async getById(_id: string): Promise<RawListing | null> {
    void _id;
    return null;
  }
}
