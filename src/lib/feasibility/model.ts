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
    /** Any other flat soft cost (design, utilities, fees) in dollars. */
    otherFlat?: number;
  };
  financing: {
    loanToCostPct: number;
    /** A fixed loan amount. When set it replaces loan-to-cost (capped at the pre-financing cost). */
    loanAmount?: number;
    interestRatePct: number;
    buildMonths: number;
    propertyTaxMonthly: number;
    utilitiesMaintMonthly: number;
    /** Months from closing to permit issue. Land is carried, no construction draw yet. Default 0. */
    permitMonths?: number;
    /** Months from completion to closed sale or stabilization. Full loan is carried. Default 0. */
    exitMonths?: number;
  };
  exit: {
    strategy: ExitStrategy;
    salePricePerSqft?: number;
    salePricePerUnit?: number;
    rentPerUnitMonthly?: number;
    vacancyPct?: number;
    capRatePct?: number;
    sellingCostsPct: number;
    /** Operating expenses as a share of effective rent: tax, insurance, repairs, management, reserves. Default 30. */
    opexRatioPct?: number;
    /** Permanent loan sizing for the hold case. Defaults: 70% LTV, 6.75% rate, 30 year amortization, 1.25 DSCR floor. */
    permLtvPct?: number;
    permRatePct?: number;
    permAmortYears?: number;
    minDscr?: number;
  };
  /** Unit count for per-unit revenue and rent math. Not a cost; carried for context. */
  units: number;
}

export interface SellCase {
  grossRevenue: number;
  netRevenue: number;
  profit: number;
  marginOnCost: number;
}

export interface HoldCase {
  /** Net operating income per year after the opex ratio. */
  noi: number;
  stabilizedValue: number;
  /** Stabilized value minus total cost: equity created by building it. */
  valueCreated: number;
  yieldOnCost: number;
  /** Yield on cost minus the cap rate, in percentage points. A thin spread means little cushion. */
  spreadToCapPts: number;
  permLoan: number;
  annualDebtService: number;
  dscr: number;
  /** Permanent loan proceeds minus the construction loan payoff. Positive means cash returned. */
  refiCashOut: number;
  cashLeftInDeal: number;
  cashOnCashPct: number | null;
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
  timelineMonths: number;
  /** Profit compounded to a yearly rate over the whole timeline. Not a cash-flow IRR. */
  annualizedReturn: number | null;
  equityMultiple: number | null;
  costPerUnit: number;
  costPerSqft: number | null;
  profitPerUnit: number;
  /** Sale revenue needed to break even, and how far below the base case that is. */
  breakeven: { grossRevenue: number; revenuePerUnit: number; cushionPct: number };
  /** Both exits, always computed, so sell and hold can be compared side by side. */
  exits: { sell: SellCase | null; hold: HoldCase | null };
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
    s.legalAccounting +
    (s.otherFlat ?? 0)
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

  // sell_finished / sell_permit_ready share the same revenue formula; the inputs
  // (build cost, sale price) differ to reflect the strategy.
  let gross = 0;
  if (e.salePricePerUnit != null) gross = e.salePricePerUnit * units;
  else if (e.salePricePerSqft != null) gross = e.salePricePerSqft * inputs.hard.buildableSqft;
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
  const loanAmount = inputs.financing.loanAmount != null ? Math.max(0, Math.min(inputs.financing.loanAmount, preFinancing)) : preFinancing * (inputs.financing.loanToCostPct / 100);
  const rate = inputs.financing.interestRatePct / 100;
  const permitMonths = inputs.financing.permitMonths ?? 0;
  const exitMonths = inputs.financing.exitMonths ?? 0;
  const ltc = preFinancing > 0 ? loanAmount / preFinancing : 0;
  const buildInterest = loanAmount * rate * (inputs.financing.buildMonths / 12) * AVG_DRAW_FACTOR;
  // Permit period: only the land (and closing) is financed and fully drawn.
  const permitInterest = acquisition * ltc * rate * (permitMonths / 12);
  // Sale or lease-up period: the full loan is drawn.
  const exitInterest = loanAmount * rate * (exitMonths / 12);
  const interest = buildInterest + permitInterest + exitInterest;
  const timelineMonths = permitMonths + inputs.financing.buildMonths + exitMonths;
  const carrying =
    (inputs.financing.propertyTaxMonthly + inputs.financing.utilitiesMaintMonthly) * timelineMonths;
  const financing = interest + carrying;

  const total = preFinancing + financing;
  const equityRequired = total - loanAmount;

  const { grossRevenue: grossBase, stabilizedValue, yieldOnCost } = exitEconomics(inputs, total);
  const grossRevenue = grossBase * revenueMultiplier;
  const sellingCosts = grossRevenue * (inputs.exit.sellingCostsPct / 100);
  const profit = grossRevenue - sellingCosts - total;

  const marginOnCost = total > 0 ? (profit / total) * 100 : 0;
  const returnOnEquity = equityRequired > 0 ? (profit / equityRequired) * 100 : 0;

