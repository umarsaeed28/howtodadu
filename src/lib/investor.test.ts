import { describe, expect, it } from "vitest";
import { computeBasis, computeYield } from "./investor";

describe("computeBasis", () => {
  it("adds the DADU build estimate to the price", () => {
    const b = computeBasis({ price: 800000, livingSqft: 1600, lotSqft: 4000, daduSqft: 800, landAv: 600000, bldgAv: 200000 });
    expect(b.buildCost).toBe(280000);
    expect(b.allIn).toBe(1080000);
    expect(b.pricePerSf).toBe(500);
    expect(b.allInPerTotalSf).toBe(450);
    expect(b.landSharePct).toBe(75);
    expect(b.priceToAssessed).toBe(1);
  });
  it("returns nulls, not guesses, when facts are missing", () => {
    const b = computeBasis({ price: 500000 });
    expect(b.pricePerSf).toBeNull();
    expect(b.landSharePct).toBeNull();
    expect(b.buildCost).toBe(0);
  });
});

describe("computeYield", () => {
  it("computes net yield on build cost from the investor's own inputs", () => {
    const y = computeYield({ rentMonthly: 3000, vacancyPct: 5, opexPct: 30, capPct: 5, buildCost: 280000 });
    expect(Math.round(y.noi)).toBe(23940);
    expect(y.yieldOnBuild).toBeCloseTo(0.0855, 3);
    expect(y.paybackYears).toBeCloseTo(11.7, 1);
    expect(Math.round(y.impliedValue!)).toBe(478800);
    expect(y.ignored).toEqual([]);
  });
  it("says which inputs were left blank", () => {
    const y = computeYield({ rentMonthly: 2000, vacancyPct: null, opexPct: null, capPct: null, buildCost: 200000 });
    expect(y.ignored).toEqual(["vacancy", "operating costs"]);
    expect(y.impliedValue).toBeNull();
  });
});
