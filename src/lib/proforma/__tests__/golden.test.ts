import { describe, expect, it } from "vitest";
import { compute, computeCore, defaultInputs, type ProformaInputs } from "../index";
import { GOLDEN_DEALS } from "./golden/deals";
import expected from "./golden/expected.json";

const CENT_TOL = 1; // ±$0.01... the brief says ±$1: cents here, so 100
const CASH_TOL = 100;
const RATE_TOL = 0.0001; // ±0.01%

type Expected = Record<string, Record<string, unknown>>;
const exp = expected as Expected;

const near = (a: number | null, b: number | null, tol: number, what: string) => {
  if (a == null || b == null) expect(a, what).toBe(b);
  else expect(Math.abs(a - b), `${what}: got ${a}, expected ${b}`).toBeLessThanOrEqual(tol);
};

describe("golden deals against the independent reference (docs/proforma-golden/proforma_ref.py)", () => {
  for (const [name, mk] of Object.entries(GOLDEN_DEALS)) {
    it(name, () => {
      const e = exp[name];
      expect(e, `expected.json has ${name}`).toBeDefined();
      const o = computeCore(mk());
      const m = o.metrics;
      const cash: [string, number][] = [
        ["totalProjectCost", m.totalProjectCost], ["totalUses", o.sourcesUses.totalUses],
        ["loanAmount", o.loans.construction?.amount ?? 0], ["loanPoints", o.loans.construction?.points ?? 0], ["loanInterest", o.loans.construction?.totalInterest ?? 0], ["loanPayoff", o.loans.construction?.payoff ?? 0],
        ["permAmount", o.loans.permanent?.amount ?? 0], ["stabilizedNoi", m.stabilizedNoi], ["stabilizedValue", o.stabilizedValue], ["exitValue", m.exitValue], ["exitReet", o.exitReet?.total ?? 0],
        ["netSaleProceeds", m.netSaleProceeds], ["totalEquity", m.totalEquity], ["peakEquity", m.peakEquity], ["totalDistributions", m.totalDistributions],
        ["sumEquityCf", o.monthly.reduce((s, r) => s + r.equityCf, 0)], ["sumProjectCf", o.monthly.reduce((s, r) => s + r.projectCf, 0)], ["profit", m.profit], ["refiCashOut", m.refiCashOut],
      ];
      for (const [k, v] of cash) near(v, e[k] as number, CASH_TOL, k);
      for (const [k, v] of [["unleveredIrr", m.unleveredIrr], ["leveredIrr", m.leveredIrr], ["equityMultiple", m.equityMultiple], ["dscrYear1", m.dscrYear1]] as [string, number | null][]) near(v, e[k] as number | null, k === "equityMultiple" || k === "dscrYear1" ? 0.0001 : RATE_TOL, k);
      for (const k of ["months", "stabilization", "exit"]) expect((o.timeline as unknown as Record<string, number>)[k === "months" ? "months" : k], k).toBe(e[k]);
      if (e.waterfall) {
        const w = e.waterfall as { lp: { contributions: number; distributions: number; irr: number }; gp: { contributions: number; distributions: number; irr: number } };
        expect(o.waterfall).not.toBeNull();
        near(o.waterfall!.lp.contributions, w.lp.contributions, CASH_TOL, "lp contributions");
        near(o.waterfall!.lp.distributions, w.lp.distributions, CASH_TOL, "lp distributions");
        near(o.waterfall!.gp.distributions, w.gp.distributions, CASH_TOL, "gp distributions");
        near(o.waterfall!.lp.irr, w.lp.irr, RATE_TOL, "lp irr");
        near(o.waterfall!.gp.irr, w.gp.irr, RATE_TOL, "gp irr");
      }
    });
  }
});

