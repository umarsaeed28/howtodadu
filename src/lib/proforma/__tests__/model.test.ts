import { describe, expect, it } from "vitest";
import { applyScenario, compute, computeCore, defaultInputs, requiredMissing, SCENARIO_PRESETS } from "../index";
import { constructionLoan, permLoan } from "../loans";
import { waterfall } from "../waterfall";
import { fromCalculator, toCalculator } from "../from-calculator";
import { DEFAULT_FORM } from "@/lib/calculator/inputs";
import { GOLDEN_DEALS } from "./golden/deals";

describe("construction loan", () => {
  const spend = [786_625_00, 17_000_00, 17_000_00, 17_000_00, 17_000_00, 50_000_00, 50_000_00, 50_000_00, 50_000_00, 50_000_00, 50_000_00, 50_000_00, 50_000_00, 0, 0, 0];
  it("is exactly loan-to-cost on cost including its own points and reserve; equity goes in first", () => {
    const cl = constructionLoan({ spend, ltcPct: 65, ratePct: 10, pointsPct: 1, interestReserve: true, ownerProperty: 0 });
    const total = spend.reduce((a, b) => a + b, 0) + cl.points + cl.reserve;
    expect(Math.abs(cl.amount - Math.round(total * 0.65))).toBeLessThanOrEqual(1);
    expect(cl.points).toBe(Math.round(cl.amount * 0.01));
    expect(cl.months[0].equityIn).toBeGreaterThan(0);
    expect(cl.months.reduce((s, m) => s + m.draw, 0)).toBe(cl.payoff);
    expect(cl.payoff).toBeLessThanOrEqual(cl.amount);
    expect(cl.reserve).toBe(cl.totalInterest);
  });
  it("with the reserve off, interest is paid by equity each month and nothing is capitalized", () => {
    const cl = constructionLoan({ spend, ltcPct: 65, ratePct: 10, pointsPct: 1, interestReserve: false, ownerProperty: 0 });
    expect(cl.reserve).toBe(0);
    expect(cl.months.reduce((s, m) => s + m.paidByEquity, 0)).toBe(cl.totalInterest);
    expect(cl.totalEquity).toBeGreaterThan(cl.totalInterest);
  });
  it("no loan-to-cost means no loan and all equity", () => {
    const cl = constructionLoan({ spend, ltcPct: 0, ratePct: 10, pointsPct: 1, interestReserve: true, ownerProperty: 0 });
    expect(cl.amount).toBe(0);
    expect(cl.totalEquity).toBe(spend.reduce((a, b) => a + b, 0));
  });
});

describe("permanent loan", () => {
  it("takes the smaller of LTV and DSCR sizing, and a cap when given", () => {
    const base = { stabilizedNoi: 58_810_00, value: 1_069_273_00, ltvPct: 70, ratePct: 6.75, amortYears: 30, minDscr: 1.25, maxAmount: null };
    const pl = permLoan(base);
    expect(pl.constraint).toBe("dscr");
    expect(pl.amount).toBe(pl.byDscr);
    expect(pl.annualDebtService).toBeLessThanOrEqual(Math.round(58_810_00 / 1.25) + 12);
    const capped = permLoan({ ...base, maxAmount: 500_000_00 });
    expect(capped.constraint).toBe("cap");
    expect(capped.amount).toBe(500_000_00);
    const loose = permLoan({ ...base, minDscr: 0.9 });
    expect(loose.constraint).toBe("ltv");
    expect(loose.amount).toBe(Math.round(1_069_273_00 * 0.7));
  });
});

describe("strategies", () => {
  it("rent_hold refinances only up to the construction payoff; refi_hold cashes out", () => {
    const hold = computeCore(GOLDEN_DEALS.rent_hold_levered());
    expect(hold.metrics.refiCashOut).toBe(0);
    const refi = computeCore(GOLDEN_DEALS.refi_hold());
    expect(refi.metrics.refiCashOut).toBeGreaterThan(0);
    expect(refi.metrics.cashLeftInDeal).toBe(refi.metrics.peakEquity - refi.metrics.refiCashOut);
    expect(hold.metrics.cashLeftInDeal).toBeNull();
  });
  it("an owned property is equity in kind: in Sources, not drawn by the loan, and in the returns", () => {
    const o = computeCore(GOLDEN_DEALS.refi_hold());
    expect(o.sourcesUses.sources.find((s) => s.label.startsWith("Owner equity"))?.amount).toBe(900_000_00);
    expect(o.monthly[0].equityCf).toBeLessThanOrEqual(-900_000_00);
    expect(o.metrics.equityMultiple!).toBeLessThan(3);
  });
  it("build to sell: the unit sells, the house is kept at its value, REET is charged to the seller at the sale", () => {
    const o = computeCore(GOLDEN_DEALS.build_to_sell());
    const exit = o.monthly[o.timeline.exit];
    expect(exit.salePrice).toBe(720_000_00);
    expect(exit.retainedValue).toBe(850_000_00);
    expect(exit.saleReet).toBe(o.exitReet!.total);
    expect(exit.sellingCosts).toBe(Math.round(720_000_00 * 0.06));
    expect(o.annual).toEqual([]);
    expect(o.metrics.profitOnCost).not.toBeNull();
    expect(compute(GOLDEN_DEALS.build_to_sell()).sensitivity[0].key).toBe("profit_price_cost");
  });
  it("the buyer-pays-REET option adds state plus Seattle local REET to the acquisition", () => {
    const i = GOLDEN_DEALS.rent_hold_all_cash();
    i.acquisition.buyerPaysReet = true;
    const o = computeCore(i);
    const line = o.budget.find((l) => l.key === "reet_buy")!;
    expect(line.amount).toBe(Math.round(525_000_00 * 0.011) + Math.round(250_000_00 * 0.0128) + Math.round(775_000_00 * 0.005));
  });
});

