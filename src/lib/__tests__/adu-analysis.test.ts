import { describe, it, expect } from "vitest";
import { generateADUReport } from "../adu-analysis";
import type { ParcelData, FeasibilityData } from "../feasibility";

function makeParcel(overrides: Partial<ParcelData> = {}): ParcelData {
  return {
    address: "1234 TEST ST 98101",
    pin: "1234567890",
    lotSqft: 5400,
    developableAreaSqft: 5400,
    zoning: "SF 5000",
    zoningCategory: "SF",
    baseZone: "SF",
    zoningOverlay: null,
    existingUse: "Single Family",
    urbanVillage: null,
    yearBuilt: "1950",
    landValue: 300000,
    improvementValue: 200000,
    propType: "R",
    platName: null,
    councilDistrict: 3,
    zip: "98101",
    shapeArea: 5400,
    shapeLength: 300,
    ...overrides,
  };
}

function makeFactors(overrides: Partial<FeasibilityData> = {}): FeasibilityData {
  return {
    lotType: "interior",
    hasAlley: false,
    totalBuildingSqft: 1200,
    lotCoveragePercent: 0.22,
    lotCoverageOver: false,
    lotWidth: 50,
    lotDepth: 108,
    boundRatio: 0.98,
    steepSlopePercent: null,
    steepSlopeArea: null,
    wetlandPercent: null,
    wetlandArea: null,
    wildlifePercent: null,
    wildlifeArea: null,
    riparianPercent: null,
    riparianArea: null,
    floodProne: false,
    liquefaction: false,
    knownSlide: false,
    potentialSlide: false,
    peat: false,
    landfill: false,
    shoreline: null,
    treeCanopyPercent: 0.1,
    existingAADU: 0,
    existingDADU: 0,
    totalADU: 0,
    nearbyDADU: 3,
    nearbyAADU: 5,
    nearestAADUDist: 500,
    nearestDADUDist: 800,
    detachedGarageCount: 0,
    detachedGarageSqft: 0,
    basementSqft: null,
    daylightBasement: null,
    minYearBuilt: 1950,
    maxYearRenovated: null,
    parcelLineCount: 4,
    shapeArea: 5400,
    shapeLength: 300,
    ...overrides,
  };
}

/*
 * Scoring breakdown (new system):
 *   Core: zoning(25) + adu(10) + size(15) + cov(10) + width(5) + depth(5) = 70
 *   Access: alley(+18) | corner(+15) | side-adequate(+15) | side-tight(+5) | none(+0)
 *   Garage: +5
 *   Tree canopy >25%: -min(10, round((pct-25)*0.3))
 *   ECA: variable (see computeEca)
 *   No access penalty: -10 (if type=none and width>0)
 *
 * Default lot: interior, w=50, cov=0.22, lot=5400
 *   sideYard = ((50 - min(30, sqrt(1188*1.3))) / 2) ≈ 10 ft → adequate
 *   Score = 70 + 15 = 85 → High Feasibility
 */

/* ═══════════════════════════════════════════════════════════
   CONFIDENCE SCORE
   ═══════════════════════════════════════════════════════════ */

