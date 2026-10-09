/**
 * Debt. The construction loan funds costs after equity is spent (equity first, the lender's usual order), accrues
 * interest on the drawn balance each month, and either capitalizes that interest (interest reserve: the loan
 * funds its own interest) or has equity pay it monthly. Its size is loan-to-cost times total development cost,
 * and total cost includes the points and the reserve, so the amount is solved by fixed-point iteration.
 *
 * The permanent loan is the smaller of loan-to-value on the stabilized value and the amount the NOI can service
 * at the minimum DSCR, amortized monthly.
 */
import { amortization, pmt, type AmortRow } from "./finance";
import { pctOf, roundCents, sum, type Cents } from "./money";

export interface ConstructionLoanInput {
  /** Spend in each month, month 0 first: what must be funded, before interest and points. */
  spend: Cents[];
  ltcPct: number;
  ratePct: number;
  pointsPct: number;
  interestReserve: boolean;
  /** Equity in kind (an owned property) counts toward cost but is never drawn. */
  ownerProperty: Cents;
}

export interface ConstructionLoanMonth {
  month: number;
  draw: Cents;
  interest: Cents;
  /** Interest the loan itself funded (reserve on). */
  capitalized: Cents;
  /** Interest paid in cash by equity this month (reserve off). */
  paidByEquity: Cents;
  balance: Cents;
  /** Cash equity put in this month (spend not covered by the loan, plus any interest paid). */
  equityIn: Cents;
}

export interface ConstructionLoan {
  amount: Cents;
  points: Cents;
  totalInterest: Cents;
  reserve: Cents;
  months: ConstructionLoanMonth[];
  /** Balance owed at the end of the schedule (drawn principal plus capitalized interest). */
  payoff: Cents;
  totalEquity: Cents;
}

/**
 * One pass of the schedule. `commitment` is the whole loan (it funds costs, the points are paid from equity at
 * closing, and with the reserve on it funds its own interest); `costPrincipal` is the part left for costs.
 */
function schedule(commitment: Cents, costPrincipal: Cents, inp: ConstructionLoanInput): ConstructionLoan {
  const r = inp.ratePct / 100 / 12;
  const points = pctOf(commitment, inp.pointsPct);
  const months: ConstructionLoanMonth[] = [];
  // Equity funds the first dollars: everything up to (cost to fund) - the loan's cost principal. Owner property is
  // counted as spent but never funded in cash.
  const cashCost = sum(inp.spend) + points - inp.ownerProperty;
  let equityLeft = Math.max(0, cashCost - costPrincipal);
  let balance = 0;
  let totalInterest = 0, reserve = 0;
  for (let m = 0; m < inp.spend.length; m++) {
    let need = inp.spend[m] + (m === 0 ? points : 0) - (m === 0 ? inp.ownerProperty : 0);
    const interest = roundCents(balance * r);
    let capitalized = 0, paidByEquity = 0;
    if (interest > 0) {
      if (inp.interestReserve) capitalized = interest;
      else paidByEquity = interest;
    }
    let equityIn = paidByEquity;
    const fromEquity = Math.min(Math.max(0, need), equityLeft);
    equityLeft -= fromEquity;
    equityIn += fromEquity;
    need -= fromEquity;
    const draw = Math.max(0, need) + capitalized;
    balance += draw;
    totalInterest += interest;
    reserve += capitalized;
    months.push({ month: m, draw, interest, capitalized, paidByEquity, balance, equityIn });
  }
  return { amount: commitment, points, totalInterest, reserve, months, payoff: balance, totalEquity: sum(months.map((x) => x.equityIn)) };
}

/**
 * Size and schedule the construction loan. The commitment equals ltc x total development cost, where total cost
 * includes the points and all construction interest (capitalized or paid in cash), and those depend on the
 * commitment, so iterate until it is stable (a contraction: a few rounds). With the reserve on, the commitment
 * funds costs and its own interest: cost principal = commitment - reserve.
 */
export function constructionLoan(inp: ConstructionLoanInput): ConstructionLoan {
  if (inp.ltcPct <= 0) return schedule(0, 0, inp);
  const ltc = inp.ltcPct / 100, pts = inp.pointsPct / 100;
  const spend = sum(inp.spend);
  let commitment = roundCents((ltc * spend) / (1 - ltc * pts));
  let costPrincipal = commitment;
  let s = schedule(commitment, costPrincipal, inp);
  for (let k = 0; k < 60; k++) {
    // commitment = ltc x (spend + points + reserve) with points = pts x commitment.
    const next = roundCents((ltc * (spend + s.totalInterest)) / (1 - ltc * pts));
    const nextPrincipal = next - (inp.interestReserve ? s.reserve : 0);
    const stable = Math.abs(next - commitment) <= 1;
    commitment = next;
    costPrincipal = Math.max(0, nextPrincipal);
    s = schedule(commitment, costPrincipal, inp);
    if (stable) break;
  }
  return s;
}

export interface PermLoanInput {
  stabilizedNoi: Cents;
  /** Value the lender lends against (stabilized NOI / cap rate), cents. */
  value: Cents;
  ltvPct: number;
  ratePct: number;
  amortYears: number;
  minDscr: number;
  /** Cap: never more than this (a refinance that only takes out the construction loan). Null: no cap. */
  maxAmount: Cents | null;
}

export interface PermLoan {
  amount: Cents;
  byLtv: Cents;
  byDscr: Cents;
  /** Which test set the amount. */
  constraint: "ltv" | "dscr" | "cap" | "none";
  monthlyPayment: Cents;
  annualDebtService: Cents;
  schedule: AmortRow[];
}

export function permLoan(inp: PermLoanInput): PermLoan {
  const byLtv = pctOf(inp.value, inp.ltvPct);
  const r = inp.ratePct / 100 / 12, n = inp.amortYears * 12;
  // The loan whose annual payment is NOI / DSCR: pv of that payment at the loan terms.
  const maxAnnualDs = inp.minDscr > 0 ? inp.stabilizedNoi / inp.minDscr : 0;
  const monthlyDs = maxAnnualDs / 12;
  const byDscr = r === 0 ? roundCents(monthlyDs * n) : roundCents((monthlyDs * (1 - Math.pow(1 + r, -n))) / r);
  let amount = Math.max(0, Math.min(byLtv, byDscr));
  let constraint: PermLoan["constraint"] = byLtv <= byDscr ? "ltv" : "dscr";
  if (inp.maxAmount != null && amount > inp.maxAmount) { amount = inp.maxAmount; constraint = "cap"; }
  if (amount <= 0) constraint = "none";
  const monthlyPayment = pmt(r, n, amount);
  return { amount, byLtv, byDscr, constraint, monthlyPayment, annualDebtService: monthlyPayment * 12, schedule: amortization(amount, inp.ratePct / 100, inp.amortYears) };
}
