import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { FeasibilityResult } from "@/lib/feasibility";
import { NR_MAX_STORIES, lotFeasibility, lotFeasibilityInputFrom } from "../lot-feasibility";

/** The spec's SeattleLotFeasibilityOutput JSON schema (section 3), verbatim. */
const schema = z.fromJSONSchema(JSON.parse(readFileSync("src/lib/feasibility/lot-feasibility.schema.json", "utf8")));

/** The spec's validation case: 4,000 sq ft NR3 lot, 700 sq ft footprint, 1,400 sq ft above grade, no ADUs yet. */
const specCase = { lotSqft: 4000, existingFootprintSqft: 700, existingChargeableSqft: 1400, existingAdus: 0 };
const option = (out: ReturnType<typeof lotFeasibility>, name: string) => out.playbook_options.find((o) => o.configuration_name === name)!;

describe("lotFeasibility", () => {
  it("matches the spec's JSON schema", () => {
    for (const input of [specCase, { ...specCase, existingAdus: 2 }, { ...specCase, lotSqft: 2400, bedrooms: 3, roomSqft: 250, hasAlley: true }]) {
      expect(schema.safeParse(lotFeasibility(input)).success).toBe(true);
    }
  });

  it("the schema rejects a wrong cap or too many DADUs", () => {
    const out = lotFeasibility(specCase);
    expect(schema.safeParse({ ...out, compliance: { ...out.compliance, per_unit_size_cap_2br: 1200 } }).success).toBe(false);
    expect(schema.safeParse({ ...out, compliance: { ...out.compliance, max_dadu_count_allowed: 3 } }).success).toBe(false);
  });

  it("reproduces the spec's validation case (two DADUs in one building)", () => {
    const out = lotFeasibility(specCase);
    expect(out.calculations.lot_coverage_sqft).toEqual({ max_allowed: 2000, existing_consumed: 700, remaining_capacity: 1300 });
    expect(out.calculations.far_sqft).toEqual({
      max_allowed_chargeable: 6400,
      existing_chargeable: 1400,
      remaining_capacity: 5000,
      is_small_lot_exception_applied: false,
    });
    expect(out.compliance).toEqual({ max_dadu_count_allowed: 2, per_unit_size_cap_2br: 1000, per_unit_size_cap_3br: 1200, is_parking_required: false });

    const duplex = option(out, "Two DADUs in one building");
    expect(duplex.feasible).toBe(true);
    expect(duplex.max_stories_allowed).toBe(NR_MAX_STORIES);
    expect(duplex.max_footprint_per_structure).toBe(1300);
    expect(duplex.design_bottleneck_notes).toMatch(/^Unit size cap binds: 2 x 1,000 sq ft/);
    expect(duplex.design_bottleneck_notes).toContain("Up to 1,000 sq ft per DADU");

    // Three bedrooms each: 2 x 1,200 = 2,400, still the cap, not the FAR.
    const threeBr = option(lotFeasibility({ ...specCase, bedrooms: 3 }), "Two DADUs in one building");
    expect(threeBr.design_bottleneck_notes).toMatch(/^Unit size cap binds: 2 x 1,200 sq ft/);
  });

  it("covers every playbook configuration", () => {
    const names = lotFeasibility(specCase).playbook_options.map((o) => o.configuration_name);
    expect(names).toEqual(["One DADU, 1 story", "One DADU, 2 stories", "Two DADUs in one building", "Two separate DADUs", "AADU + DADU"]);
  });

  it("a one-story DADU is held to the footprint left; two stories reach the cap", () => {
    const out = lotFeasibility({ ...specCase, existingFootprintSqft: 1400 });
    const one = option(out, "One DADU, 1 story");
    expect(one.max_footprint_per_structure).toBe(600);
    expect(one.design_bottleneck_notes).toMatch(/^Lot coverage binds/);
    expect(option(out, "One DADU, 2 stories").design_bottleneck_notes).toMatch(/^Unit size cap binds/);
  });

  it("two separate DADUs share the coverage left", () => {
    const sep = option(lotFeasibility(specCase), "Two separate DADUs");
    expect(sep.feasible).toBe(true);
    expect(sep.max_footprint_per_structure).toBe(650);
    expect(sep.design_bottleneck_notes).toContain("5 ft apart");
  });

  it("two ADUs on record leave no room for more", () => {
    const out = lotFeasibility({ ...specCase, existingAdus: 2 });
    expect(out.compliance.max_dadu_count_allowed).toBe(0);
    for (const o of out.playbook_options) {
      expect(o.feasible).toBe(false);
      expect(o.design_bottleneck_notes).toMatch(/^ADU count/);
    }
  });

  it("one ADU on record allows a single DADU only", () => {
    const out = lotFeasibility({ ...specCase, existingAdus: 1 });
    expect(out.compliance.max_dadu_count_allowed).toBe(1);
    expect(option(out, "One DADU, 1 story").feasible).toBe(true);
    expect(option(out, "Two DADUs in one building").feasible).toBe(false);
    expect(option(out, "AADU + DADU").feasible).toBe(false);
  });

  it("no 15 x 20 ft open spot means no DADU", () => {
    const out = lotFeasibility({ ...specCase, roomSqft: 250 });
    for (const o of out.playbook_options) expect(o.feasible).toBe(false);
    expect(option(out, "One DADU, 1 story").design_bottleneck_notes).toMatch(/^Open spot binds/);
  });

  it("a small lot gets the 2,500 sq ft floor area minimum, and the FAR can bind", () => {
    // One unit on 4,100 sq ft: FAR 0.6 gives 2,460 sq ft, under the 2,500 sq ft minimum.
    const out = lotFeasibility({ lotSqft: 4100, existingFootprintSqft: 900, existingChargeableSqft: 1800, existingAdus: 0, units: 1 });
    expect(out.calculations.far_sqft.max_allowed_chargeable).toBe(2500);
    expect(out.calculations.far_sqft.is_small_lot_exception_applied).toBe(true);
    // House + one DADU: 2,050 sq ft per unit gives FAR 1.0 and 4,100 sq ft, so the minimum does not apply there.
    const big = lotFeasibility({ lotSqft: 4100, existingFootprintSqft: 900, existingChargeableSqft: 3600, existingAdus: 0 });
    expect(option(big, "One DADU, 2 stories").design_bottleneck_notes).toMatch(/^Floor area \(FAR\) binds: 500 sq ft/);
  });
});