describe("Confidence Score", () => {
  it("scores 85 for a good interior lot with adequate side access", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    // 70 core + 15 side-adequate = 85
    expect(report.confidence).toBe(85);
    expect(report.confidenceLabel).toBe("High Feasibility");
  });

  it("scores higher with alley access", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ hasAlley: true }));
    // 70 core + 18 alley = 88
    expect(report.confidence).toBe(88);
    expect(report.confidenceLabel).toBe("High Feasibility");
  });

  it("scores higher with corner lot", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotType: "corner" }));
    // 70 core + 15 corner = 85
    expect(report.confidence).toBe(85);
  });

  it("adds +5 for detached garage", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ detachedGarageCount: 1, detachedGarageSqft: 280 }));
    // 70 core + 15 side-adequate + 5 garage = 90
    expect(report.confidence).toBe(90);
  });

  it("maxes out at ~93 with alley + garage", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ hasAlley: true, detachedGarageCount: 1, detachedGarageSqft: 300 }));
    // 70 + 18 + 5 = 93
    expect(report.confidence).toBe(93);
  });

  it("scores very low when zoning is ineligible and lot fails all checks", () => {
    const report = generateADUReport(
      makeParcel({ zoning: "C1", zoningCategory: "C1", lotSqft: 2000 }),
      makeFactors({ lotWidth: 20, lotDepth: 50, totalADU: 3, lotCoveragePercent: 0.5, lotCoverageOver: true })
    );
    // 0 core + 5 (tight side) = 5
    expect(report.confidence).toBe(5);
    expect(report.confidenceLabel).toBe("Unlikely");
  });

  it("penalizes inadequate side access (gives only +5 instead of +15)", () => {
    // Very narrow lot → side yard < 10ft
    const report = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotWidth: 30, lotCoveragePercent: 0.22 })
    );
    // sideYard = ((30 - min(18, sqrt(1188*1.3))) / 2) = (30-18)/2 = 6 → inadequate
    expect(report.access.adequate).toBe(false);
    expect(report.confidence).toBeLessThan(85);
  });

  it("penalizes no access by -10", () => {
    // Very tight lot with high coverage → no meaningful side yard
    const withAccess = generateADUReport(makeParcel(), makeFactors());
    const noAccess = generateADUReport(
      makeParcel({ lotSqft: 3200 }),
      makeFactors({ lotWidth: 25, lotCoveragePercent: 0.45 })
    );
    expect(noAccess.confidence).toBeLessThan(withAccess.confidence);
  });

  it("deducts points for tree canopy above 25%", () => {
    const base = generateADUReport(makeParcel(), makeFactors({ treeCanopyPercent: 0.2 }));
    const highCanopy = generateADUReport(makeParcel(), makeFactors({ treeCanopyPercent: 0.4 }));
    expect(highCanopy.confidence).toBeLessThan(base.confidence);
  });

  it("caps tree canopy penalty at 10 points", () => {
    const normal = generateADUReport(makeParcel(), makeFactors());
    const extreme = generateADUReport(makeParcel(), makeFactors({ treeCanopyPercent: 0.9 }));
    expect(normal.confidence - extreme.confidence).toBe(10);
  });

  it("clamps confidence between 0 and 100", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    expect(report.confidence).toBeGreaterThanOrEqual(0);
    expect(report.confidence).toBeLessThanOrEqual(100);
  });

  it("assigns correct labels at threshold boundaries", () => {
    // ≥85 → High
    const high = generateADUReport(makeParcel(), makeFactors());
    expect(high.confidence).toBeGreaterThanOrEqual(85);
    expect(high.confidenceLabel).toBe("High Feasibility");

    // 60-84 → Moderate
    const moderate = generateADUReport(
      makeParcel(),
      makeFactors({ lotDepth: 50, floodProne: true, knownSlide: true })
    );
    expect(moderate.confidence).toBeGreaterThanOrEqual(60);
    expect(moderate.confidence).toBeLessThan(85);
    expect(moderate.confidenceLabel).toBe("Moderate Feasibility");
  });
});

/* ═══════════════════════════════════════════════════════════
   ECA (Environmentally Critical Areas)
   ═══════════════════════════════════════════════════════════ */