  const units = Math.max(inputs.units, 1);
  const area = inputs.hard.buildableSqft + (inputs.hard.rehabSqft ?? 0);
  const equityMultiple = equityRequired > 0 ? (equityRequired + profit) / equityRequired : null;
  const annualizedReturn =
    equityMultiple != null && equityMultiple > 0 && timelineMonths > 0
      ? (Math.pow(equityMultiple, 12 / timelineMonths) - 1) * 100
      : null;
  const sellPct = inputs.exit.sellingCostsPct / 100;
  const beGross = sellPct < 1 ? total / (1 - sellPct) : 0;

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
    timelineMonths,
    annualizedReturn: annualizedReturn != null ? Number(annualizedReturn.toFixed(1)) : null,
    equityMultiple: equityMultiple != null ? Number(equityMultiple.toFixed(2)) : null,
    costPerUnit: Math.round(total / units),
    costPerSqft: area > 0 ? Math.round(total / area) : null,
    profitPerUnit: Math.round(profit / units),
    breakeven: {
      grossRevenue: Math.round(beGross),
      revenuePerUnit: Math.round(beGross / units),
      cushionPct: grossRevenue > 0 ? Number((((grossRevenue - beGross) / grossRevenue) * 100).toFixed(1)) : 0,
    },
    exits: { sell: sellCase(inputs, total, revenueMultiplier), hold: holdCase(inputs, total, loanAmount, equityRequired) },
  };
}

/** Level payment constant for a fully amortizing loan, as a fraction of principal per year. */
export function mortgageConstant(ratePct: number, years: number): number {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (n <= 0) return 0;
  if (r === 0) return 12 / n;
  return (12 * r) / (1 - Math.pow(1 + r, -n));
}

function sellCase(inputs: DealInputs, total: number, revenueMultiplier: number): SellCase | null {
  const e = inputs.exit;
  const units = Math.max(inputs.units, 1);
  let gross = 0;
  if (e.salePricePerUnit != null) gross = e.salePricePerUnit * units;
  else if (e.salePricePerSqft != null) gross = e.salePricePerSqft * inputs.hard.buildableSqft;
  if (gross <= 0) return null;
  gross *= revenueMultiplier;
  const net = gross * (1 - e.sellingCostsPct / 100);
  const profit = net - total;
  return {
    grossRevenue: Math.round(gross),
    netRevenue: Math.round(net),
    profit: Math.round(profit),
    marginOnCost: total > 0 ? Number(((profit / total) * 100).toFixed(1)) : 0,
  };
}

function holdCase(inputs: DealInputs, total: number, constructionLoan: number, equity: number): HoldCase | null {
  const e = inputs.exit;
  if (!e.rentPerUnitMonthly || !e.capRatePct || e.capRatePct <= 0) return null;
  const units = Math.max(inputs.units, 1);
  const egi = e.rentPerUnitMonthly * units * 12 * (1 - (e.vacancyPct ?? 0) / 100);
  const noi = egi * (1 - (e.opexRatioPct ?? 30) / 100);
  const value = noi / (e.capRatePct / 100);
  const k = mortgageConstant(e.permRatePct ?? 6.75, e.permAmortYears ?? 30);
  const ltvLoan = value * ((e.permLtvPct ?? 70) / 100);
  const dscrLoan = k > 0 ? noi / (e.minDscr ?? 1.25) / k : 0;
  const permLoan = Math.max(0, Math.min(ltvLoan, dscrLoan));
  const ds = permLoan * k;
  const refiCashOut = permLoan - constructionLoan;
  const cashLeft = Math.max(0, equity - Math.max(0, refiCashOut));
  return {
    noi: Math.round(noi),
    stabilizedValue: Math.round(value),
    valueCreated: Math.round(value - total),
    yieldOnCost: total > 0 ? Number(((noi / total) * 100).toFixed(2)) : 0,
    spreadToCapPts: total > 0 ? Number(((noi / total) * 100 - e.capRatePct).toFixed(2)) : 0,
    permLoan: Math.round(permLoan),
    annualDebtService: Math.round(ds),
    dscr: ds > 0 ? Number((noi / ds).toFixed(2)) : 0,
    refiCashOut: Math.round(refiCashOut),
    cashLeftInDeal: Math.round(cashLeft),
    cashOnCashPct: cashLeft > 0 ? Number((((noi - ds) / cashLeft) * 100).toFixed(1)) : null,
  };
}

/** Run the model with hard cost and revenue scaled, for sensitivity grids. */
export function computeWithScalars(inputs: DealInputs, hardMultiplier: number, revenueMultiplier: number): DealResult {
  return run(inputs, hardMultiplier, revenueMultiplier);
}

export function computeFeasibility(inputs: DealInputs): DealResult {
  const base = run(inputs, 1, 1);
  const hardPlus10 = run(inputs, 1.1, 1).marginOnCost;
  const saleMinus10 = run(inputs, 1, 0.9).marginOnCost;
  base.sensitivity = { hardCostPlus10: hardPlus10, salePriceMinus10: saleMinus10 };
  return base;
}
