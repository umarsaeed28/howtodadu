import { describe, expect, it } from "vitest";
import { FeasibilityReport } from "../../../../packages/schema/src";
import { generateADUReport } from "@/lib/adu-analysis";
import { buildFeasibilityTableRow } from "@/lib/feasibility-table-model";
import { emptyFeasibilityData, type FeasibilityResult, type ParcelData } from "@/lib/feasibility";
import { COST_PER_SF, reportVerdict, toReport } from "../to-report";

const parcel: ParcelData = {
  address: "4214 NW 62nd St, Seattle, WA",
  pin: "1234567890",
  lotSqft: 5000,
  developableAreaSqft: 5000,
  zoning: "NR3",
  zoningCategory: "NR",
  baseZone: "NR3",
  zoningOverlay: null,
  existingUse: null,
  urbanVillage: null,
  yearBuilt: "1950",
  landValue: 500000,
  improvementValue: 300000,
  propType: null,
  platName: null,
  councilDistrict: null,
  zip: "98107",
  shapeArea: null,
  shapeLength: null,
};

function fixture(): FeasibilityResult {
  return {
    coordinates: { lat: 47.67, lng: -122.38 },
    parcel,
    feasibility: {
      ...emptyFeasibilityData(),
      lotType: "Interior",
      hasAlley: true,
      lotWidth: 50,
      lotDepth: 100,
      totalBuildingSqft: 1200,
      lotCoveragePercent: 24,
    },
    lot: null,
    contours: [],
    sitePlan: null,
  };
}

describe("reportVerdict", () => {
  it("uses the 70 and 40 bands", () => {
    expect(reportVerdict(70)).toBe("Feasible");
    expect(reportVerdict(69)).toBe("Conditional");
    expect(reportVerdict(40)).toBe("Conditional");
    expect(reportVerdict(39)).toBe("Not feasible");
  });
});

describe("toReport", () => {
  const result = fixture();
  const adu = generateADUReport(result.parcel, result.feasibility)!;
  const row = buildFeasibilityTableRow(result, adu);
  const report = toReport(row, new Date("2026-09-30T00:00:00Z"));

  it("parses against the FeasibilityReport schema", () => {
    expect(() => FeasibilityReport.parse(report)).not.toThrow();
  });

  it("prices cost as buildable sf times cost_per_sf, from data not prose", () => {
    const sf = report.summary.max_buildable_sf?.value;
    if (sf != null) expect(report.summary.construction_cost_usd?.value).toBe(Math.round(sf * COST_PER_SF));
  });

  it("only scores the single DADU scenario", () => {
    const scored = report.scenarios.filter((s) => s.score != null).map((s) => s.id);
    expect(scored).toEqual(["single_dadu"]);
  });

  it("marks code citations unverified", () => {
    expect(report.citations.every((c) => c.status === "unverified")).toBe(true);
  });

  it("gives every GIS fact a source layer and pull date", () => {
    for (const f of report.property_facts) {
      expect(f.provenance?.source_layer).toBeTruthy();
      expect(f.provenance?.pulled_at).toBeTruthy();
    }
  });

  it("forces Not feasible when a check fails", () => {
    const failed = { ...adu, checks: [...adu.checks, { label: "Lot size", status: "fail" as const, value: "2,000 sf", shortNote: "Below minimum" }] };
    const r = toReport(buildFeasibilityTableRow(result, failed));
    expect(r.summary.verdict).toBe("Not feasible");
    expect(r.risks[0].hard_prohibition).toBe(true);
  });

  it("lists survey-required gaps", () => {
    expect(report.survey_required.length).toBeGreaterThan(0);
  });
});

describe("toReport on a lot with no room for a DADU", () => {
  // 5519 5th Ave NE (parcel 3856904795): coverage left, but the house leaves no 15 by 20 ft spot. The real lot is
  // 3,420 sf; it is set to 3,900 here so Pencil's 3,800 sf lot screen passes and only the missing room fails.
  const result = fixture();
  result.parcel = { ...parcel, address: "5519 5TH AVE NE 98105", lotSqft: 3900, zoning: "SF 5000" };
  result.feasibility = {
    ...result.feasibility!,
    lotType: "corner", hasAlley: false, lotWidth: 57, lotDepth: 60, totalBuildingSqft: 1100, lotCoveragePercent: 0.3217, sideClearanceFt: 15.2,
    treeStats: { large: 2, medium: 0, small: 0, canopyPct: 34, clearSqft: 0, clearSqftIfMediumRemoved: 0, siteSqft: 0, site: "side" },
  };
  const adu = generateADUReport(result.parcel, result.feasibility);
  const report = toReport(buildFeasibilityTableRow(result, adu), new Date("2026-10-08T00:00:00Z"));

  it("is Not feasible with a zero score, no DADU size and no build cost", () => {
    expect(report.summary.verdict).toBe("Not feasible");
    expect(report.summary.score.value).toBe(0);
    expect(report.summary.max_buildable_sf).toBeNull();
    expect(report.summary.construction_cost_usd).toBeNull();
  });

  it("ranks the missing room first, as a hard prohibition", () => {
    expect(report.risks[0].title).toMatch(/^Room for a DADU: The house leaves no 15 by 20 ft spot/);
    expect(report.risks[0].hard_prohibition).toBe(true);
    expect(report.scenarios.find((s) => s.id === "single_dadu")).toMatchObject({ allowed: false });
  });
});