describe("ECA Analysis", () => {
  it("reports no ECA for clean lots", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    expect(report.eca.hasIssues).toBe(false);
    expect(report.eca.count).toBe(0);
    expect(report.eca.labels).toHaveLength(0);
  });

  it("detects flood-prone ECA and penalizes score by 8", () => {
    const clean = generateADUReport(makeParcel(), makeFactors());
    const flood = generateADUReport(makeParcel(), makeFactors({ floodProne: true }));
    expect(flood.eca.hasIssues).toBe(true);
    expect(flood.eca.labels).toContain("Flood-prone area");
    expect(flood.confidence).toBe(clean.confidence - 8);
  });

  it("detects known slide ECA and penalizes by 10", () => {
    const clean = generateADUReport(makeParcel(), makeFactors());
    const slide = generateADUReport(makeParcel(), makeFactors({ knownSlide: true }));
    expect(slide.eca.labels).toContain("Known landslide area");
    expect(slide.confidence).toBe(clean.confidence - 10);
  });

  it("detects peat ECA and penalizes by 5", () => {
    const clean = generateADUReport(makeParcel(), makeFactors());
    const peat = generateADUReport(makeParcel(), makeFactors({ peat: true }));
    expect(peat.eca.labels).toContain("Peat settlement zone");
    expect(peat.confidence).toBe(clean.confidence - 5);
  });

  it("detects liquefaction ECA and penalizes by 4", () => {
    const clean = generateADUReport(makeParcel(), makeFactors());
    const liq = generateADUReport(makeParcel(), makeFactors({ liquefaction: true }));
    expect(liq.eca.labels).toContain("Liquefaction zone");
    expect(liq.confidence).toBe(clean.confidence - 4);
  });

  it("detects steep slope ECA (>10%)", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ steepSlopePercent: 0.25 }));
    expect(report.eca.hasIssues).toBe(true);
    expect(report.eca.labels[0]).toContain("Steep slope");
  });

  it("does NOT flag minor slope (<= 10%) as ECA", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ steepSlopePercent: 0.05 }));
    expect(report.eca.hasIssues).toBe(false);
  });

  it("stacks multiple ECA penalties", () => {
    const report = generateADUReport(
      makeParcel(),
      makeFactors({ floodProne: true, knownSlide: true, peat: true, liquefaction: true })
    );
    expect(report.eca.count).toBe(4);
    // 8 + 10 + 5 + 4 = 27
    expect(report.eca.totalPenalty).toBe(27);
  });

  it("detects wetland ECA", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ wetlandPercent: 0.15 }));
    expect(report.eca.hasIssues).toBe(true);
    expect(report.eca.labels[0]).toContain("Wetland");
  });
});

/* ═══════════════════════════════════════════════════════════
   ACCESS ANALYSIS
   ═══════════════════════════════════════════════════════════ */

describe("Access Analysis", () => {
  it("identifies alley access as adequate", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ hasAlley: true }));
    expect(report.access.type).toBe("alley");
    expect(report.access.adequate).toBe(true);
  });

  it("identifies corner lot access as adequate", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotType: "corner" }));
    expect(report.access.type).toBe("corner");
    expect(report.access.adequate).toBe(true);
  });

  it("measures side yard access for interior lots", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotType: "interior", lotWidth: 50 }));
    expect(report.access.type).toBe("side");
    expect(report.access.sideYardFt).not.toBeNull();
    expect(report.access.sideYardFt!).toBeGreaterThanOrEqual(10);
    expect(report.access.adequate).toBe(true);
  });

  it("flags inadequate side yard when < 10 ft", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotType: "interior", lotWidth: 30, lotCoveragePercent: 0.22 })
    );
    expect(report.access.type).toBe("side");
    expect(report.access.adequate).toBe(false);
    expect(report.access.sideYardFt!).toBeLessThan(10);
  });

  it("prioritizes alley over lot type", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotType: "interior", hasAlley: true }));
    expect(report.access.type).toBe("alley");
  });
});

/* ═══════════════════════════════════════════════════════════
   COVERAGE CALCULATION
   ═══════════════════════════════════════════════════════════ */

