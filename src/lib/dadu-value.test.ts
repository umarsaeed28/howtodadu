import { describe, expect, it } from "vitest";
import { daduEconomics, salePricePerSf } from "./dadu-value";

describe("DADU resale value and ROI", () => {
  it("hits the two market points and the line between them", () => {
    expect(salePricePerSf(800)).toBe(800);
    expect(salePricePerSf(1000)).toBe(680);
    expect(salePricePerSf(900)).toBe(740);
    expect(salePricePerSf(600)).toBe(920);
  });
  it("holds the rate flat outside 500 to 1,000 sf", () => {
    expect(salePricePerSf(300)).toBe(salePricePerSf(500));
    expect(salePricePerSf(1200)).toBe(680);
  });
  it("a 1,000 sf DADU: $680,000 sale, $400,000 all in, 70% ROI", () => {
    const e = daduEconomics(1000)!;
    expect(e.saleValue).toBe(680_000);
    expect(e.buildCost).toBe(350_000);
    expect(e.allInCost).toBe(400_000);
    expect(e.profit).toBe(280_000);
    expect(e.roi).toBeCloseTo(0.7, 3);
  });
  it("an 800 sf DADU: $640,000 sale, $330,000 all in, 94% ROI", () => {
    const e = daduEconomics(800)!;
    expect(e.saleValue).toBe(640_000);
    expect(e.allInCost).toBe(330_000);
    expect(Math.round(e.roi * 100)).toBe(94);
  });
  it("no room means no economics", () => expect(daduEconomics(0)).toBeNull());
});
