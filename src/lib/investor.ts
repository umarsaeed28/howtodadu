import { COST_PER_SF, constructionEstimate } from "@/lib/config/costs";

/**
 * Investor numbers that need no assumptions: arithmetic on the listing, the city's DADU size and the assessed values.
 * Rent, vacancy, expenses and cap rate are never defaulted here. See InvestorSnapshot for the part the investor sets.
 */
export interface BasisInput {
  price: number;
  livingSqft?: number | null;
  lotSqft?: number | null;
  daduSqft?: number | null;
  landAv?: number | null;
  bldgAv?: number | null;
  costPerSf?: number;
}

export interface Basis {
  pricePerSf: number | null;
  pricePerLotSf: number | null;
  /** Land share of the assessed total. A high share means the house adds little to the assessment. */
  landSharePct: number | null;
  assessedTotal: number | null;
  priceToAssessed: number | null;
  buildCost: number;
  allIn: number;
  /** Price plus DADU build, over the house plus the DADU. */
  allInPerTotalSf: number | null;
  buildCostPerSf: number;
}

export function computeBasis(i: BasisInput): Basis {
  const costPerSf = i.costPerSf ?? COST_PER_SF;
  const dadu = i.daduSqft && i.daduSqft > 0 ? i.daduSqft : 0;
  const buildCost = constructionEstimate(dadu, costPerSf);
  const assessed = i.landAv != null && i.bldgAv != null ? i.landAv + i.bldgAv : null;
  const allIn = i.price + buildCost;
  const totalSf = (i.livingSqft ?? 0) + dadu;
  return {
    pricePerSf: i.livingSqft ? i.price / i.livingSqft : null,
    pricePerLotSf: i.lotSqft ? i.price / i.lotSqft : null,
    landSharePct: assessed && i.landAv != null ? Math.round((i.landAv / assessed) * 100) : null,
    assessedTotal: assessed,
    priceToAssessed: assessed ? i.price / assessed : null,
    buildCost,
    allIn,
    allInPerTotalSf: totalSf > 0 && i.livingSqft ? allIn / totalSf : null,
    buildCostPerSf: costPerSf,
  };
}

export interface YieldInput {
  rentMonthly: number;
  /** Percent, 0 to 100. Blank means not entered, treated as 0 and said so. */
  vacancyPct: number | null;
  opexPct: number | null;
  capPct: number | null;
  buildCost: number;
}

export interface YieldResult {
  grossAnnual: number;
  noi: number;
  yieldOnBuild: number | null;
  paybackYears: number | null;
  /** NOI over the cap rate, only when a cap rate was entered. */
  impliedValue: number | null;
  valueMinusBuild: number | null;
  /** Inputs the investor left blank, so the page can say the result ignores them. */
  ignored: string[];
}

export function computeYield(i: YieldInput): YieldResult {
  const gross = i.rentMonthly * 12;
  const noi = gross * (1 - (i.vacancyPct ?? 0) / 100) * (1 - (i.opexPct ?? 0) / 100);
  const implied = i.capPct && i.capPct > 0 ? noi / (i.capPct / 100) : null;
  return {
    grossAnnual: gross,
    noi,
    yieldOnBuild: i.buildCost > 0 ? noi / i.buildCost : null,
    paybackYears: i.buildCost > 0 && noi > 0 ? i.buildCost / noi : null,
    impliedValue: implied,
    valueMinusBuild: implied != null ? implied - i.buildCost : null,
    ignored: [i.vacancyPct == null && "vacancy", i.opexPct == null && "operating costs"].filter(Boolean) as string[],
  };
}