describe("Coverage Calculation", () => {
  it("correctly calculates coverage for a 5400 sqft lot at 22%", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 5400 }), makeFactors({ lotCoveragePercent: 0.22 }));
    expect(report.coverage).not.toBeNull();
    expect(report.coverage!.currentPercent).toBeCloseTo(22, 0);
    expect(report.coverage!.maxPercent).toBe(35);
    expect(report.coverage!.usedSqft).toBe(Math.round(0.22 * 5400));
    expect(report.coverage!.maxSqft).toBe(Math.round(0.35 * 5400));
    expect(report.coverage!.availableSqft).toBe(report.coverage!.maxSqft - report.coverage!.usedSqft);
  });

  it("uses 35% max coverage for lots >= 5000 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 6000 }), makeFactors());
    expect(report.coverage!.maxPercent).toBe(35);
  });

  it("uses graduated coverage for lots < 5000 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 3500, zoning: "SF 5000" }), makeFactors());
    expect(report.coverage!.maxPercent).toBeCloseTo(29, 0);
  });

  it("does NOT subtract garage from coverage", () => {
    const withGarage = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotCoveragePercent: 0.25, detachedGarageCount: 1, detachedGarageSqft: 300 })
    );
    expect(withGarage.coverage!.usedSqft).toBe(Math.round(0.25 * 5400));
    expect(withGarage.coverage!.currentPercent).toBeCloseTo(25, 0);
  });

  it("returns null coverage for lot of 0", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 0 }), makeFactors());
    expect(report.coverage).toBeNull();
  });

  it("clamps available coverage at 0 (never negative)", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 3200 }),
      makeFactors({ lotCoveragePercent: 0.5 })
    );
    expect(report.coverage!.availableSqft).toBeGreaterThanOrEqual(0);
  });
});

/* ═══════════════════════════════════════════════════════════
   DADU FOOTPRINT
   ═══════════════════════════════════════════════════════════ */

describe("DADU Footprint", () => {
  it("returns null for lots below 3200 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 3000 }), makeFactors());
    expect(report.daduFootprint).toBeNull();
  });

  it("returns null for ineligible zoning", () => {
    const report = generateADUReport(
      makeParcel({ zoning: "C1", zoningCategory: "C1" }),
      makeFactors()
    );
    expect(report.daduFootprint).toBeNull();
  });

  it("allows up to 1000 sqft for lots >= 4000 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 5400 }), makeFactors({ lotCoveragePercent: 0.1 }));
    expect(report.daduFootprint).not.toBeNull();
    expect(report.daduFootprint!.maxAllowedSqft).toBe(1000);
  });

  it("allows up to 800 sqft for lots between 3200-3999 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 3500 }), makeFactors({ lotCoveragePercent: 0.1 }));
    expect(report.daduFootprint).not.toBeNull();
    expect(report.daduFootprint!.maxAllowedSqft).toBe(800);
  });

  it("caps buildable area at available coverage", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotCoveragePercent: 0.3 })
    );
    expect(report.daduFootprint!.buildableSqft).toBeLessThanOrEqual(report.coverage!.availableSqft);
  });

  it("selects 2 stories when height allows and buildable >= 500", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotWidth: 50, lotCoveragePercent: 0.1 })
    );
    expect(report.daduFootprint!.stories).toBe(2);
    expect(report.daduFootprint!.footprintSqft).toBe(500);
    expect(report.daduFootprint!.livingSqft).toBe(1000);
  });

  it("selects 1 story for narrow lots with low height", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotWidth: 25, lotCoveragePercent: 0.1 })
    );
    expect(report.daduFootprint!.stories).toBe(1);
  });

  it("has 5ft setbacks", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    expect(report.daduFootprint!.rearSetback).toBe(5);
    expect(report.daduFootprint!.sideSetback).toBe(5);
  });

  it("produces valid dimensions that fit the footprint", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    const fp = report.daduFootprint!;
    const dimArea = fp.suggestedWidth * fp.suggestedDepth;
    expect(Math.abs(dimArea - fp.footprintSqft)).toBeLessThan(200);
  });
});

/* ═══════════════════════════════════════════════════════════
   HEIGHT LIMITS
   ═══════════════════════════════════════════════════════════ */

describe("Height Limits", () => {
  it("returns 18+7=25 for lots >= 50ft wide", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotWidth: 55 }));
    expect(report.height).not.toBeNull();
    expect(report.height!.base).toBe(18);
    expect(report.height!.pitched).toBe(7);
    expect(report.height!.total).toBe(25);
  });

  it("returns 18+5=23 for lots 40-49ft wide", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotWidth: 45 }));
    expect(report.height!.total).toBe(23);
  });

  it("returns 16+7=23 for lots 30-39ft wide", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotWidth: 35 }));
    expect(report.height!.base).toBe(16);
    expect(report.height!.pitched).toBe(7);
    expect(report.height!.total).toBe(23);
  });

  it("returns 14+3=17 for lots < 30ft wide", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotWidth: 25 }));
    expect(report.height!.total).toBe(17);
  });

  it("returns null height when width is 0", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotWidth: 0 }));
    expect(report.height).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════
   CHECKS
   ═══════════════════════════════════════════════════════════ */

