import { existsSync, readFileSync } from "node:fs";
import type { ListingsProvider, ListingQuery, RawListing } from "./provider";

/**
 * Test-only provider. Reads listings from the JSON file named by LISTINGS_FIXTURE_FILE.
 * Never the default: it exists so end-to-end tests can exercise the listing pins.
 */
export class FixtureListingsProvider implements ListingsProvider {
  private load(): RawListing[] {
    const file = process.env.LISTINGS_FIXTURE_FILE;
    if (!file || !existsSync(file)) return [];
    return JSON.parse(readFileSync(file, "utf8")) as RawListing[];
  }

  async search(q: ListingQuery): Promise<{ listings: RawListing[]; total: number }> {
    const all = this.load().filter((l) => !q.zips?.length || q.zips.includes(l.zip));
    return { listings: all, total: all.length };
  }

  async getById(id: string): Promise<RawListing | null> {
    return this.load().find((l) => l.mlsId === id) ?? null;
  }
}
