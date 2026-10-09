/**
 * The monthly model: every dollar in and out, month by month, for one strategy. Everything else (metrics, annual
 * tables, sensitivity, exports) reads these rows.
 *
 * Spend timing: acquisition at month 0; design evenly over the design months; engineering, survey and legal
 * evenly over design + permit; SDCI permits in the first permit month; hard costs by the draw curve over the
 * build; builder fee, developer fee and hard contingency pro rata with the hard draws; soft contingency pro rata
 * with soft spend; subdivision at CO; carry (property tax and insurance on the existing property) every month
 * from 1 to CO (hold) or to the sale (sell).
 *
 * Financing: the construction loan (loans.ts) funds spend after equity, accrues interest monthly, and is paid off
 * at the sale (sell) or by the permanent loan at stabilization (hold strategies). The permanent loan is sized on
 * stabilized NOI at the exit cap rate: capped at the construction payoff for "rent_hold", free to cash out for
 * "refi_hold". The exit value for a hold is the next twelve months' NOI at the exit cap rate.
 */
import type { ProformaInputs } from "./schema";
import { coreBudget, sourcesUses, withShares, type BudgetLine, type SourcesUses } from "./budget";
import { drawSchedule } from "./draws";
import { constructionLoan, permLoan, type ConstructionLoan, type PermLoan } from "./loans";
import { pctOf, roundCents, splitByWeights, splitEvenly, sum, type Cents } from "./money";
import { devCarryMonthly, forwardNoi, opsMonth, stabilizedNoi, type OpexKey } from "./operations";
import { reet, type ReetBreakdown } from "./reet";
import { addMonths, daysBetween, phaseOf, timeline, type Phase, type Timeline } from "./timeline";

export interface MonthRow {
  month: number;
  date: string;
  day: number;
  phase: Phase;
  /** Development spend this month (budget lines, carry), before financing. */
  spend: Cents;
  carry: Cents;
  loanPoints: Cents;
  loanDraw: Cents;
  loanInterest: Cents;
  interestCapitalized: Cents;
  interestPaid: Cents;
  loanBalance: Cents;
  permFunding: Cents;
  permPayment: Cents;
  permInterest: Cents;
  permPrincipal: Cents;
  permBalance: Cents;
  gpr: Cents;
  vacancy: Cents;
  egi: Cents;
  opex: Cents;
  opexLines: Record<OpexKey, Cents> | null;
  noi: Cents;
  salePrice: Cents;
  sellingCosts: Cents;
  saleReet: Cents;
  loanPayoff: Cents;
  /** Unit sale: the house kept, at its value, as a terminal value (no cash changes hands). */
  retainedValue: Cents;
  refiCashOut: Cents;
  /** Equity that had to cover a permanent loan smaller than the construction payoff. */
  refiShortfall: Cents;
  /** Unlevered: the project's own cash flow, as if all cash. */
  projectCf: Cents;
  /** Levered: what the owner puts in and takes out. */
  equityCf: Cents;
  cumulativeEquityCf: Cents;
}

export interface Model {
  timeline: Timeline;
  rows: MonthRow[];
  budgetLines: BudgetLine[];
  sourcesUses: SourcesUses;
  constructionLoan: ConstructionLoan | null;
  permLoan: PermLoan | null;
  stabilizedNoi: Cents;
  stabilizedValue: Cents;
  exitValue: Cents;
  exitReet: ReetBreakdown | null;
  totalProjectCost: Cents;
}

/** Spend by month for one budget amount, given the months it falls in (inclusive bounds) and optional weights. */
function spread(total: Cents, months: number, from: number, to: number, weights?: number[]): Cents[] {
  const out = Array<Cents>(months).fill(0);
  if (total === 0) return out;
  const span = Math.max(1, to - from + 1);
  const parts = weights ? splitByWeights(total, weights) : splitEvenly(total, span);
  for (let k = 0; k < parts.length; k++) out[Math.min(months - 1, from + k)] += parts[k];
  return out;
}