describe("Feasibility Checks", () => {
  it("produces 6 checks", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    expect(report.checks).toHaveLength(6);
  });

  it("passes zoning for SF, NR, RSL, LR zones", () => {
    for (const z of ["SF 5000", "NR3", "RSL", "LR2 (M)"]) {
      const report = generateADUReport(makeParcel({ zoning: z }), makeFactors());
      const zoningCheck = report.checks.find((c) => c.label === "Zoning");
      expect(zoningCheck!.status).toBe("pass");
    }
  });

  it("fails zoning for commercial zones", () => {
    const report = generateADUReport(makeParcel({ zoning: "C1" }), makeFactors());
    const zoningCheck = report.checks.find((c) => c.label === "Zoning");
    expect(zoningCheck!.status).toBe("fail");
  });

  it("warns when existing ADUs >= 2", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ totalADU: 2 }));
    const aduCheck = report.checks.find((c) => c.label === "Existing ADUs");
    expect(aduCheck!.status).toBe("warning");
  });

  it("passes lot size when >= 3200", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 3200 }), makeFactors());
    const check = report.checks.find((c) => c.label === "Lot Size");
    expect(check!.status).toBe("pass");
  });

  it("warns lot size when < 3200", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 3000 }), makeFactors());
    const check = report.checks.find((c) => c.label === "Lot Size");
    expect(check!.status).toBe("warning");
  });
});

/* ═══════════════════════════════════════════════════════════
   HOUSING OPTIONS
   ═══════════════════════════════════════════════════════════ */

describe("Housing Options", () => {
  it("produces DADU and AADU options for SF zones", () => {
    const report = generateADUReport(makeParcel({ zoning: "SF 5000" }), makeFactors());
    const types = report.housingOptions.map((o) => o.type);
    expect(types).toContain("DADU");
    expect(types).toContain("AADU");
  });

  it("includes Cottage Housing for SF lots >= 4000 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 5000, zoning: "SF 5000" }), makeFactors());
    const types = report.housingOptions.map((o) => o.type);
    expect(types).toContain("Cottage Housing");
  });

  it("excludes Cottage Housing for SF lots < 4000 sqft", () => {
    const report = generateADUReport(makeParcel({ lotSqft: 3500, zoning: "SF 5000" }), makeFactors());
    const types = report.housingOptions.map((o) => o.type);
    expect(types).not.toContain("Cottage Housing");
  });

  it("produces Townhouses, Apartments, and DADU for LR zones", () => {
    const report = generateADUReport(makeParcel({ zoning: "LR2 (M)", zoningCategory: "LR2" }), makeFactors());
    const types = report.housingOptions.map((o) => o.type);
    expect(types).toContain("Townhouses");
    expect(types).toContain("Apartments");
    expect(types).toContain("DADU");
  });

  it("uses correct density per unit for LR3", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 4800, zoning: "LR3", zoningCategory: "LR3" }),
      makeFactors()
    );
    const th = report.housingOptions.find((o) => o.type === "Townhouses")!;
    expect(th.estimatedUnits).toBe(6);
  });

  it("disallows DADU when totalADU >= 2 in SF zone", () => {
    const report = generateADUReport(makeParcel({ zoning: "SF 5000" }), makeFactors({ totalADU: 2 }));
    const dadu = report.housingOptions.find((o) => o.type === "DADU")!;
    expect(dadu.allowed).toBe(false);
  });

  it("produces Small Lot Housing and Cottage for RSL zones", () => {
    const report = generateADUReport(makeParcel({ zoning: "RSL", zoningCategory: "RSL" }), makeFactors());
    const types = report.housingOptions.map((o) => o.type);
    expect(types).toContain("Small Lot Housing");
    expect(types).toContain("Cottage Housing");
  });
});

