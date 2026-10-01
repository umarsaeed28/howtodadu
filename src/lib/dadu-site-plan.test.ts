import { describe, expect, it } from "vitest";
import { planSite } from "./dadu-site-plan";

describe("planSite (team guide rules)", () => {
  it("fails a lot under 3,200 sq ft", () => {
    const p = planSite({ lotSqft: 3120, widthFt: 30, depthFt: 104, alley: false });
    expect(p.area.pass).toBe(false);
    expect(p.layout.kind).toBe("none");
    expect(p.marketability.rating).toBe("Low");
  });
  it("40 x 100 with an alley is a single rear DADU with high marketability", () => {
    const p = planSite({ lotSqft: 4000, widthFt: 40, depthFt: 100, alley: true });
    expect(p.layout.kind).toBe("single_rear");
    expect(p.access.vehicle).toBe(true);
    expect(p.marketability.rating).toBe("High");
  });
  it("40 wide with no alley has a tight driveway and moderate marketability", () => {
    const p = planSite({ lotSqft: 4000, widthFt: 40, depthFt: 100, alley: false });
    expect(p.access.vehicle).toBe("tight");
    expect(p.marketability.rating).toBe("Moderate");
  });
  it("50 ft wide lots get side by side", () => {
    expect(planSite({ lotSqft: 6000, widthFt: 50, depthFt: 120, alley: false }).layout.kind).toBe("side_by_side");
  });
  it("45 to 49 ft wide and 120+ deep gets staggered", () => {
    expect(planSite({ lotSqft: 5600, widthFt: 46, depthFt: 125, alley: false }).layout.kind).toBe("staggered");
  });
  it("a deep, narrow North Seattle lot gets staggered with a warning against stacking", () => {
    const p = planSite({ lotSqft: 5000, widthFt: 40, depthFt: 125, alley: false });
    expect(p.layout.kind).toBe("staggered");
    expect(p.warning).toMatch(/straight line/);
    expect(p.marketability.rating).toBe("Moderate"); // tight car access, but the warning alone does not sink it
  });
  it("a narrow lot with no alley is walk-in only and Low", () => {
    const p = planSite({ lotSqft: 3300, widthFt: 33, depthFt: 100, alley: false });
    expect(p.access.vehicle).toBe(false);
    expect(p.marketability.rating).toBe("Low");
  });
  it("unknown shape falls back to single rear and says so", () => {
    const p = planSite({ lotSqft: 4000, widthFt: null, depthFt: null, alley: null });
    expect(p.dimensions.known).toBe(false);
    expect(p.layout.kind).toBe("single_rear");
  });
});
