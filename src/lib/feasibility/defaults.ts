/**
 * Default assumptions catalog, keyed by build type and unit count.
 *
 * These are EDITABLE PLACEHOLDERS meant to be calibrated with real numbers.
 * The user can override every value through the assumption panels. Percentages
 * are whole numbers (e.g. 6 = 6%).
 */
import type { DealInputs } from "./model";

export type BuildType = "stacked_flats" | "townhomes" | "fourplex" | "sfr_dadu";

interface BuildTypeDefaults {
  /** Finished area per unit, used to seed buildableSqft. */
  unitSqft: number;
  costPerSqft: number;
  /** Default $/sqft to rehab existing structure (typically below new build). */
  rehabCostPerSqft: number;
  permitsPerUnit: number;
  buildMonths: number;
  demoSitePrep: number;
  salePricePerUnit: number;
  rentPerUnitMonthly: number;
}

export const BUILD_TYPES: Record<BuildType, BuildTypeDefaults> = {
  stacked_flats: {
    unitSqft: 950,
    costPerSqft: 295,
    rehabCostPerSqft: 165,
    permitsPerUnit: 9000,
    buildMonths: 16,
    demoSitePrep: 55000,
    salePricePerUnit: 565000,
    rentPerUnitMonthly: 2600,
  },
  townhomes: {
    unitSqft: 1500,
    costPerSqft: 285,
    rehabCostPerSqft: 160,
    permitsPerUnit: 9000,
    buildMonths: 14,
    demoSitePrep: 45000,
    salePricePerUnit: 720000,
    rentPerUnitMonthly: 3200,
  },
  fourplex: {
    unitSqft: 1100,
    costPerSqft: 290,
    rehabCostPerSqft: 160,
    permitsPerUnit: 8500,
    buildMonths: 14,
    demoSitePrep: 45000,
    salePricePerUnit: 585000,
    rentPerUnitMonthly: 2700,
  },
  sfr_dadu: {
    unitSqft: 1100,
    costPerSqft: 300,
    rehabCostPerSqft: 175,
    permitsPerUnit: 12000,
    buildMonths: 12,
    demoSitePrep: 30000,
    salePricePerUnit: 575000,
    rentPerUnitMonthly: 2500,
  },
};

export function buildTypeFor(units: number, bestUse?: string): BuildType {
  const use = (bestUse ?? "").toLowerCase();
  if (use.includes("dadu") || units <= 2) return "sfr_dadu";
  if (use.includes("townhome")) return "townhomes";
  if (use.includes("stacked") || units >= 6) return "stacked_flats";
  return "fourplex";
}

/** Soft-cost percentage defaults shared by every deal (overridable). */
const SOFT_DEFAULTS = {
  architecturePct: 7,
  engineeringPct: 3,
  projectMgmtPct: 3,
  insurancePct: 1,
  surveyEnviro: 12000,
  legalAccounting: 15000,
};

const FINANCING_DEFAULTS = {
  loanToCostPct: 65,
  interestRatePct: 11,
  utilitiesMaintMonthly: 500,
};

const SELLING_COSTS_PCT = 6;

function propertyTaxMonthly(purchasePrice: number): number {
  // ~0.92% effective King County rate, monthly.
  return Math.round((purchasePrice * 0.0092) / 12);
}

/** Generic builder used by the feasibility tool, where there is no authored proforma. */
export function baseDealInputs(opts: {
  purchasePrice: number;
  units: number;
  buildType: BuildType;
}): DealInputs {
  const { purchasePrice, units } = opts;
  const c = BUILD_TYPES[opts.buildType];
  const buildableSqft = Math.max(units, 1) * c.unitSqft;
  return {
    acquisition: { purchasePrice, closingCostsPct: 1.5, demoSitePrep: c.demoSitePrep },
    hard: {
      buildableSqft,
      costPerSqft: c.costPerSqft,
      rehabSqft: 0,
      rehabCostPerSqft: c.rehabCostPerSqft,
      contingencyPct: 8,
    },
    soft: {
      architecturePct: SOFT_DEFAULTS.architecturePct,
      engineeringPct: SOFT_DEFAULTS.engineeringPct,
      permitsAndFees: c.permitsPerUnit * Math.max(units, 1),
      surveyEnviro: SOFT_DEFAULTS.surveyEnviro,
      projectMgmtPct: SOFT_DEFAULTS.projectMgmtPct,
      legalAccounting: SOFT_DEFAULTS.legalAccounting,
      insurancePct: SOFT_DEFAULTS.insurancePct,
    },
    financing: {
      loanToCostPct: FINANCING_DEFAULTS.loanToCostPct,
      interestRatePct: FINANCING_DEFAULTS.interestRatePct,
      buildMonths: c.buildMonths,
      propertyTaxMonthly: propertyTaxMonthly(purchasePrice),
      utilitiesMaintMonthly: FINANCING_DEFAULTS.utilitiesMaintMonthly,
    },
    exit: {
      strategy: "sell_finished",
      salePricePerUnit: c.salePricePerUnit,
      rentPerUnitMonthly: c.rentPerUnitMonthly,
      vacancyPct: 5,
      capRatePct: 5.5,
      sellingCostsPct: SELLING_COSTS_PCT,
    },
    units,
  };
}