/* ═══════════════════════════════════════════════════════════
   TRAITS (Sentiment Categorization)
   ═══════════════════════════════════════════════════════════ */

describe("Property Traits", () => {
  it("marks corner lot as good", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotType: "corner" }));
    const t = report.traits.find((t) => t.title === "Corner lot");
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("good");
  });

  it("marks alley access as good", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ hasAlley: true }));
    const t = report.traits.find((t) => t.title === "Alley access");
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("good");
  });

  it("marks detached garage as good", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ detachedGarageCount: 1, detachedGarageSqft: 280 }));
    const t = report.traits.find((t) => t.title === "Detached garage");
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("good");
    expect(t!.note).toContain("280");
  });

  it("marks adequate side access as good with measurement", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ lotType: "interior", lotWidth: 50 }));
    const t = report.traits.find((t) => t.title.includes("Side yard"));
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("good");
    expect(t!.title).toMatch(/~\d+ ft/);
  });

  it("marks tight side access as bad with measurement", () => {
    const report = generateADUReport(
      makeParcel({ lotSqft: 5400 }),
      makeFactors({ lotType: "interior", lotWidth: 30, lotCoveragePercent: 0.22 })
    );
    const t = report.traits.find((t) => t.title.includes("Side yard"));
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("bad");
  });

  it("marks flood-prone as bad and includes ECA label", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ floodProne: true }));
    const t = report.traits.find((t) => t.title === "Flood-prone area");
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("bad");
    expect(t!.note).toContain("ECA");
  });

  it("marks all environmental hazards as bad", () => {
    const report = generateADUReport(
      makeParcel(),
      makeFactors({ floodProne: true, liquefaction: true, knownSlide: true, peat: true })
    );
    const bad = report.traits.filter(t => t.sentiment === "bad");
    expect(bad.length).toBeGreaterThanOrEqual(4);
  });

  it("marks high tree canopy (>25%) as bad", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ treeCanopyPercent: 0.35 }));
    const t = report.traits.find((t) => t.title === "Tree canopy");
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("bad");
  });

  it("marks low tree canopy (<=25%) as neutral", () => {
    const report = generateADUReport(makeParcel(), makeFactors({ treeCanopyPercent: 0.15 }));
    const t = report.traits.find((t) => t.title === "Tree canopy");
    expect(t).toBeTruthy();
    expect(t!.sentiment).toBe("neutral");
  });
});

/* ═══════════════════════════════════════════════════════════
   EDGE CASES
   ═══════════════════════════════════════════════════════════ */

describe("Edge Cases", () => {
  it("handles null parcel gracefully", () => {
    const report = generateADUReport(null, makeFactors());
    expect(report.confidence).toBeDefined();
    expect(report.checks).toHaveLength(6);
    expect(report.eca).toBeDefined();
    expect(report.access).toBeDefined();
  });

  it("handles null factors gracefully", () => {
    const report = generateADUReport(makeParcel(), null);
    expect(report.confidence).toBeDefined();
    expect(report.checks).toHaveLength(6);
    expect(report.eca.hasIssues).toBe(false);
  });

  it("handles both null gracefully", () => {
    const report = generateADUReport(null, null);
    // Core: adu(10) + cov(10) = 20, no access bonus, no penalties
    expect(report.confidence).toBe(20);
    expect(report.confidenceLabel).toBe("Unlikely");
  });

  it("produces consistent stats array", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    expect(report.stats).toHaveLength(4);
    expect(report.stats.map((s) => s.label)).toEqual(["Lot Size", "Zoning", "Dimensions", "Year Built"]);
  });

  it("always returns eca and access in report", () => {
    const report = generateADUReport(makeParcel(), makeFactors());
    expect(report.eca).toBeDefined();
    expect(report.eca.hasIssues).toBe(false);
    expect(report.access).toBeDefined();
    expect(report.access.type).toBeDefined();
  });
});
