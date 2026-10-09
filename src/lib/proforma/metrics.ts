/**
 * What an investor or lender reads first, all derived from the monthly rows. Rates are fractions; money is cents.
 */
import type { ProformaInputs } from "./schema";
import type { Model, MonthRow } from "./model";
import { dscr, xirr } from "./finance";
import { roundCents, sum, type Cents } from "./money";
import { OPEX_LABELS, type OpexKey } from "./operations";

export interface AnnualRow {
  /** Operating year, 1 = the twelve months from stabilization (lease-up months are in the monthly table). */
  year: number;
  fromMonth: number;
  toMonth: number;
  gpr: Cents;
  vacancy: Cents;
  egi: Cents;
  opexLines: Record<OpexKey, Cents>;
  opex: Cents;
  noi: Cents;
  debtService: Cents;
  cashFlow: Cents;
  dscr: number | null;
  /** Estimated tax (when enabled) and after-tax cash flow. */
  depreciation: Cents | null;
  taxableIncome: Cents | null;
  taxEstimate: Cents | null;
  afterTaxCashFlow: Cents | null;
}

export interface Metrics {
  totalProjectCost: Cents;
  allInPerSf: Cents | null;
  stabilizedNoi: Cents;
  yieldOnCost: number | null;
  exitCap: number | null;
  developmentSpread: number | null;
  unleveredIrr: number | null;
  leveredIrr: number | null;
  equityMultiple: number | null;
  totalEquity: Cents;
  peakEquity: Cents;
  totalDistributions: Cents;
  cashOnCashYear1: number | null;
  cashOnCashAverage: number | null;
  dscrYear1: number | null;
  monthsToStabilization: number;
  breakEvenOccupancy: number | null;
  /** Sell strategy: net sale proceeds (plus the house kept, at its value) less total project cost. */
  profit: Cents;
  profitOnCost: number | null;
  /** Refinance: equity still in the deal after the cash-out (negative means cash returned beyond the equity). */
  cashLeftInDeal: Cents | null;
  refiCashOut: Cents;
  exitValue: Cents;
  netSaleProceeds: Cents;
}

export const OPEX_KEYS = Object.keys(OPEX_LABELS) as OpexKey[];

export function annualRows(i: ProformaInputs, model: Model): AnnualRow[] {
  const { rows, timeline: tl } = model;
  if (i.meta.strategy === "sell") return [];
  const out: AnnualRow[] = [];
  const land = i.acquisition.ownership === "buy" ? i.acquisition.purchasePrice : i.acquisition.currentValue;
  const landValue = roundCents((land * i.tax.landSharePct) / 100);
  const basis = Math.max(0, model.totalProjectCost - landValue);
  const annualDep = i.tax.enabled ? roundCents(basis / i.tax.depreciationYears) : 0;
  let lossCarry = 0;
  for (let y = 1, from = tl.stabilization; from <= tl.exit; y++, from += 12) {
    const to = Math.min(from + 11, tl.exit);
    const ys = rows.slice(from, to + 1);
    const opexLines = Object.fromEntries(OPEX_KEYS.map((k) => [k, sum(ys.map((r) => r.opexLines?.[k] ?? 0))])) as Record<OpexKey, Cents>;
    const noi = sum(ys.map((r) => r.noi));
    const debtService = sum(ys.map((r) => r.permPayment + r.interestPaid));
    const interest = sum(ys.map((r) => r.permInterest + r.loanInterest));
    const months = ys.length;
    const dep = i.tax.enabled ? roundCents((annualDep * months) / 12) : null;
    let taxable: Cents | null = null, tax: Cents | null = null, atcf: Cents | null = null;
    if (i.tax.enabled) {
      taxable = noi - interest - (dep ?? 0);
      const net = taxable - lossCarry;
      if (net < 0) { lossCarry = -net; tax = 0; } else { lossCarry = 0; tax = roundCents((net * i.tax.marginalRatePct) / 100); }
      atcf = noi - debtService - tax;
    }
    out.push({ year: y, fromMonth: from, toMonth: to, gpr: sum(ys.map((r) => r.gpr)), vacancy: sum(ys.map((r) => r.vacancy)), egi: sum(ys.map((r) => r.egi)), opexLines, opex: sum(ys.map((r) => r.opex)), noi, debtService, cashFlow: noi - debtService, dscr: dscr(noi, debtService), depreciation: dep, taxableIncome: taxable, taxEstimate: tax, afterTaxCashFlow: atcf });
  }
  return out;
}

