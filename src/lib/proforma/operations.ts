/**
 * Operations: the rent roll and operating costs month by month, from the certificate of occupancy on.
 *
 *   gross potential rent = sum of unit rents + other income, grown each anniversary by rentGrowthPct
 *   vacancy              = vacancyPct x GPR
 *   EGI                  = GPR - vacancy, scaled during lease-up (month k of L earns k/L of it)
 *   opex                 = property tax, insurance, utilities, capex reserve, HOA (annual / 12, grown by expenseGrowthPct)
 *                          + repairsPct x EGI + mgmtPct x EGI
 *   NOI                  = EGI - opex
 */
import type { ProformaInputs } from "./schema";
import { pctOf, roundCents, sum, type Cents } from "./money";

export interface OpsMonth {
  /** Months since the certificate of occupancy, starting at 1. */
  opMonth: number;
  gpr: Cents;
  vacancy: Cents;
  egi: Cents;
  opex: Cents;
  /** Opex by line, for the annual table. */
  opexLines: Record<OpexKey, Cents>;
  noi: Cents;
  /** Lease-up share of full income this month, 0 to 1. */
  occupancyRamp: number;
}

export type OpexKey = "propertyTax" | "insurance" | "utilities" | "repairs" | "capex" | "management" | "hoa";
export const OPEX_LABELS: Record<OpexKey, string> = { propertyTax: "Property tax", insurance: "Insurance", utilities: "Utilities", repairs: "Repairs and maintenance", capex: "Capital reserve", management: "Property management", hoa: "HOA" };

const growth = (annualPct: number, year: number) => Math.pow(1 + annualPct / 100, year);

/**
 * One month of operations. `opMonth` counts from 1 at the first month after CO; `leaseUpMo` months ramp income.
 * Growth steps at each anniversary of CO (year = floor((opMonth - 1) / 12)).
 */
export function opsMonth(i: ProformaInputs, opMonth: number, leaseUpMo: number): OpsMonth {
  const o = i.operations, g = i.growthExit;
  const year = Math.floor((opMonth - 1) / 12);
  const rentFactor = growth(g.rentGrowthPct, year);
  const expFactor = growth(g.expenseGrowthPct, year);
  const ramp = leaseUpMo > 0 && opMonth <= leaseUpMo ? opMonth / leaseUpMo : 1;
  const gprFull = roundCents(sum(o.units.map((u) => u.rent + u.otherIncome)) * rentFactor);
  const gpr = roundCents(gprFull * ramp);
  const vacancy = pctOf(gpr, o.vacancyPct);
  const egi = gpr - vacancy;
  const fixed = (annual: Cents) => roundCents((annual * expFactor) / 12);
  const opexLines: Record<OpexKey, Cents> = {
    propertyTax: fixed(o.propertyTaxAnnual),
    insurance: fixed(o.insuranceAnnual),
    utilities: fixed(o.utilitiesAnnual),
    repairs: pctOf(egi, o.repairsPct),
    capex: fixed(o.capexReserveAnnual),
    management: pctOf(egi, o.mgmtPct),
    hoa: fixed(o.hoaAnnual),
  };
  const opex = sum(Object.values(opexLines));
  return { opMonth, gpr, vacancy, egi, opex, opexLines, noi: egi - opex, occupancyRamp: ramp };
}

/** Stabilized year-1 NOI: twelve full months at year-0 rents and costs, no lease-up. */
export function stabilizedNoi(i: ProformaInputs): Cents {
  let noi = 0;
  for (let m = 1; m <= 12; m++) noi += opsMonth({ ...i, growthExit: { ...i.growthExit, rentGrowthPct: 0, expenseGrowthPct: 0 } }, m, 0).noi;
  return noi;
}

/** NOI for the twelve months after `fromOpMonth` (exclusive), used for the exit value. */
export function forwardNoi(i: ProformaInputs, fromOpMonth: number, leaseUpMo: number): Cents {
  let noi = 0;
  for (let m = fromOpMonth + 1; m <= fromOpMonth + 12; m++) noi += opsMonth(i, m, leaseUpMo).noi;
  return noi;
}

/** Monthly carry on the existing property during development (taxes and insurance), before any rent. */
export function devCarryMonthly(i: ProformaInputs): Cents {
  return roundCents((i.operations.propertyTaxAnnual + i.operations.insuranceAnnual) / 12);
}
