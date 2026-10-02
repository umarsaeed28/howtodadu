import { describe, expect, it } from "vitest";
import { gradeFrom, gradeNote, spotSamplePoints } from "./grade";
import { scoreSite } from "./dadu-score";

const LAT = 47.6, FT = 364567, FTX = FT * Math.cos((LAT * Math.PI) / 180);
const at = (x: number, y: number): [number, number] => [-122.3 + x / FTX, LAT + y / FT];
const spot = [at(0, 0), at(30, 0), at(30, 25), at(0, 25)]; // a 30 x 25 ft DADU site

describe("grade across the DADU site", () => {
  it("samples a 5 x 5 grid inside the spot", () => expect(spotSamplePoints(spot)).toHaveLength(25));
  it("flat ground is 0%", () => {
    const pts = spotSamplePoints(spot);
    expect(gradeFrom(pts, pts.map(() => 200))!.slopePct).toBe(0);
  });
  it("a plane rising 1 ft every 5 ft east is 20% and the rise is measured", () => {
    const pts = spotSamplePoints(spot);
    const g = gradeFrom(pts, pts.map(([lng]) => 200 + ((lng - spot[0][0]) * FTX) / 5))!;
    expect(g.slopePct).toBeCloseTo(20, 0);
    expect(g.riseFt).toBeCloseTo(4.8, 0);
  });
  it("too few samples gives no answer", () => expect(gradeFrom(spotSamplePoints(spot), new Array(25).fill(null))).toBeNull());
  it("notes say what it means for cost", () => {
    expect(gradeNote({ slopePct: 22, riseFt: 7 })).toMatch(/very steep.*retaining walls/);
    expect(gradeNote({ slopePct: 12, riseFt: 4 })).toMatch(/steep.*stepped foundation/);
    expect(gradeNote({ slopePct: 3, riseFt: 1 })).toMatch(/flat/);
  });
});

describe("the score follows the slope", () => {
  const great = { lotSqft: 6000, widthFt: 50, depthFt: 120, alley: true, corner: false, daduSqft: 1000, steepPct: 0, canopyPct: 0.05, ecaFlags: [], existingAdus: 0, zoning: "NR3", hoaMonthly: null,
    trees: { large: 0, medium: 0, small: 0, canopyPct: 5, clearSqft: 1500, clearSqftIfMediumRemoved: 1500, siteSqft: 1500, site: "behind" as const } };
  it("a flat site stays a top pick", () => expect(scoreSite({ ...great, grade: { slopePct: 2, riseFt: 0.6 } }).grade).toBe("Top pick"));
  it("5 to 10% costs points but stays Good or better", () => expect(scoreSite({ ...great, grade: { slopePct: 7, riseFt: 2 } }).score).toBeGreaterThanOrEqual(82));
  it("10% or more is Fair at best", () => expect(scoreSite({ ...great, grade: { slopePct: 12, riseFt: 4 } }).score).toBeLessThanOrEqual(81));
  it("20% or more is Marginal, so it is hidden", () => expect(scoreSite({ ...great, grade: { slopePct: 22, riseFt: 7 } }).score).toBeLessThan(70));
});
