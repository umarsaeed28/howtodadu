import { describe, expect, it } from "vitest";
import { buildStudy, currentZone, formatPin } from "./study";
import { emptyFeasibilityData } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";

const adu = {
  coverage: { currentPercent: 17.5, maxPercent: 40, usedSqft: 700, maxSqft: 1600, availableSqft: 900 },
  daduFootprint: { maxAllowedSqft: 1000, buildableSqft: 900, stories: 2, footprintSqft: 450, livingSqft: 900, suggestedWidth: 20, suggestedDepth: 22, maxHeight: 23, rearSetback: 0, sideSetback: 5 },
} as unknown as ADUReport;
const base = {
  address: "5519 12th Ave NE, Seattle, WA 98105",
  pin: "3589500190",
  zoning: "NR3",
  neighborhood: "Ravenna",
  urbanVillage: "University District",
  lotSqft: 4000,
  yearBuilt: "1907",
  feasibility: { ...emptyFeasibilityData(), hasAlley: true, totalBuildingSqft: 1550, gradeStats: { slopePct: 4, riseFt: 5 } },
  adu,
  verdict: "Feasible" as const,
};

describe("feasibility study", () => {
  it("formats the parcel number the county's way, and uses current zone names", () => {
    expect(formatPin("3589500190")).toBe("358950-0190");
    expect(currentZone("SF 5000")).toBe("NR3");
    expect(currentZone("sf 7200")).toBe("NR2");
    expect(currentZone("NR3")).toBe("NR3");
    expect(buildStudy({ ...base, zoning: "SF 5000" }).property.find((r) => r.item === "Zoning")?.value).toBe("Neighborhood Residential 3 (NR3, recorded as SF 5000)");
    expect(buildStudy({ ...base, zoning: "SF 5000" }).far?.rows.find((r) => r.item === "FAR (estimate)")?.value).toBe("0.9");
  });

  it("fills property information and jurisdiction from the records", () => {
    const s = buildStudy(base);
    const row = (k: string) => s.property.find((r) => r.item === k)?.value;
    expect(row("Parcel number")).toBe("358950-0190");
    expect(row("Zoning")).toBe("Neighborhood Residential 3 (NR3)");
    expect(row("Existing residence")).toContain("built 1907");
    expect(row("Rear alley access")).toMatch(/^Yes/);
    expect(row("Topography")).toContain("About 5 ft of fall");
    expect(s.jurisdiction.find((r) => r.item === "Neighborhood")?.value).toBe("University District");
    expect(s.standards.find((r) => r.item === "Rear setback")?.value).toBe("0 ft on the alley");
  });

  it("runs the coverage and FAR checks against the drawn DADU when there is one", () => {
    const s = buildStudy({ ...base, drawn: { living: 1000, footprint: 500, w: 20, d: 25, stories: 2 } });
    expect(s.coverage?.rows.find((r) => r.item === "Proposed DADU footprint")?.value).toBe("500 SF");
    expect(s.coverage?.summary).toContain("enough for the DADU as drawn (20 x 25 ft, 1,000 SF)");
    expect(s.far?.rows.find((r) => r.item === "Allowed floor area")?.value).toBe("3,600 SF");
    expect(s.far?.summary).toContain("unless the house's total floor area exceeds 2,600 SF");
  });

  it("says when the footprint does not fit, and words the conclusion by verdict", () => {
    const s = buildStudy({ ...base, drawn: { living: 1000, footprint: 1000, w: 25, d: 40, stories: 1 }, verdict: "Conditional" });
    expect(s.coverage?.summary).toContain("less than the 1,000 SF footprint");
    expect(s.conclusion).toContain("appears possible");
    expect(buildStudy({ ...base, verdict: "Not feasible" }).conclusion).toContain("rules out a DADU");
  });

  it("handles a lot with no alley and no records", () => {
    const s = buildStudy({ ...base, pin: null, yearBuilt: null, feasibility: null, adu: null, lotSqft: null });
    expect(s.property.find((r) => r.item === "Rear alley access")?.value).toMatch(/^No alley/);
    expect(s.coverage).toBeNull();
    expect(s.far).toBeNull();
  });
});
