import { describe, expect, it } from "vitest";
import { sideClearance, type Ring } from "./side-clearance";

// Build lng/lat rings from local feet around a Seattle origin, optionally rotated.
const LAT0 = 47.7, LNG0 = -122.31, FT = 111_320 * 3.28084;
const k = Math.cos((LAT0 * Math.PI) / 180);
const ring = (pts: [number, number][], deg = 0): Ring => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const r = pts.map(([x, y]) => [LNG0 + (x * c - y * s) / (k * FT), LAT0 + (x * s + y * c) / FT] as [number, number]);
  return [...r, r[0]];
};
const rect = (x0: number, y0: number, w: number, h: number, deg = 0) => ring([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], deg);

describe("sideClearance", () => {
  it("12042 14th Ave NE: a 53 ft house on a 64 ft lot leaves 6 ft each side, too little for a driveway", () => {
    const c = sideClearance(rect(0, 0, 138, 64), [rect(57, 6, 39, 52)])!;
    expect(c.leftFt).toBeCloseTo(6, 0);
    expect(c.rightFt).toBeCloseTo(6, 0);
    expect(c.maxFt).toBeLessThan(10);
  });
  it("a 50 ft lot with a 30 ft house set to one side leaves 16 ft for a driveway", () => {
    const c = sideClearance(rect(0, 0, 120, 50), [rect(20, 4, 40, 30)])!;
    expect(c.maxFt).toBeCloseTo(16, 0);
    expect(c.leftFt).toBeCloseTo(4, 0);
  });
  it("works on a lot rotated off the grid", () => {
    const c = sideClearance(rect(0, 0, 138, 64, 33), [rect(57, 6, 39, 52, 33)])!;
    expect(c.leftFt).toBeCloseTo(6, 0);
    expect(c.rightFt).toBeCloseTo(6, 0);
  });
  it("measures from the house, not a small shed, and ignores the neighbour's house", () => {
    const c = sideClearance(rect(0, 0, 120, 50), [rect(20, 10, 40, 30), rect(100, 1, 10, 10), rect(30, 52, 40, 30)])!;
    expect(c.houseSqft).toBeCloseTo(1200, -1);
    expect(c.maxFt).toBeCloseTo(10, 0);
  });
  it("returns null when no building sits on the lot", () => {
    expect(sideClearance(rect(0, 0, 120, 50), [])).toBeNull();
    expect(sideClearance(rect(0, 0, 120, 50), [rect(30, 60, 40, 30)])).toBeNull();
  });
});
