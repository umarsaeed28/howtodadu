import { describe, expect, it } from "vitest";
import { emptyFeasibilityData, type LotGeometry, type SitePlanData } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { computeSiteFrame, envelopeSize, planFitFor, setbackViolations, violationText, FT_PER_DEG_LAT } from "./site-envelope";

// A 50 ft x 100 ft lot in Seattle with the street along its south side.
const lat0 = 47.68;
const lng0 = -122.33;
const ftLng = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
const at = (xFt: number, yFt: number): [number, number] => [lng0 + xFt / ftLng, lat0 + yFt / FT_PER_DEG_LAT];
const lot: LotGeometry = { rings: [at(0, 0), at(50, 0), at(50, 100), at(0, 100), at(0, 0)], bbox: [0, 0, 0, 0], aerialUrl: "", imageSize: 0 };
const sitePlan = { buildings: [], trees: [], streets: [{ name: "N 125th St", paths: [[at(-80, -25), at(130, -25)]] }], driveways: [], adjacentParcels: [] } as unknown as SitePlanData;
const feasibility = { ...emptyFeasibilityData(), lotWidth: 50, lotDepth: 100, hasAlley: false };
const report = { daduFootprint: { sideSetback: 5, rearSetback: 5, maxAllowedSqft: 1000, stories: 2, suggestedWidth: 24, suggestedDepth: 24, maxHeight: 22 } } as unknown as ADUReport;

const frame = computeSiteFrame({ lot, sitePlan, feasibility, report });

describe("site frame", () => {
  it("squares the lot, finds the street side, and applies the NR setbacks", () => {
    expect(frame.lw).toBeCloseTo(50, 0);
    expect(frame.ld).toBeCloseTo(100, 0);
    expect(frame.swap).toBe(false);
    expect([frame.sideL, frame.sideR, frame.rearSb, frame.frontSb]).toEqual([5, 5, 5, 15]);
    const env = envelopeSize(frame);
    expect(env.w).toBeCloseTo(40, 0);
    expect(env.d).toBeCloseTo(80, 0);
    expect(frame.polyEnvelope).toBe(true);
    expect(frame.lotEdges.map((e) => e.kind).sort()).toEqual(["front", "rear", "side", "side"]);
  });

  it("fits plans by footprint (either way round) and by the size limit", () => {
    expect(planFitFor(frame, { widthFt: 24, depthFt: 24, sqft: 576 })).toEqual({ fits: true, reason: null });
    expect(planFitFor(frame, { widthFt: 34, depthFt: 16, sqft: 1000 }).fits).toBe(true);
    expect(planFitFor(frame, { widthFt: 45, depthFt: 80, sqft: 900 })).toEqual({ fits: false, reason: "Too big for this lot" });
    expect(planFitFor(frame, { widthFt: 20, depthFt: 20, sqft: 1200 })).toEqual({ fits: false, reason: "Over the 1,000 sf limit" });
  });

  it("measures how far a footprint reaches into a setback", () => {
    // 20 x 21 ft, 2 ft from the rear lot line: 3 ft into the 5 ft rear setback.
    const tooFar = frame.rect(10, 77, 20, 21);
    const v = setbackViolations(frame.lotEdges, tooFar);
    expect(v[0]).toEqual({ edge: "rear", overByFt: 3 });
    expect(violationText(v[0])).toBe("Too close to the rear property line by 3 ft.");
    // 2 ft from the left side line: 3 ft into the side setback.
    expect(setbackViolations(frame.lotEdges, frame.rect(2, 40, 20, 20))[0]).toEqual({ edge: "side", overByFt: 3 });
    // Inside every setback: nothing to report.
    expect(setbackViolations(frame.lotEdges, frame.rect(10, 40, 20, 20))).toEqual([]);
  });
});

describe("plan fit against the open ground", () => {
  it("rejects every design when the house leaves no spot, and any design larger than the spot", () => {
    const f = { ...frame, maxLiving: 1000 };
    expect(planFitFor({ ...f, roomSqft: 0 }, { widthFt: 16, depthFt: 20, sqft: 600 })).toEqual({ fits: false, reason: "No open spot for a DADU on this lot" });
    expect(planFitFor({ ...f, roomSqft: 400 }, { widthFt: 20, depthFt: 30, sqft: 600 })).toEqual({ fits: false, reason: "Needs 600 sf of open ground; the lot has about 400 sf" });
    expect(planFitFor({ ...f, roomSqft: 700 }, { widthFt: 20, depthFt: 30, sqft: 600 })).toEqual({ fits: true, reason: null });
    expect(planFitFor({ ...f, roomSqft: null }, { widthFt: 20, depthFt: 30, sqft: 600 })).toEqual({ fits: true, reason: null });
  });
});