const flowsOf = (rows: MonthRow[], pick: (r: MonthRow) => Cents) => rows.map((r) => ({ amount: pick(r), day: r.day }));

export function metrics(i: ProformaInputs, model: Model, annual: AnnualRow[]): Metrics {
  const { rows, timeline: tl } = model;
  const sqft = i.budget.sqft;
  const equityIn = -sum(rows.map((r) => Math.min(0, r.equityCf)));
  const equityOut = sum(rows.map((r) => Math.max(0, r.equityCf)));
  const peakEquity = -Math.min(0, ...rows.map((r) => r.cumulativeEquityCf));
  const cap = i.growthExit.exitCapPct > 0 ? i.growthExit.exitCapPct / 100 : null;
  const yoc = model.totalProjectCost > 0 && model.stabilizedNoi > 0 ? model.stabilizedNoi / model.totalProjectCost : null;
  const exitRow = rows[tl.exit];
  const netSale = exitRow ? exitRow.salePrice - exitRow.sellingCosts - exitRow.saleReet + exitRow.retainedValue : 0;
  const refiCashOut = sum(rows.map((r) => r.refiCashOut));
  // Stabilized year: the twelve months from stabilization.
  const stab = rows.slice(tl.stabilization, tl.stabilization + 12);
  const stabNoi = sum(stab.map((r) => r.noi)), stabDs = sum(stab.map((r) => r.permPayment)), stabGpr = sum(stab.map((r) => r.gpr)), stabOpex = sum(stab.map((r) => r.opex));
  const holdYears = annual.filter((a) => a.toMonth - a.fromMonth === 11 && a.fromMonth >= tl.stabilization);
  const coc1 = peakEquity > 0 && stab.length === 12 && i.meta.strategy !== "sell" ? (stabNoi - stabDs) / peakEquity : null;
  const cocAvg = peakEquity > 0 && holdYears.length ? sum(holdYears.map((a) => a.cashFlow)) / holdYears.length / peakEquity : null;
  return {
    totalProjectCost: model.totalProjectCost,
    allInPerSf: sqft > 0 ? roundCents(model.totalProjectCost / sqft) : null,
    stabilizedNoi: model.stabilizedNoi,
    yieldOnCost: yoc,
    exitCap: cap,
    developmentSpread: yoc != null && cap != null ? yoc - cap : null,
    unleveredIrr: xirr(flowsOf(rows, (r) => r.projectCf)),
    leveredIrr: xirr(flowsOf(rows, (r) => r.equityCf)),
    equityMultiple: equityIn > 0 ? equityOut / equityIn : null,
    totalEquity: equityIn,
    peakEquity,
    totalDistributions: equityOut,
    cashOnCashYear1: coc1,
    cashOnCashAverage: cocAvg,
    dscrYear1: i.meta.strategy === "sell" ? null : dscr(stabNoi, stabDs),
    monthsToStabilization: tl.stabilization,
    breakEvenOccupancy: stabGpr > 0 && i.meta.strategy !== "sell" ? (stabOpex + stabDs) / stabGpr : null,
    profit: netSale - model.totalProjectCost + (i.meta.strategy === "sell" ? 0 : sum(rows.map((r) => r.noi))),
    profitOnCost: i.meta.strategy === "sell" && model.totalProjectCost > 0 ? (netSale - model.totalProjectCost) / model.totalProjectCost : null,
    cashLeftInDeal: i.meta.strategy === "refi_hold" ? peakEquity - refiCashOut : null,
    refiCashOut,
    exitValue: model.exitValue,
    netSaleProceeds: netSale,
  };
}