describe("lotFeasibility with an attached garage", () => {
  const garageOption = (input: Parameters<typeof lotFeasibility>[0]) => option(lotFeasibility(input), "DADU with attached garage");

  it("offers the garage option only when a garage is given, and changes nothing else", () => {
    expect(lotFeasibility({ ...specCase, garageSqft: 0 })).toEqual(lotFeasibility(specCase));
    const out = lotFeasibility({ ...specCase, garageSqft: 250 });
    expect(out.playbook_options.map((o) => o.configuration_name).at(-1)).toBe("DADU with attached garage");
    expect(out.playbook_options.slice(0, -1)).toEqual(lotFeasibility(specCase).playbook_options);
    expect(schema.safeParse(out).success).toBe(true);
  });

  it("a 250 sq ft garage is exempt: 1,000 sq ft of living space still meets the two-bedroom cap", () => {
    const o = garageOption({ ...specCase, garageSqft: 250 });
    expect(o.feasible).toBe(true);
    expect(o.design_bottleneck_notes).toMatch(/^Unit size cap binds: 1,000 sq ft per unit, with 250 sq ft of the 250 sq ft garage exempt/);
    expect(o.design_bottleneck_notes).toContain("Up to 1,000 sq ft of living space plus the 250 sq ft garage, a 1,250 sq ft building.");
  });

  it("garage area over 250 sq ft counts: a 400 sq ft garage limits living space to 850", () => {
    const o = garageOption({ ...specCase, garageSqft: 400 });
    expect(o.design_bottleneck_notes).toContain("150 sq ft counted");
    expect(o.design_bottleneck_notes).toContain("Up to 850 sq ft of living space plus the 400 sq ft garage, a 1,250 sq ft building.");
  });

  it("three bedrooms with a 250 sq ft garage allow a 1,450 sq ft building", () => {
    const o = garageOption({ ...specCase, bedrooms: 3, garageSqft: 250 });
    expect(o.design_bottleneck_notes).toContain("Up to 1,200 sq ft of living space plus the 250 sq ft garage, a 1,450 sq ft building.");
  });

  it("the garage's whole footprint counts toward lot coverage", () => {
    // 600 sq ft of coverage left over two stories is 1,200 sq ft of building; the garage takes 250 of it.
    const o = garageOption({ ...specCase, existingFootprintSqft: 1400, garageSqft: 250 });
    expect(o.design_bottleneck_notes).toMatch(/^Lot coverage binds: 600 sq ft of footprint left/);
    expect(o.design_bottleneck_notes).toContain("Up to 950 sq ft of living space plus the 250 sq ft garage, a 1,200 sq ft building.");
    expect(o.design_bottleneck_notes).toContain("full 250 sq ft footprint counts toward lot coverage");
    expect(o.max_footprint_per_structure).toBe(600);

    const tooBig = garageOption({ ...specCase, existingFootprintSqft: 1400, garageSqft: 700 });
    expect(tooBig.feasible).toBe(false);
    expect(tooBig.design_bottleneck_notes).toContain("The 700 sq ft garage does not fit in the 600 sq ft of footprint left.");
  });

  it("the garage counts toward FAR", () => {
    // House + DADU: FAR 1.0 gives 4,000 sq ft, 600 left; the 250 sq ft garage leaves 350 of living space.
    const o = garageOption({ ...specCase, existingChargeableSqft: 3400, garageSqft: 250 });
    expect(o.design_bottleneck_notes).toMatch(/^Floor area \(FAR\) binds: 600 sq ft/);
    expect(o.design_bottleneck_notes).toContain("Up to 350 sq ft of living space");
  });
});

