/**
 * Time-value functions. Inputs are cents; rates are fractions (0.0675, not 6.75). Results that are money come back
 * as cents; rates come back as fractions. Each matches the Excel function it is named after on Excel's own
 * documented examples (see __tests__/finance.test.ts).
 */
import { roundCents, type Cents } from "./money";

/** Net present value of flows at t = 1..n (Excel NPV: the first flow is discounted one period). */
export function npv(rate: number, flows: readonly number[]): number {
  return flows.reduce((s, f, i) => s + f / Math.pow(1 + rate, i + 1), 0);
}

/** Present value of flows at t = 0..n: the first flow is today. This is what IRR solves to zero. */
export function pv0(rate: number, flows: readonly number[]): number {
  return flows.reduce((s, f, i) => s + f / Math.pow(1 + rate, i), 0);
}

function dpv0(rate: number, flows: readonly number[]): number {
  return flows.reduce((s, f, i) => s - (i * f) / Math.pow(1 + rate, i + 1), 0);
}

/**
 * Periodic internal rate of return (Excel IRR). Newton from `guess`, then bisection on [-0.99, 10] if Newton
 * wanders. Null when the flows never change sign (no rate makes them worth zero) or nothing converges.
 */
export function irr(flows: readonly number[], guess = 0.01): number | null {
  if (!flows.some((f) => f > 0) || !flows.some((f) => f < 0)) return null;
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const f = pv0(r, flows);
    const d = dpv0(r, flows);
    if (Math.abs(f) < 1e-7) return r;
    if (d === 0 || !Number.isFinite(d)) break;
    const next = r - f / d;
    if (!Number.isFinite(next) || next <= -0.999) break;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }
  // Bisection: find a sign change on a coarse grid, then narrow it.
  let lo = -0.99, hi = 10;
  let flo = pv0(lo, flows), fhi = pv0(hi, flows);
  if (Math.sign(flo) === Math.sign(fhi)) {
    const grid = [-0.9, -0.5, -0.2, 0, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    let found = false;
    for (let i = 1; i < grid.length; i++) {
      const a = pv0(grid[i - 1], flows), b = pv0(grid[i], flows);
      if (Math.sign(a) !== Math.sign(b)) { lo = grid[i - 1]; hi = grid[i]; flo = a; fhi = b; found = true; break; }
    }
    if (!found) return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = pv0(mid, flows);
    if (Math.abs(fm) < 1e-7 || hi - lo < 1e-12) return mid;
    if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else { hi = mid; fhi = fm; }
  }
  void fhi;
  return (lo + hi) / 2;
}

/** A monthly rate compounded to a yearly one. */
export const annualize = (monthly: number): number => Math.pow(1 + monthly, 12) - 1;

export interface DatedFlow {
  amount: number;
  /** Days from the first flow (Excel XIRR uses actual days / 365). */
  day: number;
}

/** Excel XIRR: the yearly rate at which dated flows discount to zero, actual/365. Null when no sign change. */
export function xirr(flows: readonly DatedFlow[], guess = 0.1): number | null {
  if (!flows.some((f) => f.amount > 0) || !flows.some((f) => f.amount < 0)) return null;
  const f = (r: number) => flows.reduce((s, x) => s + x.amount / Math.pow(1 + r, x.day / 365), 0);
  const df = (r: number) => flows.reduce((s, x) => s - ((x.day / 365) * x.amount) / Math.pow(1 + r, x.day / 365 + 1), 0);
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const v = f(r), d = df(r);
    if (Math.abs(v) < 1e-6) return r;
    if (d === 0 || !Number.isFinite(d)) break;
    const next = r - v / d;
    if (!Number.isFinite(next) || next <= -0.999) break;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }
  let lo = -0.99, hi = 10, flo = f(lo);
  if (Math.sign(flo) === Math.sign(f(hi))) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (Math.abs(fm) < 1e-6 || hi - lo < 1e-12) return mid;
    if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Level payment per period on `pv` cents (Excel PMT, returned positive). */
export function pmt(ratePerPeriod: number, periods: number, pv: Cents): Cents {
  if (periods <= 0 || pv === 0) return 0;
  if (ratePerPeriod === 0) return roundCents(pv / periods);
  const q = Math.pow(1 + ratePerPeriod, periods);
  return roundCents((pv * ratePerPeriod * q) / (q - 1));
}

export interface AmortRow {
  /** 1-based payment number. */
  period: number;
  payment: Cents;
  interest: Cents;
  principal: Cents;
  balance: Cents;
}

/**
 * Fully amortizing schedule, monthly, in cents. Interest each month is rounded; the last payment clears the
 * balance exactly, so the schedule never ends a cent off.
 */
export function amortization(principal: Cents, annualRate: number, years: number, months = years * 12): AmortRow[] {
  const n = Math.round(years * 12);
  const r = annualRate / 12;
  const payment = pmt(r, n, principal);
  const rows: AmortRow[] = [];
  let balance = principal;
  for (let p = 1; p <= Math.min(n, months) && balance > 0; p++) {
    const interest = roundCents(balance * r);
    let prin = Math.min(balance, payment - interest);
    if (p === n) prin = balance;
    balance -= prin;
    rows.push({ period: p, payment: interest + prin, interest, principal: prin, balance });
  }
  return rows;
}

/** Debt service coverage: NOI over debt service for the same period. Null with no debt. */
export const dscr = (noi: Cents, debtService: Cents): number | null => (debtService <= 0 ? null : noi / debtService);
