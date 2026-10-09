import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { canonicalZone, isNrZone, NOT_NR_MESSAGE, zoningGate, ZONING_UNKNOWN_MESSAGE } from "@/lib/zoning";
import { enforceNrRule, type LotLibraryFile } from "@/lib/lot-library";

/*
 * The NR gate, held to strict evals. Pencil analyzes Neighborhood Residential lots only: a property in any other zone,
 * or whose zone city records do not give, must never get a feasibility run, a map dot, a listing card or an
 * investment summary. These tests run the rule itself, the feasibility pipeline end to end (with the city's services
 * mocked), and the real data the app serves: the lot library and the listings pipeline.
 */

describe("zoning: what counts as NR", () => {
  it.each([
    ["NR", "NR"], ["NR1", "NR1"], ["NR2", "NR2"], ["NR3", "NR3"], ["nr3", "NR3"], [" NR2 ", "NR2"],
    ["NR3 (M)", "NR3"], ["NR2 (M1)", "NR2"],
    ["SF 5000", "NR3"], ["SF 7200", "NR2"], ["SF 9600", "NR1"], ["sf 7200 (m)", "NR2"], ["SF5000", "NR3"],
  ])("%s is NR (%s)", (raw, zone) => {
    expect(isNrZone(raw)).toBe(true);
    expect(canonicalZone(raw)).toBe(zone);
  });

  it.each(["RSL", "RSL (M)", "LR1", "LR2 (M)", "LR3", "MR", "HR", "NC1-40", "NC2-55 (M)", "C1-65", "SM-SLU", "IB U/85", "MIO-105-NC3-65", "DMC 160", "SF 3000", "NR4", "NRX", "N R3", "RS 7200"])(
    "%s is not NR",
    (raw) => expect(isNrZone(raw)).toBe(false),
  );

  it("empty or missing zoning is never NR", () => {
    for (const raw of [null, undefined, "", "   ", "()"]) expect(isNrZone(raw)).toBe(false);
  });

  it("the gate passes NR, turns away other zones, and refuses to guess when the zone is unknown", () => {
    expect(zoningGate("SF 7200")).toEqual({ ok: true, zone: "NR2" });
    expect(zoningGate("LR2 (M)")).toEqual({ ok: false, code: "not_nr", zoning: "LR2 (M)", message: NOT_NR_MESSAGE });
    expect(zoningGate(null, "", undefined)).toEqual({ ok: false, code: "zoning_unknown", zoning: null, message: ZONING_UNKNOWN_MESSAGE });
    // The recorded ZONING wins over the base zone: a lot recorded LR2 is not rescued by an NR base zone.
    expect(zoningGate("LR2", "NR3").ok).toBe(false);
    expect(zoningGate(null, "NR3")).toEqual({ ok: true, zone: "NR3" });
  });

  it("the messages point people to NR-zoned properties", () => {
    expect(NOT_NR_MESSAGE).toMatch(/not suitable for a DADU/);
    expect(NOT_NR_MESSAGE).toMatch(/NR-zoned/);
    expect(ZONING_UNKNOWN_MESSAGE).toMatch(/NR-zoned/);
  });
});

describe("feasibility pipeline: the gate stops a non-NR lot before any analysis", () => {
  const PARCELS = "ADUniverse_parcels/FeatureServer/0/query";
  const FACTORS = "ADUniverse_feasibility_factors/FeatureServer/0/query";
  const GEOCODE = "GeocodeServer/findAddressCandidates";
  const ring = [[-122.3301, 47.7001], [-122.3299, 47.7001], [-122.3299, 47.6999], [-122.3301, 47.6999], [-122.3301, 47.7001]];

  /** Mocks the city's services. Anything beyond geocode, parcel and factors counts as analysis. */
  function mockCity(parcel: Record<string, unknown> | null) {
    const analysis: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });
      if (url.includes(GEOCODE)) return json({ candidates: [{ score: 100, location: { x: -122.33, y: 47.7 }, attributes: { City: "Seattle" } }] });
      if (url.includes(PARCELS)) return json({ features: parcel ? [{ attributes: parcel, geometry: { rings: [ring] } }] : [] });
      if (url.includes(FACTORS)) return json({ features: [{ attributes: { PIN: "1234567890" } }] });
      analysis.push(url);
      return json({ features: [] });
    }));
    return analysis;
  }

  afterEach(() => vi.unstubAllGlobals());

  it("an LR lot comes back not_nr, with its recorded zone, and no analysis query runs", async () => {
    const analysis = mockCity({ PIN: "1234567890", ZONING: "LR2 (M)", ADDRESS: "100 MAIN ST" });
    const { getFeasibilityForAddress } = await import("@/lib/server/feasibility-query");
    const r = await getFeasibilityForAddress("100 Main St, Seattle, WA");
    expect(r).toMatchObject({ ok: false, status: 422, code: "not_nr", zoning: "LR2 (M)", error: NOT_NR_MESSAGE });
    expect(analysis).toEqual([]);
  });

  it("a parcel with no zoning on record comes back zoning_unknown, and no analysis query runs", async () => {
    const analysis = mockCity(null);
    const { getFeasibilityForAddress } = await import("@/lib/server/feasibility-query");
    const r = await getFeasibilityForAddress("100 Main St, Seattle, WA");
    expect(r).toMatchObject({ ok: false, status: 422, code: "zoning_unknown" });
    expect(analysis).toEqual([]);
  });

  it("an NR lot recorded under its legacy name passes the gate and the analysis runs", async () => {
    const analysis = mockCity({ PIN: "1234567890", ZONING: "SF 7200", ADDRESS: "100 MAIN ST", SQFTLOT: 6000 });
    const { getFeasibilityForAddress } = await import("@/lib/server/feasibility-query");
    const r = await getFeasibilityForAddress("100 Main St, Seattle, WA");
    expect(r.ok ? null : r.code ?? null).toBeNull();
    expect(analysis.length).toBeGreaterThan(0);
  });
});

