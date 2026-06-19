/**
 * Pure underwriting model. No hidden constants in components: every assumption
 * lives in DealInputs with a default the user can override. computeFeasibility is
 * the single source of truth for cost, profit, margin, and the verdict band.
 *
 * All percentage inputs are whole numbers (e.g. 6 = 6%). marginOnCost and
 * returnOnEquity are returned as whole-number percentages to match the app's
 * existing pct()/verdictFromMargin() conventions.
 */

export type ExitStrategy = "sell_permit_ready" | "sell_finished" | "hold_rent";

export interface DealInputs {
  acquisition: {
    purchasePrice: number;
    closingCostsPct: number;
    demoSitePrep: number;
  };
  hard: {
    /** New construction area and its cost. */
    buildableSqft: number;
    costPerSqft: number;
    /** Existing area to rehab/remodel and its (typically lower) cost. */
    rehabSqft: number;
    rehabCostPerSqft: number;
    /** If set, overrides the new build + rehab subtotal entirely. */
    hardCostOverride?: number;
    contingencyPct: number;
  };
  soft: {
    architecturePct: number;
    engineeringPct: number;
    permitsAndFees: number;
    surveyEnviro: number;
    projectMgmtPct: number;
    legalAccounting: number;
    insurancePct: number;
  };
  financing: {
    loanToCostPct: number;
    interestRatePct: number;
    buildMonths: number;
    propertyTaxMonthly: number;
    utilitiesMaintMonthly: number;
  };
  exit: {
    strategy: ExitStrategy;
    salePricePerSqft?: number;
    /** Average sale price per unit. Kept as a seed/fallback; unitSalePrices wins. */
    salePricePerUnit?: number;
    /** Per-unit resale value (ARV). Each unit is priced individually and summed. */
    unitSalePrices?: number[];
    rentPerUnitMonthly?: number;
    vacancyPct?: number;
    capRatePct?: number;
    sellingCostsPct: number;
  };
  /** Unit count for per-unit revenue and rent math. Not a cost; carried for context. */
  units: number;
}

export interface DealResult {
  costBreakdown: {
    acquisition: number;
    hard: number;
    soft: number;
    financing: number;
    total: number;
  };
  equityRequired: number;
  loanAmount: number;
  grossRevenue: number;
  sellingCosts: number;
  profit: number;
  marginOnCost: number;
  returnOnEquity: number;
  yieldOnCost?: number;
  stabilizedValue?: number;
  sensitivity: {
    hardCostPlus10: number;
    salePriceMinus10: number;
  };
}

/** Average outstanding construction loan balance over the build (drawn over time). */
const AVG_DRAW_FACTOR = 0.6;

/** New construction subtotal (before contingency). */
export function newBuildCost(inputs: DealInputs): number {
  return inputs.hard.buildableSqft * inputs.hard.costPerSqft;
}

/** Rehab / remodel subtotal (before contingency). */
export function rehabCost(inputs: DealInputs): number {
  return (inputs.hard.rehabSqft ?? 0) * (inputs.hard.rehabCostPerSqft ?? 0);
}

function hardBase(inputs: DealInputs): number {
  return inputs.hard.hardCostOverride ?? newBuildCost(inputs) + rehabCost(inputs);
}

function acquisitionCost(inputs: DealInputs): number {
  const { purchasePrice, closingCostsPct, demoSitePrep } = inputs.acquisition;
  return purchasePrice + purchasePrice * (closingCostsPct / 100) + demoSitePrep;
}

function softCost(inputs: DealInputs, hb: number): number {
  const s = inputs.soft;
  return (
    hb * (s.architecturePct / 100) +
    hb * (s.engineeringPct / 100) +
    hb * (s.projectMgmtPct / 100) +
    hb * (s.insurancePct / 100) +
    s.permitsAndFees +
    s.surveyEnviro +
    s.legalAccounting
  );
}

