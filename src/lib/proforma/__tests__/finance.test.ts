import { describe, expect, it } from "vitest";
import { amortization, annualize, dscr, irr, npv, pmt, xirr } from "../finance";
import { dollars, pctOf, roundCents, splitByWeights, splitEvenly } from "../money";
import { drawSchedule, normCdf, scurveWeights } from "../draws";
import { reet, stateReet, stateScheduleOn, WA_STATE_REET_2023, WA_STATE_REET_2027 } from "../reet";

/* Excel's own documented examples (support.microsoft.com function pages) and numpy-financial as the references. */
describe("finance functions against Excel", () => {
  it("NPV: =NPV(10%, -10000, 3000, 4200, 6800) = 1,188.44", () => {
    expect(npv(0.1, [-10000, 3000, 4200, 6800])).toBeCloseTo(1188.44, 2);
  });
  it("IRR: Excel's -70,000 then 12,000 / 15,000 / 18,000 / 21,000 (/ 26,000)", () => {
    expect(irr([-70000, 12000, 15000, 18000, 21000])! * 100).toBeCloseTo(-2.12, 2);
    expect(irr([-70000, 12000, 15000, 18000, 21000, 26000])! * 100).toBeCloseTo(8.66, 2);
  });
  it("IRR: no sign change means no rate", () => {
    expect(irr([-1, -2, -3])).toBeNull();
    expect(irr([1, 2])).toBeNull();
  });
  it("XIRR: Excel's example, 37.34%", () => {
    // -10,000 on 1/1/2008; 2,750 on 3/1/2008; 4,250 on 10/30/2008; 3,250 on 2/15/2009; 2,750 on 4/1/2009.
    const day = (iso: string) => (Date.parse(iso) - Date.parse("2008-01-01")) / 86_400_000;
    const r = xirr([
      { amount: -10000, day: 0 },
      { amount: 2750, day: day("2008-03-01") },
      { amount: 4250, day: day("2008-10-30") },
      { amount: 3250, day: day("2009-02-15") },
      { amount: 2750, day: day("2009-04-01") },
    ]);
    expect(r! * 100).toBeCloseTo(37.34, 2);
  });
  it("PMT: $500,000 at 6.75% over 30 years is $3,242.99 a month (numpy-financial)", () => {
    expect(pmt(0.0675 / 12, 360, 500_000_00)).toBe(3_242_99);
    expect(pmt(0, 12, 1200_00)).toBe(100_00);
  });
  it("amortization clears the balance to the cent and sums interest + principal to the payments", () => {
    const rows = amortization(500_000_00, 0.0675, 30);
    expect(rows).toHaveLength(360);
    expect(rows[359].balance).toBe(0);
    expect(rows[0].interest).toBe(roundCents(500_000_00 * 0.0675 / 12));
    for (const r of rows) expect(r.payment).toBe(r.interest + r.principal);
  });
  it("annualizes a monthly rate and computes DSCR", () => {
    expect(annualize(0.01) * 100).toBeCloseTo(12.68, 2);
    expect(dscr(125_000_00, 100_000_00)).toBeCloseTo(1.25, 6);
    expect(dscr(1, 0)).toBeNull();
  });
});

describe("money", () => {
  it("rounds half away from zero like Excel", () => {
    expect(roundCents(2.5)).toBe(3);
    expect(roundCents(-2.5)).toBe(-3);
    expect(roundCents(2.4999)).toBe(2);
    expect(pctOf(100_00, 6)).toBe(6_00);
    expect(dollars(1234.567)).toBe(123457);
  });
  it("splits sum exactly to the total", () => {
    expect(splitEvenly(100, 3)).toEqual([33, 33, 34]);
    const parts = splitByWeights(1_000_000_01, [1, 2, 3, 4]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1_000_000_01);
    expect(parts[3]).toBeGreaterThan(parts[0]);
    expect(splitByWeights(10, [0, 0])).toEqual([5, 5]);
  });
});

describe("draws", () => {
  it("normal CDF matches NORM.S.DIST", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normCdf(-1)).toBeCloseTo(0.158655, 5);
  });
  it("S-curve weights sum to one, peak in the middle, and the draws sum to the budget", () => {
    const w = scurveWeights(8);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.max(...w)).toBe(Math.max(w[3], w[4]));
    expect(w[0]).toBeLessThan(w[3]);
    for (const curve of ["scurve", "straight"] as const) {
      const d = drawSchedule(350_000_00, 8, curve);
      expect(d.reduce((a, b) => a + b, 0)).toBe(350_000_00);
    }
    expect(drawSchedule(100_00, 4, "straight")).toEqual([25_00, 25_00, 25_00, 25_00]);
  });
});

describe("Washington REET", () => {
  it("graduated state tax: $1,100,000 pays 1.10% on the first $525,000 and 1.28% on the rest", () => {
    expect(stateReet(1_100_000_00, WA_STATE_REET_2023)).toBe(525_000_00 * 0.011 + 575_000_00 * 0.0128);
    expect(stateReet(500_000_00, WA_STATE_REET_2023)).toBe(5_500_00);
    expect(stateReet(0, WA_STATE_REET_2023)).toBe(0);
  });
  it("adds Seattle's 0.50% local rate", () => {
    const r = reet(1_000_000_00, "2026-10-01", 0.5);
    expect(r.state).toBe(525_000_00 * 0.011 + 475_000_00 * 0.0128);
    expect(r.local).toBe(5_000_00);
    expect(r.total).toBe(r.state + r.local);
  });
  it("picks the schedule by closing date", () => {
    expect(stateScheduleOn("2026-12-31")).toBe(WA_STATE_REET_2023);
    expect(stateScheduleOn("2027-01-01")).toBe(WA_STATE_REET_2027);
  });
});
