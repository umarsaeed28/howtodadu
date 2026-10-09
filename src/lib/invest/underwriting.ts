import type { InvestAssumptions } from "./assumptions";

/**
 * The cost side of an opportunity: buy the listing and build the biggest DADU the lot allows.
 *
 * Cash required is the down payment plus the build and soft costs (or, with the build financed, the down payment
 * plus soft costs). Rent and resale are not estimated. TODO(comps): when the MLS feed is connected, add the DADU's
 * sale value from comparable sales, and the return on cost that follows from it.
 */
export interface UnderwritingInput {
  price: number;
  daduSqft: number;
}

export interface Underwriting {
  purchase: number;
  daduSqft: number;
  buildCost: number;
  softCosts: number;
  totalProjectCost: number;
  downPayment: number;
  /** The build, when it is financed with a construction loan. */
  constructionLoan: number;
  /** A year of interest on the construction loan. */
  financingCost: number;
  cashRequired: number;
  /** Purchase, build and soft costs over the house and the DADU together, per sf. Null without the house's size. */
  allInPerSf: number | null;
}

const round = (n: number) => Math.round(n);

export function underwrite(i: UnderwritingInput & { houseSqft?: number | null }, a: InvestAssumptions): Underwriting {
  const sf = Math.max(0, Math.round(i.daduSqft));
  const buildCost = round(sf * a.buildCostPerSf);
  const softCosts = round(a.planCost + a.permitCost + a.cityFees);
  const downPayment = round((i.price * a.downPaymentPct) / 100);
  const constructionLoan = a.financeConstruction ? buildCost : 0;
  const totalProjectCost = i.price + buildCost + softCosts;
  const totalSf = (i.houseSqft ?? 0) + sf;
  return {
    purchase: i.price,
    daduSqft: sf,
    buildCost,
    softCosts,
    totalProjectCost,
    downPayment,
    constructionLoan,
    financingCost: round((constructionLoan * a.interestRatePct) / 100),
    cashRequired: downPayment + softCosts + (a.financeConstruction ? 0 : buildCost),
    allInPerSf: i.houseSqft && totalSf > 0 ? round(totalProjectCost / totalSf) : null,
  };
}
