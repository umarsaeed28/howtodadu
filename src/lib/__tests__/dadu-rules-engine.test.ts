import { describe, it, expect } from "vitest";
import {
  parseParcelText,
  scoreParcel,
  generateRating,
  buildScoreBreakdown,
} from "../dadu-rules-engine";

const SAMPLE = `1526 N 107TH ST
Parcel 4358700121

Zoning: NR2
Lot size: 6003
Lot coverage: 20.2%
Available coverage: 891
Lot width: 60 ft
Lot depth: 100 ft
Interior lot
Detached garage: 360 sqft
Tree canopy: 25.4%
ECA: false`;

describe("parseParcelText", () => {
  it("parses the reference ADUniverse-style block", () => {
    const p = parseParcelText(SAMPLE);
    expect(p.address).toContain("107TH");
    expect(p.parcelId).toBe("4358700121");
    expect(p.zoning).toBe("NR2");
    expect(p.lotSizeSqft).toBe(6003);
    expect(p.lotCoveragePercent).toBeCloseTo(20.2, 2);
    expect(p.availableCoverageSqft).toBe(891);
    expect(p.lotWidthFt).toBe(60);
    expect(p.lotDepthFt).toBe(100);
    expect(p.lotType).toBe("interior");
    expect(p.hasDetachedGarage).toBe(true);
    expect(p.garageSqft).toBe(360);
    expect(p.treeCanopyPercent).toBeCloseTo(25.4, 2);
    expect(p.hasEcaIssue).toBe(false);
  });

  it("accepts fractional canopy as 0–1", () => {
    const p = parseParcelText("Zoning: NR2\nTree canopy: 0.254");
    expect(p.treeCanopyPercent).toBeCloseTo(25.4, 2);
  });
});

describe("generateRating", () => {
  it("returns A for prime band", () => {
    expect(generateRating(90).letter).toBe("A");
  });
  it("returns F below 40", () => {
    expect(generateRating(12).letter).toBe("F");
  });
});

