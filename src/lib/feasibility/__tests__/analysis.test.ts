import { describe, it, expect } from "vitest";
import { computeFeasibility, mortgageConstant } from "../model";
import { baseDealInputs } from "../defaults";
import { maxOffer, sensitivityGrid, TARGET_MARGIN_PCT } from "../analysis";

const deal = () => baseDealInputs({ purchasePrice: 900_000, units: 4, buildType: "fourplex" });

describe("timeline and returns", () => {
  it("permit and exit months add carrying cost and lengthen the timeline", () => {
    const a = computeFeasibility(deal());
    const b = computeFeasibility({ ...deal(), financing: { ...deal().financing, permitMonths: 6, exitMonths: 3 } });
    expect(b.timelineMonths).toBe(a.timelineMonths + 9);
    expect(b.costBreakdown.financing).toBeGreaterThan(a.costBreakdown.financing);
  });

  it("annualized return matches the equity multiple over the timeline", () => {
    const r = computeFeasibility(deal());
    if (r.equityMultiple != null && r.annualizedReturn != null) {
      const back = Math.pow(1 + r.annualizedReturn / 100, r.timelineMonths / 12);
      expect(back).toBeCloseTo(r.equityMultiple, 1);
    }
  });

  it("breakeven revenue gives zero profit", () => {
    const d = deal();
    const r = computeFeasibility(d);
    const net = r.breakeven.grossRevenue * (1 - d.exit.sellingCostsPct / 100);
    expect(Math.abs(net - r.costBreakdown.total)).toBeLessThan(5);
  });

  it("per-unit numbers divide by units", () => {
    const r = computeFeasibility(deal());
    expect(r.costPerUnit).toBe(Math.round(r.costBreakdown.total / 4));
  });
});

describe("hold case", () => {
  const h = computeFeasibility(deal()).exits.hold!;
  it("sizes the permanent loan to the tighter of LTV and DSCR", () => {
    expect(h.dscr).toBeGreaterThanOrEqual(1.24);
    expect(h.permLoan).toBeLessThanOrEqual(h.stabilizedValue * 0.7 + 1);
  });
  it("yield on cost spread is yield minus cap rate", () => {
    expect(h.spreadToCapPts).toBeCloseTo(h.yieldOnCost - 5.5, 1);
  });
});

describe("mortgageConstant", () => {
  it("is about 7.78% for 6.75% over 30 years", () => {
    expect(mortgageConstant(6.75, 30)).toBeCloseTo(0.0778, 3);
  });
});

describe("sensitivityGrid", () => {
  it("center cell equals the base margin and margin falls as cost rises", () => {
    const g = sensitivityGrid(deal(), [0, 10], [-10, 0]);
    expect(g.margin[0][1]).toBe(computeFeasibility(deal()).marginOnCost);
    expect(g.margin[1][1]).toBeLessThan(g.margin[0][1]);
    expect(g.margin[0][0]).toBeLessThan(g.margin[0][1]);
  });
});

describe("maxOffer", () => {
  it("returns a price that clears the target margin", () => {
    const d = deal();
    const p = maxOffer(d);
    if (p != null) {
      const m = computeFeasibility({ ...d, acquisition: { ...d.acquisition, purchasePrice: p } }).marginOnCost;
      expect(m).toBeGreaterThanOrEqual(TARGET_MARGIN_PCT - 0.5);
    }
  });
  it("returns null when even a free lot misses the target", () => {
    const d = deal();
    const bad = { ...d, exit: { ...d.exit, salePricePerUnit: 100_000 } };
    expect(maxOffer(bad)).toBeNull();
  });
});