describe("data: the lot library holds NR lots only", () => {
  const file = JSON.parse(readFileSync(path.join(process.cwd(), "data", "lot-library.json"), "utf8")) as LotLibraryFile;

  it("every lot in the shipped library is NR", () => {
    const bad = file.cols.zone.map((z, i) => [file.cols.pin[i], z] as const).filter(([, z]) => !isNrZone(z));
    expect(bad).toEqual([]);
    expect(file.count).toBeGreaterThan(1000);
  });

  it("the loader drops any non-NR row and keeps every column aligned", () => {
    const f = {
      generatedAt: "", source: "", count: 3,
      cols: { pin: ["a", "b", "c"], zone: ["NR", "LR2", "SF 5000"], score: [90, 95, 80], address: ["1", "2", "3"] },
    } as unknown as LotLibraryFile;
    const out = enforceNrRule(f);
    expect(out.count).toBe(2);
    expect(out.cols.pin).toEqual(["a", "c"]);
    expect(out.cols.score).toEqual([90, 80]);
    expect((out.cols as unknown as { address: string[] }).address).toEqual(["1", "3"]);
  });
});

describe("data: everything the app serves sits on an NR lot", () => {
  // A stub listings feed: 40 real library lots for sale, plus one downtown address that is on no NR library lot.
  const lib = JSON.parse(readFileSync(path.join(process.cwd(), "data", "lot-library.json"), "utf8")) as LotLibraryFile;
  const idx = Array.from({ length: lib.count }, (_, i) => i).filter((i) => lib.cols.score[i] >= 80).slice(0, 40);
  const listing = (i: number) => ({
    mlsId: `t-${lib.cols.pin[i]}`, address: `${lib.cols.address[i]}, Seattle, WA ${lib.cols.zip[i] ?? ""}`, city: "Seattle", zip: lib.cols.zip[i] ?? "",
    lat: lib.cols.lat[i], lng: lib.cols.lng[i], listPrice: 900_000, lotSqft: lib.cols.lotSqft[i], status: "Active", photos: [], hoaMonthly: 0, updatedAt: "",
  });
  const downtown = { mlsId: "t-downtown", address: "1301 2ND AVE, Seattle, WA 98101", city: "Seattle", zip: "98101", lat: 47.6075, lng: -122.3376, listPrice: 900_000, lotSqft: 9000, status: "Active", photos: [], hoaMonthly: 0, updatedAt: "" };
  const feed = [...idx.map(listing), downtown];

  beforeAll(() => {
    vi.resetModules();
    vi.doMock("@/lib/listings", async (orig) => ({
      ...(await orig<typeof import("@/lib/listings")>()),
      listingsConnected: () => true,
      listingsProviderName: () => "fixture",
      getListingsProvider: () => ({ search: async () => ({ listings: feed, total: feed.length }), getById: async (id: string) => feed.find((l) => l.mlsId === id) ?? null }),
    }));
  });

  it("every screened listing (map cards and the feed) is on an NR library lot, and the off-library one is dropped", async () => {
    const { screenListings } = await import("@/lib/server/screened-listings");
    const r = await screenListings();
    expect(r.listings.length).toBeGreaterThan(0);
    expect(r.listings.filter((l) => !isNrZone(l.lot.zoning)).map((l) => l.address)).toEqual([]);
    expect(r.listings.some((l) => l.mlsId === "t-downtown")).toBe(false);
  });

  it("every opportunity in the investment feed is on an NR library lot", async () => {
    const { computeFeed } = await import("@/lib/server/invest");
    const { getLot } = await import("@/lib/server/lot-library-store");
    const f = await computeFeed();
    expect(f.opportunities.length).toBeGreaterThan(0);
    expect(f.opportunities.filter((o) => !isNrZone(getLot(o.pin)?.zoning)).map((o) => o.street)).toEqual([]);
    expect(f.opportunities.some((o) => o.id === "t-downtown")).toBe(false);
  });

  it("every off-market lot is NR", async () => {
    const { getOffMarketLots, getLot } = await import("@/lib/server/lot-library-store");
    const off = getOffMarketLots(new Set());
    expect(off && off.pin.length).toBeGreaterThan(0);
    expect(off!.pin.filter((pin) => !isNrZone(getLot(pin)?.zoning))).toEqual([]);
  });
});
