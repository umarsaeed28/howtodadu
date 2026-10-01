import { describe, expect, it } from "vitest";
import { contourLines, elevationAt, profile, type TerrainGrid } from "./terrain";

// A plane rising 1 ft per column eastward: z = 100 + col.
const plane = (cols = 11, rows = 6): TerrainGrid => ({
  lng0: 0, lat0: 0, dLng: 1, dLat: 1, cols, rows,
  z: Array.from({ length: cols * rows }, (_, i) => 100 + (i % cols)),
  source: "test",
});

describe("terrain", () => {
  it("interpolates between samples", () => {
    expect(elevationAt(plane(), 2.5, 1.5)).toBeCloseTo(102.5);
    expect(elevationAt(plane(), -1, 0)).toBeNull();
  });
  it("draws 2 ft contours as north-south lines on an east-rising plane, index lines every 10 ft", () => {
    const c = contourLines(plane(), 2, 10);
    expect(c.map((x) => x.elevation)).toEqual([102, 104, 106, 108, 110]); // 100 is the lowest edge: no crossing
    expect(c.find((x) => x.elevation === 110)!.index).toBe(true);
    const mid = c.find((x) => x.elevation === 104)!;
    for (const seg of mid.segments) for (const [lng] of seg) expect(lng).toBeCloseTo(4);
  });
  it("skips cells with no data", () => {
    const g = plane();
    g.z = g.z.map(() => null);
    expect(contourLines(g)).toEqual([]);
  });
  it("profiles along a line", () => {
    const p = profile(plane(), [1, 2], [9, 2], 8, 2);
    expect(p.map((x) => Math.round(x.z!))).toEqual([101, 103, 105, 107, 109]);
  });
});
