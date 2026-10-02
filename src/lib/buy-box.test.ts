import { describe, expect, it } from "vitest";
import { buyBoxMiss, inBuyBox } from "./buy-box";

const ok = { zoning: "NR", lotSqft: 5000, coveragePct: 18, existingAdus: 0, score: 82 };

describe("buy box", () => {
  it("a 5,000 sf NR lot, 18% built on, one unit, score 82 is in", () => expect(inBuyBox(ok)).toBe(true));
  it("lot 3,800 sf is in, 3,799 is out", () => {
    expect(inBuyBox({ ...ok, lotSqft: 3800 })).toBe(true);
    expect(buyBoxMiss({ ...ok, lotSqft: 3799 })).toMatch(/lot/);
  });
  it("coverage under 25% only", () => {
    expect(inBuyBox({ ...ok, coveragePct: 24.9 })).toBe(true);
    expect(buyBoxMiss({ ...ok, coveragePct: 25 })).toMatch(/coverage/);
    expect(buyBoxMiss({ ...ok, coveragePct: null })).toMatch(/unknown/);
  });
  it("NR, NR2 and NR3 are in; NR1 and other zones are out", () => {
    for (const z of ["NR", "NR2", "NR3", "nr3"]) expect(inBuyBox({ ...ok, zoning: z })).toBe(true);
    for (const z of ["NR1", "LR1", "SF 5000", null]) expect(inBuyBox({ ...ok, zoning: z })).toBe(false);
  });
  it("one unit only: an existing ADU puts it out", () => expect(buyBoxMiss({ ...ok, existingAdus: 1 })).toMatch(/unit/));
  it("score 65 is in, 64 is out", () => {
    expect(inBuyBox({ ...ok, score: 65 })).toBe(true);
    expect(buyBoxMiss({ ...ok, score: 64 })).toMatch(/score/);
  });
});
