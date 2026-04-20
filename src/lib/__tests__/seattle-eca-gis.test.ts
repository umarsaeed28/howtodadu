import { describe, it, expect } from "vitest";
import { emptyFeasibilityData } from "../feasibility";
import { applySeattleEcaLayersToFeasibility } from "../server/seattle-eca-gis";

describe("applySeattleEcaLayersToFeasibility", () => {
  it("merges flood + liquefaction flags from GIS layer IDs", () => {
    const base = emptyFeasibilityData();
    const out = applySeattleEcaLayersToFeasibility(base, [0, 5]);
    expect(out.floodProne).toBe(true);
    expect(out.liquefaction).toBe(true);
    expect(out.ecaSeattleGisLayers).toEqual([
      "ECA Flood Prone Areas",
      "ECA Liquefaction Prone Areas",
    ]);
  });

  it("raises minimum slope/wetland % when GIS confirms overlap but factors lack detail", () => {
    const base = emptyFeasibilityData();
    const out = applySeattleEcaLayersToFeasibility(base, [9, 10]);
    expect(out.steepSlopePercent).toBeGreaterThanOrEqual(0.12);
    expect(out.wetlandPercent).toBeGreaterThanOrEqual(0.08);
  });
});