/** A seeded generator so the property tests are repeatable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
function randomDeal(r: () => number): ProformaInputs {
  const i = defaultInputs();
  i.meta.strategy = (["rent_hold", "sell", "refi_hold"] as const)[Math.floor(r() * 3)];
  i.acquisition.ownership = r() < 0.8 ? "buy" : "owned";
  i.acquisition.purchasePrice = Math.round(400_000 + r() * 900_000) * 100;
  i.acquisition.currentValue = Math.round(500_000 + r() * 800_000) * 100;
  i.acquisition.closingPct = Math.round(r() * 3 * 10) / 10;
  i.acquisition.buyerPaysReet = r() < 0.2;
  i.budget.sqft = 400 + Math.round(r() * 600);
  i.budget.hardPerSf = Math.round(250 + r() * 250) * 100;
  i.budget.siteWork = Math.round(r() * 40_000) * 100;
  i.budget.design = Math.round(r() * 30_000) * 100;
  i.budget.permitsSdci = Math.round(5_000 + r() * 15_000) * 100;
  i.budget.builderFeePct = Math.round(r() * 10);
  i.budget.developerFeePct = Math.round(r() * 5);
  i.budget.hardContPct = Math.round(r() * 15);
  i.budget.softContPct = Math.round(r() * 10);
  i.budget.subdivision = i.meta.strategy === "sell" ? 25_000_00 : 0;
  i.timeline = { designMo: Math.floor(r() * 4), permitMo: Math.floor(r() * 8), buildMo: 4 + Math.floor(r() * 12), leaseUpOrSaleMo: Math.floor(r() * 5), drawCurve: r() < 0.5 ? "scurve" : "straight" };
  i.financing.mode = r() < 0.2 ? "all_cash" : "construction_loan";
  i.financing.construction = { ltcPct: Math.round(40 + r() * 40), ratePct: 6 + Math.round(r() * 8), pointsPct: Math.round(r() * 2 * 4) / 4, interestReserve: r() < 0.6 };
  i.financing.perm = { ltvPct: 55 + Math.round(r() * 25), ratePct: 5 + Math.round(r() * 3 * 4) / 4, amortYears: 25 + Math.floor(r() * 6), minDscr: 1.1 + Math.round(r() * 4) / 10 };
  i.operations.units = [{ label: "DADU", rent: Math.round(2_000 + r() * 2_500) * 100, otherIncome: 0 }, { label: "House", rent: Math.round(2_500 + r() * 3_000) * 100, otherIncome: Math.round(r() * 200) * 100 }];
  i.operations.vacancyPct = Math.round(r() * 10);
  i.operations.propertyTaxAnnual = Math.round(5_000 + r() * 10_000) * 100;
  i.operations.insuranceAnnual = Math.round(1_000 + r() * 3_000) * 100;
  i.operations.repairsPct = Math.round(r() * 8);
  i.operations.mgmtPct = Math.round(r() * 10);
  i.operations.capexReserveAnnual = Math.round(r() * 3_000) * 100;
  i.growthExit = { ...i.growthExit, rentGrowthPct: Math.round(r() * 4), expenseGrowthPct: Math.round(r() * 4), holdYears: 3 + Math.floor(r() * 10), exitCapPct: 4 + Math.round(r() * 3 * 4) / 4, sellingPct: 5 + Math.round(r() * 2), sale: { scope: r() < 0.5 ? "unit" : "whole", unitPrice: Math.round(500_000 + r() * 400_000) * 100, wholePrice: Math.round(1_200_000 + r() * 800_000) * 100, houseValue: Math.round(700_000 + r() * 400_000) * 100 } };
  return i;
}

describe("properties over random deals", () => {
  const r = rng(20261009);
  const deals = Array.from({ length: 60 }, () => randomDeal(r));

  it("Sources always equal Uses, to the cent", () => {
    for (const d of deals) {
      const o = computeCore(d);
      expect(o.sourcesUses.difference).toBe(0);
      expect(o.sourcesUses.totalUses).toBe(o.sourcesUses.totalSources);
      expect(o.sourcesUses.totalUses).toBe(o.metrics.totalProjectCost);
    }
  });

  it("the construction loan is loan-to-cost on total cost, to the cent", () => {
    for (const d of deals) {
      const o = computeCore(d);
      const cl = o.loans.construction;
      if (!cl) continue;
      const ltc = d.financing.construction.ltcPct / 100;
      expect(Math.abs(cl.amount - Math.round(ltc * o.metrics.totalProjectCost))).toBeLessThanOrEqual(2);
      // Draws plus capitalized interest never exceed the commitment, and the balance is what is paid off.
      expect(cl.payoff).toBeLessThanOrEqual(cl.amount + 1);
    }
  });

  it("equity cash flows sum to the levered profit (distributions less contributions)", () => {
    for (const d of deals) {
      const o = computeCore(d);
      const sum = o.monthly.reduce((s, r) => s + r.equityCf, 0);
      expect(sum).toBe(o.metrics.totalDistributions - o.metrics.totalEquity);
    }
  });

  it("changing rent, growth or the exit cap never changes the development budget", () => {
    for (const d of deals) {
      const base = computeCore(d).budget.map((l) => [l.key, l.amount]);
      const moved = { ...d, operations: { ...d.operations, units: d.operations.units.map((u) => ({ ...u, rent: u.rent * 2 })) }, growthExit: { ...d.growthExit, rentGrowthPct: 7, exitCapPct: 9 } };
      expect(computeCore(moved).budget.map((l) => [l.key, l.amount])).toEqual(base);
    }
  });

  it("never produces NaN or Infinity", () => {
    const walk = (v: unknown, path: string) => {
      if (typeof v === "number") expect(Number.isFinite(v), path).toBe(true);
      else if (Array.isArray(v)) v.forEach((x, k) => walk(x, `${path}[${k}]`));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    for (const d of deals.slice(0, 20)) walk(compute(d), "out");
  });

  it("the monthly table runs from closing to the exit, with the exit in the last row", () => {
    for (const d of deals) {
      const o = computeCore(d);
      expect(o.monthly[0].phase).toBe("closing");
      expect(o.monthly[o.monthly.length - 1].phase).toBe("exit");
      expect(o.monthly.length).toBe(o.timeline.exit + 1);
    }
  });
});

describe("performance", () => {
  it("recalculates a 10-year monthly model in under 50 ms (core run, without sensitivity grids)", () => {
    const i = GOLDEN_DEALS.rent_hold_levered();
    computeCore(i); // warm up
    const t0 = performance.now();
    for (let k = 0; k < 20; k++) computeCore(i);
    const per = (performance.now() - t0) / 20;
    expect(per).toBeLessThan(50);
  });
});