describe("waterfall", () => {
  it("splits contributions pro rata and pays the pref before any promote; all distributions are accounted for", () => {
    const o = computeCore(GOLDEN_DEALS.lp_gp_waterfall());
    const w = o.waterfall!;
    expect(w.lp.contributions + w.gp.contributions).toBe(o.metrics.totalEquity);
    expect(w.lp.distributions + w.gp.distributions).toBe(o.metrics.totalDistributions);
    expect(Math.abs(w.lp.contributions / o.metrics.totalEquity - 0.9)).toBeLessThan(0.001);
    // The deal's levered IRR is 4.2%, under the 8% pref, so everything is tier 0 and the GP gets only its pro rata.
    expect(w.byTier[0].lp + w.byTier[0].gp).toBe(o.metrics.totalDistributions);
    expect(Math.abs(w.gp.distributions / o.metrics.totalDistributions - 0.1)).toBeLessThan(0.001);
  });
  it("a deal clearing the hurdles pays the GP its promote", () => {
    const flows = [-1_000_000_00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2_000_000_00];
    const days = flows.map((_, k) => Math.round((k * 365) / 12));
    const w = waterfall({ flows, days, lpPct: 90, prefPct: 8, tiers: [{ hurdleIrrPct: 15, lpSharePct: 80 }] });
    expect(w.lp.irr! * 100).toBeGreaterThan(15);
    expect(w.gp.distributions / 2_000_000_00).toBeGreaterThan(0.1);
    expect(w.lp.distributions + w.gp.distributions).toBe(2_000_000_00);
    expect(w.byTier.map((t) => t.lp + t.gp).reduce((a, b) => a + b, 0)).toBe(2_000_000_00);
  });
});

describe("scenarios and required inputs", () => {
  it("applies the downside and upside presets as deltas", () => {
    const i = GOLDEN_DEALS.rent_hold_levered();
    const down = applyScenario(i, SCENARIO_PRESETS.downside);
    expect(down.budget.hardPerSf).toBe(Math.round(i.budget.hardPerSf * 1.1));
    expect(down.growthExit.exitCapPct).toBe(6);
    expect(down.timeline.permitMo).toBe(i.timeline.permitMo + 2);
    i.meta.scenario = "downside";
    expect(compute(i).metrics.leveredIrr!).toBeLessThan(computeCore(GOLDEN_DEALS.rent_hold_levered()).metrics.leveredIrr!);
  });
  it("lists the market inputs still missing, by strategy", () => {
    const i = defaultInputs();
    expect(requiredMissing(i).map((m) => m.path)).toEqual(["acquisition.purchasePrice", "budget.sqft", "operations.propertyTaxAnnual", "budget.permitsSdci", "operations.units.0.rent", "growthExit.exitCapPct"]);
    i.meta.strategy = "sell";
    expect(requiredMissing(i).map((m) => m.path)).toContain("growthExit.sale.houseValue");
    expect(requiredMissing(GOLDEN_DEALS.rent_hold_levered())).toEqual([]);
    expect(computeCore(i).flags[0].key).toBe("incomplete");
  });
});

describe("calculator carry-over", () => {
  it("maps the calculator form onto proforma inputs and back", () => {
    const form = { ...DEFAULT_FORM, price: "775,000", closingPct: "1.5", houseSqft: "1500", rehabLevel: "light" as const, sf: "1000", costPerSf: "350", softFlat: "50000", permits: "12000", contingencyPct: "8", permitMonths: "4", buildMonths: "8", exitMonths: "2", ltcPct: "65", ratePct: "10", taxMonthly: "750", insuranceMonthly: "200", rent: "4800", capPct: "5.5", vacancyPct: "5", opexPct: "30" };
    const i = fromCalculator(form, "5519 12th Ave NE");
    expect(i.meta.strategy).toBe("rent_hold");
    expect(i.acquisition.purchasePrice).toBe(775_000_00);
    expect(i.budget.sqft).toBe(1000);
    expect(i.budget.hardPerSf).toBe(350_00);
    expect(i.budget.siteWork).toBe(1500 * 70 * 100);
    expect(i.budget.design).toBe(50_000_00);
    expect(i.financing.construction.ltcPct).toBe(65);
    expect(i.operations.propertyTaxAnnual).toBe(9_000_00);
    expect(i.operations.units[0].rent).toBe(4_800_00);
    expect(i.growthExit.exitCapPct).toBe(5.5);
    expect(requiredMissing(i)).toEqual([]);
    const back = toCalculator(i);
    expect(back.price).toBe("775000");
    expect(back.sf).toBe("1000");
    expect(back.rent).toBe("4800");
    expect(back.ltcPct).toBe("65");
    expect(back.taxMonthly).toBe("750");
  });
  it("typed exit values make it a sale of the whole property, house plus units; no price means an owned house", () => {
    const i = fromCalculator({ ...DEFAULT_FORM, sf: "800", houseArv: "900000", daduArv: "500,000", aaduSf: "400", aaduArv: "300000" });
    expect(i.meta.strategy).toBe("sell");
    expect(i.acquisition.ownership).toBe("owned");
    expect(i.acquisition.currentValue).toBe(900_000_00);
    expect(i.budget.sqft).toBe(1200);
    expect(i.growthExit.sale).toMatchObject({ scope: "whole", wholePrice: 1_700_000_00 });
  });
});
