import { describe, expect, it } from "vitest";
import { lotRotation, turn, unturn } from "./lot-orientation";

const rect = (w: number, d: number, deg: number, at = { x: 40, y: -25 }) =>
  [[0, 0], [w, 0], [w, d], [0, d]].map(([x, y]) => turn({ x, y }, (deg * Math.PI) / 180)).map((p) => ({ x: p.x + at.x, y: p.y + at.y }));
const box = (pts: { x: number; y: number }[]) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) };
};

describe("lotRotation", () => {
  it("a north-up lot is left alone", () => expect(lotRotation(rect(60, 118, 0))).toBe(0));
  it("under one degree is left alone", () => expect(lotRotation(rect(60, 118, 0.6))).toBe(0));

  it("a lot at 20 degrees (the production bug) squares to its real 60 x 118 ft, not a 98 x 131 ft tilted box", () => {
    const lot = rect(118, 60, -20);
    const t = lotRotation(lot);
    expect((t * 180) / Math.PI).toBeCloseTo(-20, 5);
    const b = box(lot.map((p) => unturn(p, t)));
    expect(b.w).toBeCloseTo(118, 5);
    expect(b.d).toBeCloseTo(60, 5);
    expect(box(lot).w).toBeGreaterThan(130); // what the old north-up frame measured
  });

  it("always takes the smallest turn, within 45 degrees", () => {
    for (const deg of [-80, -50, -30, 10, 37, 44, 60, 88]) {
      const t = lotRotation(rect(50, 120, deg));
      expect(Math.abs(t)).toBeLessThanOrEqual(Math.PI / 4 + 1e-9);
      const b = box(rect(50, 120, deg).map((p) => unturn(p, t)));
      expect(Math.min(b.w, b.d)).toBeCloseTo(50, 4);
      expect(Math.max(b.w, b.d)).toBeCloseTo(120, 4);
    }
  });

  it("an irregular lot (a notch cut out) still squares to its long side", () => {
    const pts = [[0, 0], [100, 0], [100, 50], [70, 50], [70, 40], [0, 40]].map(([x, y]) => turn({ x, y }, (25 * Math.PI) / 180));
    expect((lotRotation(pts) * 180) / Math.PI).toBeCloseTo(25, 5);
  });

  it("turn undoes unturn", () => {
    const p = { x: 12.5, y: -7 };
    const q = turn(unturn(p, 0.4), 0.4);
    expect(q.x).toBeCloseTo(p.x, 9);
    expect(q.y).toBeCloseTo(p.y, 9);
  });
});
