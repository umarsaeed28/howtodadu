import { describe, expect, it } from "vitest";
import { analyzeTrees, largestRect, streetAxis, treeSize } from "./tree-analysis";

// A 50 x 120 ft lot fronting an avenue on the west, in lng/lat near Seattle. x grows east, y grows north.
const LAT = 47.6, FT = 364567, FTX = FT * Math.cos((LAT * Math.PI) / 180);
const at = (x: number, y: number): [number, number] => [-122.3 + x / FTX, LAT + y / FT];
const rect = (x0: number, y0: number, x1: number, y1: number) => [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)];
const lot = rect(0, 0, 120, 50);
const house = rect(20, 8, 60, 42); // 40 ft deep, 20 ft from the street

describe("tree analysis", () => {
  it("sizes trees from crown and height", () => {
    expect(treeSize({ r: 16, h: 30 })).toBe("large");
    expect(treeSize({ r: 8, h: 55 })).toBe("large");
    expect(treeSize({ r: 11, h: 20 })).toBe("medium");
    expect(treeSize({ r: 6, h: 18 })).toBe("small");
  });
  it("reads the street direction from the address, ZIP and direction included", () => {
    expect(streetAxis("9612 55TH AVE S 98118")).toBe("ns");
    expect(streetAxis("522 NE 127TH ST 98125")).toBe("ew");
    expect(streetAxis("3211 W LAURELHURST DR NE")).toBe(null);
  });
  it("an open back yard: room behind the house, no trees in it", () => {
    const t = analyzeTrees(lot, [house], [], "ns");
    expect(t.site).toBe("behind");
    expect(t.clearSqft).toBeGreaterThanOrEqual(1000);
  });
  it("a large tree filling the back yard leaves no clear spot even with medium trees out", () => {
    const [lng, lat] = at(92, 25);
    const t = analyzeTrees(lot, [house], [{ lng, lat, r: 30, h: 70 }], "ns");
    expect(t.large).toBe(1);
    expect(t.clearSqftIfMediumRemoved).toBeLessThan(300);
  });
  it("a detached garage in the back corner does not block the site (a DADU often replaces it)", () => {
    const t = analyzeTrees(lot, [house, rect(100, 30, 115, 48)], [], "ns");
    expect(t.clearSqft).toBeGreaterThanOrEqual(1000);
  });
  it("the strip beside the house is not a DADU site when the back yard has room", () => {
    // A tree over the whole back yard; the 20 ft side yard north of a narrower house stays out of the count.
    const [lng, lat] = at(92, 25);
    const t = analyzeTrees(rect(0, 0, 120, 70), [rect(20, 8, 60, 42)], [{ lng, lat, r: 40, h: 70 }], "ns");
    expect(t.site).toBe("behind");
    expect(t.clearSqftIfMediumRemoved).toBeLessThan(300);
  });
  it("largestRect respects the minimum side", () => {
    const ok = new Uint8Array(30 * 10).fill(1); // 30 x 10 cells: area 300 but only 10 high
    expect(largestRect(ok, 30, 10, 15).area).toBe(0);
    expect(largestRect(ok, 30, 10, 10).area).toBe(300);
  });
});