export function buildModel(i: ProformaInputs): Model {
  const tl = timeline(i);
  const n = tl.months;
  const strategy = i.meta.strategy;
  const core = coreBudget(i);
  const t = i.timeline;

  // ---- spend by month, before financing -------------------------------------------------------------------
  const byKey = (k: string) => core.lines.find((l) => l.key === k)?.amount ?? 0;
  const spendLines: Cents[][] = [];
  const at0 = (amount: Cents) => spread(amount, n, 0, 0);
  for (const k of ["land", "closing", "reet_buy", "dd"]) spendLines.push(at0(byKey(k)));
  const designMonths = t.designMo > 0 ? [tl.designStart, tl.permitStart - 1] : [0, 0];
  const dpMonths = t.designMo + t.permitMo > 0 ? [tl.designStart, tl.buildStart - 1] : [0, 0];
  spendLines.push(spread(byKey("design"), n, designMonths[0], designMonths[1]));
  for (const k of ["engineering", "survey", "legal"]) spendLines.push(spread(byKey(k), n, dpMonths[0], dpMonths[1]));
  spendLines.push(spread(byKey("permits"), n, t.permitMo > 0 ? tl.permitStart : 0, t.permitMo > 0 ? tl.permitStart : 0));
  const hardDraws = drawSchedule(core.hardBase, t.buildMo, t.drawCurve);
  const hardByMonth = spread(core.hardBase, n, tl.buildStart, tl.co, hardDraws);
  spendLines.push(hardByMonth);
  const hardWeights = hardDraws.map((d) => Math.max(d, 0));
  for (const k of ["builder_fee", "dev_fee", "hard_cont"]) spendLines.push(spread(byKey(k), n, tl.buildStart, tl.co, hardWeights));
  const softBase = ["design", "engineering", "survey", "legal", "permits"].reduce((acc, k) => acc.map((v, m) => v + spendLines[["land", "closing", "reet_buy", "dd", "design", "engineering", "survey", "legal", "permits"].indexOf(k)][m]), Array<Cents>(n).fill(0));
  const softWeights = softBase.slice(0, tl.co + 1);
  spendLines.push(spread(byKey("soft_cont"), n, 0, tl.co, softWeights.some((w) => w > 0) ? softWeights : undefined));
  spendLines.push(spread(byKey("subdivision"), n, tl.co, tl.co));
  const carryMonthly = devCarryMonthly(i);
  const carryEnd = strategy === "sell" ? tl.exit : tl.co;
  const carry = Array.from({ length: n }, (_, m) => (m >= 1 && m <= carryEnd ? carryMonthly : 0));
  const spend = Array.from({ length: n }, (_, m) => sum(spendLines.map((l) => l[m])));
  const carryTotal = sum(carry);

  // ---- construction loan --------------------------------------------------------------------------------------
  const ownerProperty = i.acquisition.ownership === "owned" ? i.acquisition.currentValue : 0;
  const payoffMonth = strategy === "sell" ? tl.exit : tl.stabilization;
  const loanSpend = Array.from({ length: payoffMonth + 1 }, (_, m) => spend[m] + carry[m]);
  const f = i.financing;
  const cl = f.mode === "construction_loan" && f.construction.ltcPct > 0
    ? constructionLoan({ spend: loanSpend, ltcPct: f.construction.ltcPct, ratePct: f.construction.ratePct, pointsPct: f.construction.pointsPct, interestReserve: f.construction.interestReserve, ownerProperty })
    : null;

  // ---- operations, perm loan, exit ---------------------------------------------------------------------------
  const sNoi = strategy === "sell" ? 0 : stabilizedNoi(i);
  const cap = i.growthExit.exitCapPct / 100;
  const stabilizedValue = cap > 0 ? roundCents(sNoi / cap) : 0;
  let pl: PermLoan | null = null;
  if (strategy !== "sell" && (strategy === "refi_hold" || cl)) {
    const payoff = cl?.payoff ?? 0;
    pl = permLoan({ stabilizedNoi: sNoi, value: stabilizedValue, ltvPct: f.perm.ltvPct, ratePct: f.perm.ratePct, amortYears: f.perm.amortYears, minDscr: f.perm.minDscr, maxAmount: strategy === "rent_hold" ? payoff : null });
    if (pl.amount <= 0) pl = null;
  }
  let exitValue = 0;
  if (strategy === "sell") exitValue = i.growthExit.sale.scope === "unit" ? i.growthExit.sale.unitPrice : i.growthExit.sale.wholePrice;
  else if (cap > 0) exitValue = roundCents(forwardNoi(i, tl.exit - tl.co, t.leaseUpOrSaleMo) / cap);
  const exitDate = addMonths(i.meta.closingDate, tl.exit);
  const exitReet = exitValue > 0 ? reet(exitValue, exitDate, i.acquisition.reetLocalPct) : null;

  // ---- rows ------------------------------------------------------------------------------------------------
  const rows: MonthRow[] = [];
  let cum = 0;
  let permBalance = 0;
  let permIdx = 0;
  for (let m = 0; m < n; m++) {
    const date = addMonths(i.meta.closingDate, m);
    const row: MonthRow = {
      month: m, date, day: daysBetween(i.meta.closingDate, date), phase: phaseOf(tl, m, strategy),
      spend: spend[m], carry: carry[m], loanPoints: 0, loanDraw: 0, loanInterest: 0, interestCapitalized: 0, interestPaid: 0, loanBalance: 0,
      permFunding: 0, permPayment: 0, permInterest: 0, permPrincipal: 0, permBalance: 0,
      gpr: 0, vacancy: 0, egi: 0, opex: 0, opexLines: null, noi: 0,
      salePrice: 0, sellingCosts: 0, saleReet: 0, loanPayoff: 0, retainedValue: 0, refiCashOut: 0, refiShortfall: 0,
      projectCf: 0, equityCf: 0, cumulativeEquityCf: 0,
    };
    // Construction loan month (through payoff month). An owned property is equity contributed in kind at month 0:
    // the loan never draws for it, but the returns are measured on it (total capital, not cash alone).
    let equityForDev = spend[m] + carry[m];
    if (cl && m <= payoffMonth) {
      const lm = cl.months[m];
      row.loanPoints = m === 0 ? cl.points : 0;
      row.loanDraw = lm.draw;
      row.loanInterest = lm.interest;
      row.interestCapitalized = lm.capitalized;
      row.interestPaid = lm.paidByEquity;
      row.loanBalance = lm.balance;
      equityForDev = lm.equityIn + (m === 0 ? ownerProperty : 0);
    }
    // Operations.
    if (strategy !== "sell" && m >= tl.opsStart) {
      const o = opsMonth(i, m - tl.co, t.leaseUpOrSaleMo);
      row.gpr = o.gpr; row.vacancy = o.vacancy; row.egi = o.egi; row.opex = o.opex; row.opexLines = o.opexLines; row.noi = o.noi;
    }
    // Permanent loan: funded at stabilization, paid from the next month.
    let permCash = 0;
    if (pl && m === tl.stabilization) {
      row.permFunding = pl.amount;
      permBalance = pl.amount;
      const payoff = cl?.payoff ?? 0;
      row.loanPayoff = payoff;
      if (pl.amount >= payoff) row.refiCashOut = pl.amount - payoff;
      else row.refiShortfall = payoff - pl.amount;
      permCash = row.refiCashOut - row.refiShortfall;
    } else if (pl && m > tl.stabilization && permIdx < pl.schedule.length) {
      const a = pl.schedule[permIdx++];
      row.permPayment = a.payment; row.permInterest = a.interest; row.permPrincipal = a.principal;
      permBalance = a.balance;
      permCash = -a.payment;
    }
    row.permBalance = permBalance;
    // Exit.
    let saleNet = 0, salePayoff = 0;
    if (m === tl.exit && exitValue > 0) {
      row.salePrice = exitValue;
      row.sellingCosts = pctOf(exitValue, i.growthExit.sellingPct);
      row.saleReet = exitReet?.total ?? 0;
      saleNet = exitValue - row.sellingCosts - row.saleReet;
      if (strategy === "sell" && cl) { salePayoff = cl.payoff; row.loanPayoff = cl.payoff; }
      if (pl) { salePayoff = permBalance; row.loanPayoff += permBalance; permBalance = 0; row.permBalance = 0; }
      if (strategy === "sell" && i.growthExit.sale.scope === "unit") row.retainedValue = i.growthExit.sale.houseValue;
    }
    row.projectCf = -(spend[m] + carry[m]) + row.noi + saleNet + row.retainedValue;
    row.equityCf = -equityForDev - row.loanPoints + row.noi + permCash + saleNet - salePayoff + row.retainedValue;
    cum += row.equityCf;
    row.cumulativeEquityCf = cum;
    rows.push(row);
  }

  // ---- budget with financing and carry ----------------------------------------------------------------------
  const lines: BudgetLine[] = [...core.lines];
  if (cl) {
    if (cl.points > 0) lines.push({ key: "points", label: "Loan origination", group: "financing", amount: cl.points, pctOfTotal: 0, perSf: null, basis: `${f.construction.pointsPct}% of the loan` });
    lines.push({ key: "interest", label: f.construction.interestReserve ? "Construction interest (reserve)" : "Construction interest (paid monthly)", group: "financing", amount: cl.totalInterest, pctOfTotal: 0, perSf: null, basis: `${f.construction.ratePct}% on the drawn balance` });
  }
  if (carryTotal > 0) lines.push({ key: "carry", label: "Taxes and insurance during development", group: "carry", amount: carryTotal, pctOfTotal: 0, perSf: null, basis: `${carryEnd} months` });
  const budgetLines = withShares(lines, i.budget.sqft);
  const totalProjectCost = sum(budgetLines.map((l) => l.amount));
  const su = sourcesUses(budgetLines, cl?.amount ?? 0, ownerProperty);

  return { timeline: tl, rows, budgetLines, sourcesUses: su, constructionLoan: cl, permLoan: pl, stabilizedNoi: sNoi, stabilizedValue, exitValue, exitReet, totalProjectCost };
}
