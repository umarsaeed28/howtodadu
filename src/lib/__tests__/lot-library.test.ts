import { describe, it, expect } from "vitest";
import { decodeLibrary, encodeLibrary, makeLotFinder, zipCounts } from "../lot-library";
import { parcelWhere, toEligibleParcel, tierOf, MAX_ADUS_PER_LOT } from "../server/candidates";
import type { Candidate } from "../server/candidates";
import { fromSpark, toSparkFilter } from "../listings/spark";

const lot = (o: Partial<Candidate> = {}): Candidate => ({
  pin: "0000000001",
  address: "100 MAIN ST 98103",
  zip: "98103",
  corner: true,
  topPick: true,
  tier: 3,
  lat: 47.66,
  lng: -122.35,
  lotWidth: 50,
  lotDepth: 120,
  existingAdus: 0,
  sideClearanceFt: 14,
  score: 88,
  zoning: "SF 5000",
  lotSqft: 5000,
  lotType: "corner",
  alley: false,
  canopyPct: 0.1,
  steepPct: null,
  adusNearby: 3,
  daduSqft: 1000,
  trees: null,
  coveragePct: 18.5,
  grade: null,
  ...o,
});

describe("lot library", () => {
  const rows = [
    lot({ trees: { large: 1, medium: 3, small: 2, canopyPct: 24, clearSqft: 640, clearSqftIfMediumRemoved: 1200 }, grade: { slopePct: 12.4, riseFt: 4.1 } }),
    lot({ pin: "0000000002", zip: "98107", lat: 47.67, tier: 1, topPick: false }),
  ];

  it("round-trips through the columnar format", () => {
    expect(decodeLibrary(encodeLibrary(rows, "test"))).toEqual(rows);
  });

  it("filters by ZIP", () => {
    const out = decodeLibrary(encodeLibrary(rows, "test"), ["98107"]);
    expect(out.map((r) => r.pin)).toEqual(["0000000002"]);
  });

  it("counts lots and top picks per ZIP", () => {
    expect(zipCounts(encodeLibrary(rows, "test"))).toEqual([
      { zip: "98103", lots: 1, topPicks: 1 },
      { zip: "98107", lots: 1, topPicks: 0 },
    ]);
  });

  it("finds the nearest lot within range and nothing beyond it", () => {
    const find = makeLotFinder(rows);
    expect(find(47.6601, -122.35, 40)?.pin).toBe("0000000001");
    expect(find(47.7, -122.2, 40)).toBeNull();
  });
});

describe("tiers", () => {
  it("follow the guide's grade bands", () => {
    expect(tierOf(100)).toBe(3);
    expect(tierOf(93)).toBe(3);
    expect(tierOf(92)).toBe(2);
    expect(tierOf(82)).toBe(2);
    expect(tierOf(81)).toBe(1);
    expect(tierOf(70)).toBe(1);
    expect(tierOf(69)).toBe(0);
  });
  it("asks only for private single-family homes in the NR base zone", () => {
    const w = parcelWhere();
    expect(w).toContain("BASE_ZONE='NR'");
    expect(w).toContain("PRES_USE='Single Family(Res Use/Zone)'");
    expect(w).toContain("PUB_OWN_TYPE='PRIVATE'");
    expect(w).not.toContain("LIKE");
  });
  it("applies no minimum lot size and keeps the two-ADU cap", () => {
    expect(MAX_ADUS_PER_LOT).toBe(2);
    expect(toEligibleParcel({ PIN: "1", ADDRESS: "1  A  ST", STR_ZIP: "98103", LOT_SQFT: 2400, ZONING: "NR" })?.lotSqft).toBe(2400);
  });
  it("drops parcels with no street address or area", () => {
    expect(toEligibleParcel({ PIN: "1", ADDRESS: "", STR_ZIP: "98103", LOT_SQFT: 5000, ZONING: "NR" })).toBeNull();
    expect(toEligibleParcel({ PIN: "1", ADDRESS: "1 A ST", STR_ZIP: "98103", LOT_SQFT: 0, ZONING: "NR" })).toBeNull();
  });
});

describe("Flex (Spark) listings", () => {
  it("builds the filter from ZIPs and price", () => {
    const f = toSparkFilter({ zips: ["98103", "98107"], minPrice: 500000 });
    expect(f).toContain("MlsStatus Eq 'Active'");
    expect(f).toContain("(PostalCode Eq '98103' Or PostalCode Eq '98107')");
    expect(f).toContain("ListPrice Ge 500000");
  });
  it("maps standard fields, including lot size in acres", () => {
    const l = fromSpark({ StandardFields: { ListingKey: "K1", ListPrice: 900000, Latitude: "47.66", Longitude: "-122.35", LotSizeArea: 0.25, LotSizeUnits: "Acres", UnparsedAddress: "1 A St" } });
    expect(l.mlsId).toBe("K1");
    expect(l.lat).toBeCloseTo(47.66);
    expect(l.lotSqft).toBe(10890);
  });
});
