import { describe, it, expect } from "vitest";
import { computeFeasibility, type DealInputs } from "../model";
import { baseDealInputs, parcelToDealInputs } from "../defaults";
import { parcels } from "@/lib/parcels";

function inputs(overrides: Partial<DealInputs> = {}): DealInputs {
  const base = baseDealInputs({ purchasePrice: 1_000_000, units: 6, buildType: "stacked_flats" });
  return { ...base, ...overrides };
}

describe("computeFeasibility", () => {
  it("sums the cost breakdown to the total", () => {
    const r = computeFeasibility(inputs());
    const { acquisition, hard, soft, financing, total } = r.costBreakdown;
    expect(acquisition + hard + soft + financing).toBeCloseTo(total, -2);
    expect(r.equityRequired + r.loanAmount).toBeCloseTo(total, -2);
  });

  it("hard cost = new build + rehab + contingency", () => {
    const base = inputs();
    const r = computeFeasibility({
      ...base,
      hard: {
        ...base.hard,
        buildableSqft: 5000,
        costPerSqft: 300,
        rehabSqft: 1000,
        rehabCostPerSqft: 150,
        hardCostOverride: undefined,
        contingencyPct: 10,
      },
    });
    const newBuild = 5000 * 300;
    const rehab = 1000 * 150;
    const expected = (newBuild + rehab) * 1.1;
    expect(r.costBreakdown.hard).toBeCloseTo(expected, -2);
  });

  it("rehab cost raises the hard cost total", () => {
    const base = inputs();
    const noRehab = computeFeasibility({
      ...base,
      hard: { ...base.hard, rehabSqft: 0, hardCostOverride: undefined },
    });
    const withRehab = computeFeasibility({
      ...base,
      hard: { ...base.hard, rehabSqft: 1200, rehabCostPerSqft: 160, hardCostOverride: undefined },
    });
    expect(withRehab.costBreakdown.hard).toBeGreaterThan(noRehab.costBreakdown.hard);
  });

  it("sell_finished: profit = net revenue minus total cost", () => {
    const r = computeFeasibility(inputs());
    expect(r.profit).toBe(r.grossRevenue - r.sellingCosts - r.costBreakdown.total);
    expect(r.grossRevenue).toBeGreaterThan(0);
  });

  it("sell_permit_ready uses the permit-ready sale price", () => {
    const base = inputs();
    const r = computeFeasibility({
      ...base,
      hard: { ...base.hard, hardCostOverride: 0 },
      exit: {
        ...base.exit,
        strategy: "sell_permit_ready",
        salePricePerUnit: 250_000,
        unitSalePrices: Array.from({ length: base.units }, () => 250_000),
      },
    });
    expect(r.grossRevenue).toBe(250_000 * base.units);
    // With no vertical build, margin on cost should be strongly positive.
    expect(r.marginOnCost).toBeGreaterThan(0);
  });

  it("sums per-unit ARV when unitSalePrices is set", () => {
    const base = inputs();
    const prices = [600_000, 575_000, 550_000, 525_000, 500_000, 480_000];
    const r = computeFeasibility({
      ...base,
      exit: { ...base.exit, strategy: "sell_finished", unitSalePrices: prices },
    });
    expect(r.grossRevenue).toBe(prices.reduce((a, b) => a + b, 0));
  });

  it("hold_rent produces a stabilized value and yield on cost", () => {
    const base = inputs();
    const r = computeFeasibility({
      ...base,
      exit: {
        ...base.exit,
        strategy: "hold_rent",
        rentPerUnitMonthly: 2600,
        vacancyPct: 5,
        capRatePct: 5.5,
      },
    });
    expect(r.stabilizedValue).toBeGreaterThan(0);
    expect(r.yieldOnCost).toBeGreaterThan(0);
    expect(r.grossRevenue).toBe(r.stabilizedValue);
  });

  it("sensitivity: +10% hard cost lowers margin, -10% sale price lowers margin", () => {
    const r = computeFeasibility(inputs());
    expect(r.sensitivity.hardCostPlus10).toBeLessThan(r.marginOnCost);
    expect(r.sensitivity.salePriceMinus10).toBeLessThan(r.marginOnCost);
  });

  it("worked example: higher cost per sqft reduces margin on cost", () => {
    const cheap = computeFeasibility(inputs());
    const base = inputs();
    const pricey = computeFeasibility({
      ...base,
      hard: { ...base.hard, costPerSqft: base.hard.costPerSqft + 150 },
    });
    expect(pricey.marginOnCost).toBeLessThan(cheap.marginOnCost);
  });

  it("parcelToDealInputs anchors to authored economics for well-formed deals", () => {
    // Anchorable = authored all-in leaves room above land + floor costs.
    const anchorable = parcels.filter((p) => p.allInCost > p.listPrice * 1.25);
    expect(anchorable.length).toBeGreaterThan(5);
    for (const p of anchorable) {
      const r = computeFeasibility(parcelToDealInputs(p));
      expect(Math.abs(r.costBreakdown.total - p.allInCost) / p.allInCost).toBeLessThan(0.04);
      const netRevenue = r.grossRevenue - r.sellingCosts;
      expect(Math.abs(netRevenue - p.projectedValue) / p.projectedValue).toBeLessThan(0.04);
    }
  });

  it("parcelToDealInputs keeps PENCILS parcels pencilling", () => {
    const strong = parcels.filter(
      (p) => p.verdict === "PENCILS" && p.allInCost > p.listPrice * 1.25
    );
    for (const p of strong) {
      const r = computeFeasibility(parcelToDealInputs(p));
      expect(r.marginOnCost).toBeGreaterThanOrEqual(15);
    }
  });

  it("every parcel yields a finite, valid result", () => {
    for (const p of parcels) {
      const r = computeFeasibility(parcelToDealInputs(p));
      expect(Number.isFinite(r.marginOnCost)).toBe(true);
      expect(Number.isFinite(r.costBreakdown.total)).toBe(true);
      expect(r.costBreakdown.total).toBeGreaterThan(0);
    }
  });
});