describe("scoreParcel — spec scenarios", () => {
  it("sample block scores in band A and applies canopy >25% penalty", () => {
    const p = parseParcelText(SAMPLE);
    const r = scoreParcel(p);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.rating).toBe("A");
    expect(r.factorLines.find((f) => f.key === "canopy")?.delta).toBe(-8);
    expect(r.factorLines.find((f) => f.key === "zoning")?.delta).toBe(12);
    expect(r.flags).toContain("nr_zoning_preferred");
    expect(r.flags).toContain("tree_canopy_high");
  });

  it("alley corner lot earns +25 access (highest access tier)", () => {
    const p = parseParcelText(`Zoning: NR2
Lot size: 6000
Available coverage: 900
Lot width: 55 ft
Lot depth: 95 ft
Alley corner lot
Tree canopy: 15%
ECA: false`);
    expect(p.lotType).toBe("alley_corner");
    const r = scoreParcel(p);
    expect(r.factorLines.find((f) => f.key === "access")?.delta).toBe(25);
  });

  it("side access only (+12) without alley", () => {
    const p = parseParcelText(`Zoning: NR2
Lot size: 5000
Available coverage: 800
Lot width: 45 ft
Lot depth: 80 ft
Corner lot
Side access: true
Tree canopy: 10%
ECA: false`);
    const r = scoreParcel(p);
    expect(r.factorLines.find((f) => f.key === "access")?.delta).toBe(12);
  });

  it("interior lot with no alley and explicit no side access → +0 access", () => {
    const p = parseParcelText(`Zoning: NR2
Lot size: 5000
Available coverage: 700
Lot width: 40 ft
Lot depth: 80 ft
Interior lot
Side access: false
Tree canopy: 12%
ECA: false`);
    const r = scoreParcel(p);
    expect(r.factorLines.find((f) => f.key === "access")?.delta).toBe(0);
  });

  it("ECA flagged: hard cap + reinforcement penalty", () => {
    const p = parseParcelText(`Zoning: NR2
Lot size: 6000
Available coverage: 900
Lot width: 50 ft
Lot depth: 90 ft
Interior lot
Tree canopy: 10%
ECA: true`);
    const r = scoreParcel(p);
    expect(r.hardCapCeiling).toBe(30);
    expect(r.factorLines.find((f) => f.key === "eca")?.delta).toBe(-15);
    expect(r.flags).toContain("eca_flagged");
    expect(r.score).toBeLessThanOrEqual(30);
  });

  it("coverage <800 triggers flag; <400 applies hard cap ceiling 20", () => {
    const low = parseParcelText(`Zoning: NR2
Lot size: 5000
Available coverage: 350
Lot width: 50 ft
Lot depth: 90 ft
Interior lot
Tree canopy: 10%
ECA: false`);
    const r = scoreParcel(low);
    expect(r.hardCapCeiling).toBe(20);
    expect(r.flags).toContain("coverage_under_400_hard_cap");
    expect(r.flags).toContain("coverage_under_800");
  });

  it("large lot + garage + alley (ideal case) scores highly", () => {
    const p = parseParcelText(`Zoning: LR1
Lot size: 7200
Available coverage: 1200
Lot width: 55 ft
Lot depth: 100 ft
Alley access
Detached garage: 400 sqft
Tree canopy: 18%
ECA: false
Nearby ADUs: true`);
    const r = scoreParcel(p);
    expect(r.rating).toMatch(/^[AB]$/);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.factorLines.find((f) => f.key === "garage")?.delta).toBe(15);
    expect(r.factorLines.find((f) => f.key === "density")?.delta).toBe(5);
    expect(r.factorLines.find((f) => f.key === "zoning")?.delta).toBe(-10);
    expect(r.flags).toContain("zoning_not_nr_tier");
  });

  it("NR zoning scores higher than LR for otherwise identical inputs", () => {
    // Inputs chosen so raw score stays below 100; NR +12 vs LR -10 yields a visible gap.
    const base = `Lot size: 5000
Available coverage: 800
Lot width: 50 ft
Lot depth: 90 ft
Interior lot
Tree canopy: 10%
ECA: false`;
    const nr = parseParcelText(`Zoning: NR2\n${base}`);
    const lr = parseParcelText(`Zoning: LR1\n${base}`);
    expect(scoreParcel(nr).score).toBeGreaterThan(scoreParcel(lr).score);
    expect(scoreParcel(nr).score - scoreParcel(lr).score).toBe(22);
  });

  it("caps score below 75 when available coverage is under 700 sq ft", () => {
    const p = parseParcelText(`Zoning: NR2
Lot size: 6000
Available coverage: 650
Lot width: 55 ft
Lot depth: 100 ft
Alley corner lot
Detached garage: 400 sqft
Tree canopy: 12%
ECA: false`);
    const r = scoreParcel(p);
    expect(r.score).toBeLessThan(75);
    expect(r.score).toBeLessThanOrEqual(74);
  });

  it("zoning outside NR/RSL/LR caps score at 10", () => {
    const p = parseParcelText(`Zoning: SF 5000
Lot size: 6000
Available coverage: 1000
Lot width: 50 ft
Lot depth: 100 ft
Alley corner
Tree canopy: 5%
ECA: false`);
    const r = scoreParcel(p);
    expect(r.hardCapCeiling).toBe(10);
    expect(r.flags).toContain("zoning_not_nr_rsl_lr");
    expect(r.score).toBeLessThanOrEqual(10);
  });
});

describe("buildScoreBreakdown", () => {
  it("includes factors and flags", () => {
    const p = parseParcelText(SAMPLE);
    const r = scoreParcel(p);
    const b = buildScoreBreakdown(p, r);
    expect(b.finalScore).toBe(r.score);
    expect(b.factors).toEqual(r.factors);
    expect(Array.isArray(b.flags)).toBe(true);
  });
});
