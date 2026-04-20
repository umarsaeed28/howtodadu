import { describe, it, expect } from "vitest";
import { buildAdUniverseFeasibilityPanel } from "../aduniverse-feasibility-panel";
import type { FeasibilityResult } from "../feasibility";

describe("buildAdUniverseFeasibilityPanel", () => {
  it("returns empty groups when no parcel and no feasibility", () => {
    const r: FeasibilityResult = {
      coordinates: { lat: 47, lng: -122 },
      parcel: null,
      feasibility: null,
      lot: null,
      contours: [],
    };
    const out = buildAdUniverseFeasibilityPanel(r);
    expect(out.groups.length).toBe(0);
    expect(out.hasParcelLayer).toBe(false);
    expect(out.hasFactorsLayer).toBe(false);
  });

  it("includes parcel group when parcel exists", () => {
    const r: FeasibilityResult = {
      coordinates: { lat: 47, lng: -122 },
      parcel: { pin: "123", address: "1 Main St", lotSqft: 5000 } as FeasibilityResult["parcel"],
      feasibility: null,
      lot: null,
      contours: [],
    };
    const out = buildAdUniverseFeasibilityPanel(r);
    expect(out.hasParcelLayer).toBe(true);
    expect(out.groups.some((g) => g.id === "parcel")).toBe(true);
  });
});
