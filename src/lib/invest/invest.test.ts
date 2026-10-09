import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, mergeAssumptions } from "./assumptions";
import { underwrite } from "./underwriting";
import { buildOpportunity, DEFAULT_FILTERS, filterOpportunities, insightFor, rankOpportunities, type OpportunityInput } from "./opportunity";

const base: OpportunityInput = {
  id: "a", address: "123 MAIN ST, Seattle, WA 98103", zip: "98103", lat: 47.6, lng: -122.3, price: 900_000, photo: null, photos: [],
  beds: 3, baths: 2, sqft: 1500, lotSqft: 5000, daysOnMarket: 10, pin: "1234567890", score: 90, tier: 2, alley: false,
  corner: false, lotWidth: 50, lotDepth: 100, sideClearanceFt: null, daduSqft: 1000, brokerage: null, listingUrl: null,
};

describe("underwrite", () => {
  it("adds up the project cost and cash required from the stated assumptions", () => {
    const u = underwrite({ price: 900_000, daduSqft: 1000, houseSqft: 1500 }, DEFAULT_ASSUMPTIONS);
    expect(u.buildCost).toBe(450_000);
    expect(u.softCosts).toBe(3_000 + 5_000 + 15_000);
    expect(u.downPayment).toBe(180_000);
    expect(u.totalProjectCost).toBe(900_000 + 450_000 + 23_000);
    expect(u.cashRequired).toBe(180_000 + 450_000 + 23_000);
    expect(u.allInPerSf).toBe(Math.round(1_373_000 / 2_500));
  });

  it("financing the build takes it out of the cash required and shows a year of interest", () => {
    const u = underwrite({ price: 900_000, daduSqft: 1000 }, { ...DEFAULT_ASSUMPTIONS, financeConstruction: true, interestRatePct: 8 });
    expect(u.cashRequired).toBe(180_000 + 23_000);
    expect(u.financingCost).toBe(36_000);
    expect(u.allInPerSf).toBeNull();
  });
});

describe("assumptions", () => {
  it("keeps valid stored values, clamps the rest and ignores junk", () => {
    const a = mergeAssumptions({ buildCostPerSf: "500", downPaymentPct: 250, cityFees: "x", financeConstruction: true });
    expect(a.buildCostPerSf).toBe(500);
    expect(a.downPaymentPct).toBe(100);
    expect(a.cityFees).toBe(DEFAULT_ASSUMPTIONS.cityFees);
    expect(a.financeConstruction).toBe(true);
  });
});

describe("opportunities", () => {
  it("caps the DADU at 1,000 sf and writes a factual insight", () => {
    const o = buildOpportunity({ ...base, daduSqft: 1400, alley: true, lotDepth: 130 }, DEFAULT_ASSUMPTIONS);
    expect(o.daduSqft).toBe(1000);
    expect(o.insight).toBe("Alley access and a deep rear yard. Fits a two-story DADU up to 1,000 sf.");
    expect(insightFor({ alley: false, corner: false, lotSqft: 4200, lotDepth: 90, sideClearanceFt: null, daduSqft: 450 })).toBe("A 4,200 sf lot. Fits a DADU up to 450 sf.");
  });

  it("keeps only lots that take the largest DADU, ranks by score and badges the top five", () => {
    const list = Array.from({ length: 9 }, (_, i) => buildOpportunity({ ...base, id: String(i), score: 99 - i, price: 500_000 + i * 100_000, daysOnMarket: i }, DEFAULT_ASSUMPTIONS));
    const small = buildOpportunity({ ...base, id: "small", score: 100, daduSqft: 800 }, DEFAULT_ASSUMPTIONS);
    const ranked = rankOpportunities([small, ...list]);
    expect(ranked.some((o) => o.id === "small")).toBe(false);
    expect(ranked.filter((o) => o.topPick).map((o) => o.id)).toEqual(["0", "1", "2", "3", "4"]);
    const cheap = filterOpportunities(ranked, { ...DEFAULT_FILTERS, maxPrice: 700_000, sort: "newest" });
    expect(cheap.map((o) => o.id)).toEqual(["0", "1", "2"]);
    expect(ranked.find((o) => o.id === "0")?.newToday).toBe(true);
  });
});