describe("lotFeasibilityInputFrom", () => {
  const result = (lotSqft: number | null, feasibility: Partial<NonNullable<FeasibilityResult["feasibility"]>> | null) =>
    ({ parcel: lotSqft == null ? null : { lotSqft }, feasibility }) as unknown as FeasibilityResult;

  it("takes the footprint from city records as a lower bound for the floor area", () => {
    const built = lotFeasibilityInputFrom(result(4000, { totalBuildingSqft: 700, totalADU: 1, hasAlley: true, treeStats: { siteSqft: 900 } as never }))!;
    expect(built.existingChargeableSource).toBe("footprint_lower_bound");
    expect(built.input).toMatchObject({ lotSqft: 4000, existingFootprintSqft: 700, existingChargeableSqft: 700, existingAdus: 1, roomSqft: 900, hasAlley: true });
  });

  it("uses the floor area override and the coverage share when the footprint is missing", () => {
    const built = lotFeasibilityInputFrom(result(4000, { totalBuildingSqft: null, lotCoveragePercent: 17.5 }), { existingChargeableSqft: 1400, units: 3 })!;
    expect(built.existingChargeableSource).toBe("override");
    expect(built.input).toMatchObject({ existingFootprintSqft: 700, existingChargeableSqft: 1400, units: 3 });
    expect(lotFeasibilityInputFrom(result(4000, {}), { garageSqft: 300 })!.input.garageSqft).toBe(300);
  });

  it("needs a lot size", () => {
    expect(lotFeasibilityInputFrom(result(null, null))).toBeNull();
  });
});
