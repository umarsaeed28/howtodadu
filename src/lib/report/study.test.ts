import { describe, expect, it } from "vitest";
import { buildStudy, currentZone, formatPin } from "./study";
import { emptyFeasibilityData } from "@/lib/feasibility";
import { generateADUReport, type ADUReport } from "@/lib/adu-analysis";
import type { ParcelData } from "@/lib/feasibility";

const adu = {
  coverage: { currentPercent: 17.5, maxPercent: 50, usedSqft: 700, maxSqft: 2000, availableSqft: 1300 },
  daduFootprint: { maxAllowedSqft: 1000, buildableSqft: 1000, stories: 2, footprintSqft: 500, livingSqft: 1000, suggestedWidth: 20, suggestedDepth: 25, maxHeight: 37, rearSetback: 0, sideSetback: 5 },
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
    expect(buildStudy({ ...base, zoning: "SF 5000" }).far?.rows.find((r) => r.item === "FAR")?.value).toBe("1.0");
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
    expect(s.far?.rows.find((r) => r.item === "Allowed floor area")?.value).toBe("4,000 SF");
    expect(s.far?.summary).toContain("unless the house's total floor area exceeds 3,000 SF");
  });

  it("says when the footprint does not fit, and words the conclusion by verdict", () => {
    const s = buildStudy({ ...base, drawn: { living: 1000, footprint: 1400, w: 35, d: 40, stories: 1 }, verdict: "Conditional" });
    expect(s.coverage?.summary).toContain("less than the 1,400 SF footprint");
    expect(s.conclusion).toContain("appears possible");
    expect(buildStudy({ ...base, verdict: "Not feasible" }).conclusion).toContain("rules out a DADU");
  });

  it("handles a lot with no alley and no records", () => {
    const s = buildStudy({ ...base, pin: null, yearBuilt: null, feasibility: null, adu: null, lotSqft: null });
    expect(s.property.find((r) => r.item === "Rear alley access")?.value).toMatch(/^No alley/);
    expect(s.coverage).toBeNull();
    expect(s.far).toBeNull();
  });

  it("matches the architect's study for 5519 12th Ave NE: NR3, 4,000 SF lot, alley at the rear", () => {
    // City records for parcel 3589500190 (ADUniverse parcels and feasibility factors).
    const parcel = { address: "5519 12TH AVE NE 98105", pin: "3589500190", lotSqft: 4000, zoning: "SF 5000", zoningCategory: "SF 5000", baseZone: "SF 5000", yearBuilt: "1907" } as ParcelData;
    const factors = { ...emptyFeasibilityData(), lotType: "interior", hasAlley: true, totalBuildingSqft: 700, lotCoveragePercent: 0.175, lotWidth: 40, lotDepth: 100, totalADU: 0 };
    const real = generateADUReport(parcel, factors);
    expect(real.coverage).toMatchObject({ maxPercent: 50, maxSqft: 2000, usedSqft: 700, availableSqft: 1300 });
    expect(real.daduFootprint).toMatchObject({ maxAllowedSqft: 1000, maxHeight: 37, rearSetback: 0, sideSetback: 5 });

    const s = buildStudy({ ...base, zoning: "SF 5000", feasibility: factors, adu: real });
    const std = (k: string) => s.standards.find((r) => r.item === k);
    expect(std("Front setback")).toEqual({ item: "Front setback", value: "15 ft (one or two dwelling units)", ref: "SMC 23.44.090" });
    expect(std("Lot coverage")).toEqual({ item: "Lot coverage", value: "50% maximum (2,000 SF)", ref: "SMC 23.44.080" });
    expect(std("Floor area ratio (FAR)")).toEqual({ item: "Floor area ratio (FAR)", value: "1.0 for the house and a DADU on this lot", ref: "SMC 23.44.050" });
    expect(std("DADU height")?.value).toBe("32 ft, plus 5 ft for a pitched roof (37 ft to the ridge)");
    expect(std("Building separation")?.ref).toBe("SMC 23.44.100");
    expect(s.coverage?.rows.find((r) => r.item === "Maximum lot coverage")?.value).toBe("50% = 2,000 SF");
    expect(s.far?.rows.find((r) => r.item === "FAR")?.value).toBe("1.0");
    expect(s.far?.rows.find((r) => r.item === "Allowed floor area")?.value).toBe("4,000 SF");
    expect([...s.standards, ...s.dadu].some((r) => r.ref?.includes("23.44.041"))).toBe(false);
  });

  it("sets the NR FAR from the density of the house and the DADU", () => {
    // Two units on 3,000 SF is 1 per 1,500 SF: FAR 1.6. On 6,000 SF it is 1 per 3,000 SF: FAR 0.8.
    const s = buildStudy({ ...base, lotSqft: 3000, feasibility: { ...base.feasibility, totalADU: 0 } });
    expect(s.far?.rows.find((r) => r.item === "Allowed floor area")?.value).toBe("4,800 SF");
    const big = buildStudy({ ...base, lotSqft: 6000 });
    expect(big.far?.rows.find((r) => r.item === "FAR")?.value).toBe("0.8");
    expect(big.far?.rows.find((r) => r.item === "Allowed floor area")?.value).toBe("4,800 SF");
  });

  it("keeps the estimate wording outside Neighborhood Residential", () => {
    const s = buildStudy({ ...base, zoning: "LR2" });
    expect(s.far?.rows.find((r) => r.item === "FAR (estimate)")?.value).toBe("1.3");
    expect(s.standards.find((r) => r.item === "Floor area ratio (FAR)")?.ref).toBe("Estimate");
  });
});

describe("feasibility study on a lot with no room", () => {
  it("does not call leftover coverage room to build", () => {
    const parcel = { address: "5519 5TH AVE NE 98105", pin: "3856904795", lotSqft: 3420, zoning: "SF 5000" } as ParcelData;
    const factors = { ...emptyFeasibilityData(), lotType: "corner", lotWidth: 57, lotDepth: 60, totalBuildingSqft: 1100, lotCoveragePercent: 0.3217,
      treeStats: { large: 2, medium: 0, small: 0, canopyPct: 34, clearSqft: 0, clearSqftIfMediumRemoved: 0, siteSqft: 0, site: "side" as const } };
    const real = generateADUReport(parcel, factors);
    const s = buildStudy({ ...base, address: "5519 5th Ave NE", lotSqft: 3420, zoning: "SF 5000", feasibility: factors, adu: real, verdict: "Not feasible" });
    expect(s.coverage?.summary).toBe("About 610 SF of lot coverage remains on paper, but the house leaves no 15 by 20 ft spot to build a DADU on.");
    expect(s.dadu.find((r) => r.item === "Maximum DADU size")?.value).toContain("1,000 SF");
  });
});
