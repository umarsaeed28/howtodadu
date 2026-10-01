import { describe, expect, it } from "vitest";
import { assessListing, hoaExcluded } from "../dadu-assessment";
import type { RawListing } from "@/lib/listings";

const base: RawListing = {
  mlsId: "t1", address: "1 Test St, Seattle, WA 98105", city: "Seattle", zip: "98105", lat: 47.66, lng: -122.32,
  listPrice: 800000, lotSqft: 4000, status: "active", photos: [], updatedAt: "2026-10-01T00:00:00Z",
};

describe("HOA screening rule", () => {
  it("excludes any listing with HOA dues", () => {
    expect(hoaExcluded({ hoaMonthly: 1 })).toBe(true);
    expect(hoaExcluded({ hoaMonthly: 250 })).toBe(true);
  });
  it("treats zero as no HOA and missing as unknown, not excluded", () => {
    expect(hoaExcluded({ hoaMonthly: 0 })).toBe(false);
    expect(hoaExcluded({})).toBe(false);
  });
  it("returns the exclusion without calling Claude or the RAG", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const a = await assessListing({ ...base, hoaMonthly: 300 }, null);
    process.env.ANTHROPIC_API_KEY = saved;
    expect(a.verdict).toBe("excluded");
    expect(a.models).toEqual([]);
    expect(a.trace).toHaveLength(1);
    expect(a.headline).toMatch(/HOA/);
  });
});
