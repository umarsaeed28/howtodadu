import { describe, expect, it } from "vitest";
import { PREAPPROVED_PLANS, planFootprintSf } from "./preapproved-dadus";

describe("PREAPPROVED_PLANS", () => {
  it("has unique ids and sane numbers", () => {
    expect(new Set(PREAPPROVED_PLANS.map((p) => p.id)).size).toBe(PREAPPROVED_PLANS.length);
    for (const p of PREAPPROVED_PLANS) {
      expect(p.widthFt).toBeGreaterThan(8);
      expect(p.depthFt).toBeGreaterThan(8);
      expect(p.sqft).toBeGreaterThan(200);
      expect(p.sqft).toBeLessThanOrEqual(1000);
      expect(p.detailUrl.startsWith("https://")).toBe(true);
    }
  });
  it("keeps living area consistent with the footprint and floors", () => {
    for (const p of PREAPPROVED_PLANS) {
      // Interior area cannot exceed footprint x floors by more than walls and porches allow.
      expect(p.sqft).toBeLessThanOrEqual(planFootprintSf(p) * p.stories * 1.1);
    }
  });
});