/** Gross revenue and (for hold) stabilized value + yield, from the exit inputs. */
function exitEconomics(
  inputs: DealInputs,
  totalCost: number
): { grossRevenue: number; stabilizedValue?: number; yieldOnCost?: number } {
  const e = inputs.exit;
  const units = Math.max(inputs.units, 1);

  if (e.strategy === "hold_rent") {
    const rent = (e.rentPerUnitMonthly ?? 0) * units * 12;
    const effective = rent * (1 - (e.vacancyPct ?? 0) / 100);
    const noi = effective - inputs.financing.utilitiesMaintMonthly * 12;
    const cap = (e.capRatePct ?? 0) / 100;
    const stabilizedValue = cap > 0 ? noi / cap : 0;
    const yieldOnCost = totalCost > 0 ? (noi / totalCost) * 100 : 0;
    return { grossRevenue: stabilizedValue, stabilizedValue, yieldOnCost };
  }

  // sell_finished / sell_permit_ready share the same revenue formula. Per-unit
  // ARV is the source of truth: each unit is priced individually and summed.
  // A shorter array repeats its last value; a per-unit average or $/sqft are
  // fallbacks for inputs that never set explicit unit prices.
  let gross = 0;
  const arr = e.unitSalePrices;
  if (arr && arr.length > 0) {
    for (let i = 0; i < units; i++) gross += arr[i] ?? arr[arr.length - 1] ?? 0;
  } else if (e.salePricePerUnit != null) {
    gross = e.salePricePerUnit * units;
  } else if (e.salePricePerSqft != null) {
    gross = e.salePricePerSqft * inputs.hard.buildableSqft;
  }
  return { grossRevenue: gross };
}

/** Core math shared by the headline result and the sensitivity cases. */
function run(
  inputs: DealInputs,
  hardMultiplier: number,
  revenueMultiplier: number
): DealResult {
  const acquisition = acquisitionCost(inputs);
  const hb = hardBase(inputs) * hardMultiplier;
  const hard = hb * (1 + inputs.hard.contingencyPct / 100);
  const soft = softCost(inputs, hb);

  const preFinancing = acquisition + hard + soft;
  const loanAmount = preFinancing * (inputs.financing.loanToCostPct / 100);
  const interest =
    loanAmount *
    (inputs.financing.interestRatePct / 100) *
    (inputs.financing.buildMonths / 12) *
    AVG_DRAW_FACTOR;
  const carrying =
    (inputs.financing.propertyTaxMonthly + inputs.financing.utilitiesMaintMonthly) *
    inputs.financing.buildMonths;
  const financing = interest + carrying;

  const total = preFinancing + financing;
  const equityRequired = total - loanAmount;

  const { grossRevenue: grossBase, stabilizedValue, yieldOnCost } = exitEconomics(inputs, total);
  const grossRevenue = grossBase * revenueMultiplier;
  const sellingCosts = grossRevenue * (inputs.exit.sellingCostsPct / 100);
  const profit = grossRevenue - sellingCosts - total;

  const marginOnCost = total > 0 ? (profit / total) * 100 : 0;
  const returnOnEquity = equityRequired > 0 ? (profit / equityRequired) * 100 : 0;

  return {
    costBreakdown: {
      acquisition: Math.round(acquisition),
      hard: Math.round(hard),
      soft: Math.round(soft),
      financing: Math.round(financing),
      total: Math.round(total),
    },
    equityRequired: Math.round(equityRequired),
    loanAmount: Math.round(loanAmount),
    grossRevenue: Math.round(grossRevenue),
    sellingCosts: Math.round(sellingCosts),
    profit: Math.round(profit),
    marginOnCost: Number(marginOnCost.toFixed(1)),
    returnOnEquity: Number(returnOnEquity.toFixed(1)),
    yieldOnCost: yieldOnCost != null ? Number(yieldOnCost.toFixed(1)) : undefined,
    stabilizedValue: stabilizedValue != null ? Math.round(stabilizedValue) : undefined,
    sensitivity: { hardCostPlus10: 0, salePriceMinus10: 0 },
  };
}

export function computeFeasibility(inputs: DealInputs): DealResult {
  const base = run(inputs, 1, 1);
  const hardPlus10 = run(inputs, 1.1, 1).marginOnCost;
  const saleMinus10 = run(inputs, 1, 0.9).marginOnCost;
  base.sensitivity = { hardCostPlus10: hardPlus10, salePriceMinus10: saleMinus10 };
  return base;
}
