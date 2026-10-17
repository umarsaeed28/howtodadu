import { describe, expect, it } from "vitest";
import { buildConstraintSet, validateLot } from "./constraint-set";
import { lotFeasibility } from "@/lib/feasibility/lot-feasibility";

const lot = { lotSqft: 4000, existingFootprintSqft: 700, existingChargeableSqft: 1400, existingAdus: 0, roomSqft: 900, hasAlley: true, zoning: "NR3" };

describe("ConstraintSet", () => {
  it("applies each rule to the lot with its citation", () => {
    const c = Object.fromEntries(buildConstraintSet(lot).map((x) => [x.id, x]));
    expect(c.coverage).toMatchObject({ limit: "50 percent of the lot, 2,000 sq ft", lot: "700 sq ft used, 1,300 sq ft left", status: "pass", citation: "SMC 23.44.080.A", kind: "code" });
    expect(c.far).toMatchObject({ limit: "FAR 1.0, 4,000 sq ft", lot: "1,400 sq ft used, 2,600 sq ft left", status: "pass" }); // house + DADU: 2,000 per unit
    expect(c.rear_setback.lot).toBe("alley: 0 ft");
    expect(c.lot_screen).toMatchObject({ status: "pass", kind: "pencil", citation: null });
    expect(c.separation.verified).toBe(false);
  });

  it("reads a legacy zone label as today's zone", () => {
    const c = buildConstraintSet({ ...lot, zoning: "SF 5000" }).find((x) => x.id === "zone")!;
    expect(c).toMatchObject({ status: "pass", lot: "SF 5000 (NR3)" });
    expect(buildConstraintSet({ ...lot, zoning: "SF 9600" }).find((x) => x.id === "zone")!.status).toBe("fail"); // NR1
  });

  it("fails a lot under Pencil's screen, with no room, or at the ADU cap", () => {
    const c = Object.fromEntries(buildConstraintSet({ ...lot, lotSqft: 3500, roomSqft: 200, existingAdus: 2 }).map((x) => [x.id, x.status]));
    expect(c).toMatchObject({ lot_screen: "fail", open_spot: "fail", adu_count: "fail" });
  });
});

describe("validator", () => {
  it("passes a good lot and lists what fits", () => {
    const v = validateLot(buildConstraintSet(lot), lotFeasibility(lot), { existingChargeableSource: "override", roomSqft: 900 });
    expect(v.ok).toBe(true);
    expect(v.feasibleOptions).toContain("One DADU, 2 stories");
  });
  it("names each failure with its rule and warns about weak inputs", () => {
    const bad = { ...lot, lotSqft: 3500 };
    const v = validateLot(buildConstraintSet(bad), lotFeasibility(bad), { existingChargeableSource: "footprint_lower_bound", roomSqft: null });
    expect(v.ok).toBe(false);
    expect(v.failures[0]).toMatch(/Smallest lot Pencil shows.*\(Pencil\)/);
    expect(v.warnings.join(" ")).toMatch(/lower bound/);
    expect(v.warnings.join(" ")).toMatch(/not measured/);
  });
});
