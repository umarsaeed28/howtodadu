/**
 * Scenario economics for build options.
 *
 * RISK ASSESSMENT (from spec):
 * - Users may overtrust scenario economics → label all outputs preliminary, expose assumptions
 * - Inaccurate value assumptions → use transparent comp-based estimates, show confidence
 * - Construction cost variability → use range or planning-level midpoints
 * - Land basis distortions → clearly mark when using assessed vs estimated values
 * - Misleading confidence if inputs are weak → tie confidence to data availability
 *
 * This module maps pro forma spreadsheet logic into the app.
 * NOT lender-ready. NOT final underwriting. Planning-level estimates only.
 */

import type { ADUReport, HousingOption } from "./adu-analysis";
import type { FeasibilityResult } from "./feasibility";

export type ScenarioRecommendation =
  | "Strong Candidate"
  | "Worth Reviewing"
  | "Tight Economics"
  | "High Risk"
  | "Not Attractive";

export interface ScenarioAssumptions {
  optionType: string;
  estimatedUnits: number | null;
  estimatedSqFt: number | null;
  constructionCostPerSqFt: number;
  purchasePrice: number;
  finishedValuePerSqFt: number;
  finishedValue: number;
  salesCostRate: number;
  equityRate?: number;
  durationMonths?: number;
  scenarioConfidence: number;
  notes: string[];
  constructionType: string;
  archAndPermitFees: number;
  holdingCosts: number;
  condoizationFees: number;
  softCosts: number;
  financingCost: number;
}

export interface ScenarioEconomics {
  purchasePrice: number;
  landAcquisitionCost: number;
  constructionCostPerSqFt: number;
  totalSqFt: number;
  constructionBudget: number;
  softCosts: number;
  archAndPermitFees: number;
  holdingCosts: number;
  condoizationFees: number;
  financingCost: number;
  projectCosts: number;
  finishedValue: number;
  salesAndClosingCosts: number;
  profitDollars: number;
  profitMargin: number;
  landCostPctOfValue: number;
  acqAndConstPctOfValue: number;
  cashInvested?: number;
  cashOnCash?: number;
  annualizedReturn?: number;
  recommendation: ScenarioRecommendation;
  confidence: number;
  assumptions: ScenarioAssumptions;
}

/**
 * User-overridable assumptions for scenario economics.
 * Enter your own numbers for more accurate planning.
 */
export interface UserScenarioInputs {
  acquisitionCost?: number | null;
  financingInterestRate?: number | null;
  archAndPermitFees?: number | null;
  condoizationFees?: number | null;
  holdingCosts?: number | null;
  softCosts?: number | null;
  valuePerSqFt?: number | null;
}

export interface BuildScenario {
  optionType: string;
  eligibility: boolean;
  housingOption: HousingOption;
  assumptions: ScenarioAssumptions;
  economics: ScenarioEconomics;
  siteFit: {
    whyEligible: string;
    advantages: string[];
    constraints: string[];
  };
  risks: string[];
}

/* ── Construction cost: $350/sq ft (planning-level) ── */
const CONSTRUCTION_COST_PER_SQFT = 350;

/* ── Default soft costs ── */
const DEFAULT_SOFT_COSTS = 75_000;
const DEFAULT_ARCH_PERMIT_FEES = 17_500; /* $15–20K range */
const DEFAULT_HOLDING_COSTS = 65_000; /* $50–80K buffer */

/* ── ARV per sq ft: Seattle area DADU/addition comps (planning-level) ── */
const VALUE_PER_SQFT: Record<string, number> = {
  DADU: 520,
  AADU: 450,
  "Cottage Housing": 500,
  Townhouses: 450,
  Apartments: 420,
  "Small Lot Housing": 480,
};

/* ── Est. monthly rent: Seattle area ADU/comps (planning-level) ── */
export const RENT_RANGE: Record<string, { min: number; max: number }> = {
  DADU: { min: 3800, max: 4000 },
  AADU: { min: 2200, max: 2800 },
  "Cottage Housing": { min: 3600, max: 4200 },
  Townhouses: { min: 3200, max: 4500 },
  Apartments: { min: 1800, max: 2800 },
  "Small Lot Housing": { min: 3600, max: 4000 },
};

/* ── Construction type labels ── */
const CONSTRUCTION_TYPE: Record<string, string> = {
  DADU: "New construction",
  AADU: "Conversion / addition",
  "Cottage Housing": "New cluster",
  Townhouses: "New attached",
  Apartments: "New multi-unit",
  "Small Lot Housing": "New detached",
};

function getRecommendationFromMarginAndCost(
  margin: number,
  acqConstPct: number,
  landCostPct: number
): ScenarioRecommendation {
  if (margin >= 15) return "Strong Candidate";
  if (margin >= 10) return "Worth Reviewing";
  if (margin >= 5) return "Tight Economics";
  if (margin >= 0) return "High Risk";
  return "Not Attractive";
}

/**
 * Estimate purchase price from parcel data.
 * Uses land + improvement value when available; otherwise estimates from lot size.
 */
function estimatePurchasePrice(result: FeasibilityResult): number {
  const p = result.parcel;
  const landVal = p?.landValue ?? 0;
  const imprVal = p?.improvementValue ?? 0;
  if (landVal > 0 || imprVal > 0) {
    return landVal + imprVal;
  }
  const lotSqft = p?.lotSqft ?? result.feasibility?.shapeArea ?? 0;
  if (lotSqft <= 0) return 650000;
  const pricePerSqft = 200;
  return lotSqft * pricePerSqft;
}

/**
 * Estimate buildable sq ft for an option type from report and lot data.
 */
function estimateSqFtForOption(
  optionType: string,
  report: ADUReport,
  result: FeasibilityResult
): number | null {
  const lot = result.parcel?.lotSqft ?? result.feasibility?.shapeArea ?? 0;
  const footprint = report.daduFootprint;
  const cov = report.coverage;
  const availSqft = cov?.availableSqft ?? 0;

  switch (optionType) {
    case "DADU":
      return footprint?.buildableSqft ?? (availSqft > 0 ? Math.min(1000, availSqft) : null);
    case "AADU": {
      const garageSqft = result.feasibility?.detachedGarageSqft;
      if (garageSqft != null && garageSqft > 0) return garageSqft;
      return 500;
    }
    case "Cottage Housing":
      return lot >= 6000 ? Math.min(3200, Math.floor(lot * 0.35)) : lot >= 4000 ? 1600 : null;
    case "Townhouses":
      return lot >= 3200 ? Math.floor(lot / 1200) * 1200 : null;
    case "Apartments":
      return lot >= 3200 ? Math.floor(lot / 1000) * 1000 : null;
    case "Small Lot Housing":
      return lot >= 5000 ? Math.floor(lot / 2500) * 1000 : null;
    default:
      return availSqft > 0 ? Math.min(800, availSqft) : null;
  }
}

/**
 * Build scenario assumptions for a build option.
 * User inputs override defaults. Scenario: buy house (backyard included), build in backyard.
 */
export function buildScenarioAssumptions(
  option: HousingOption,
  report: ADUReport,
  result: FeasibilityResult,
  userInputs?: UserScenarioInputs | null
): ScenarioAssumptions | null {
  if (!option.allowed) return null;

  const defaultAcquisition = estimatePurchasePrice(result);
  const acquisitionCost =
    userInputs?.acquisitionCost != null && userInputs.acquisitionCost > 0
      ? userInputs.acquisitionCost
      : defaultAcquisition;

  const sqFt = estimateSqFtForOption(option.type, report, result);
  const units = option.estimatedUnits ?? 1;
  const effSqFt = sqFt ?? (option.type === "AADU" ? 500 : 600);

  const costPerSqFt = CONSTRUCTION_COST_PER_SQFT;
  const valuePerSqFt =
    userInputs?.valuePerSqFt != null && userInputs.valuePerSqFt > 0
      ? userInputs.valuePerSqFt
      : VALUE_PER_SQFT[option.type] ?? 450;
  const newConstructionValue = effSqFt * valuePerSqFt;
  /* Finished value = existing property + value of new addition (buy house, backyard included) */
  const finishedValue = acquisitionCost + newConstructionValue;
  const salesCostRate = 0.08;
  const constructionType = CONSTRUCTION_TYPE[option.type] ?? "New construction";

  const softCosts =
    userInputs?.softCosts != null && userInputs.softCosts >= 0
      ? userInputs.softCosts
      : DEFAULT_SOFT_COSTS;
  const archAndPermitFees =
    userInputs?.archAndPermitFees != null && userInputs.archAndPermitFees >= 0
      ? userInputs.archAndPermitFees
      : DEFAULT_ARCH_PERMIT_FEES;
  const holdingCosts =
    userInputs?.holdingCosts != null && userInputs.holdingCosts >= 0
      ? userInputs.holdingCosts
      : DEFAULT_HOLDING_COSTS;
  const condoizationFees =
    userInputs?.condoizationFees != null && userInputs.condoizationFees >= 0
      ? userInputs.condoizationFees
      : 0;

  const constructionBudget = costPerSqFt * effSqFt;
  const durationMonths = 18;
  const financingInterestRate = userInputs?.financingInterestRate ?? 0;
  const financingCost =
    financingInterestRate > 0
      ? (acquisitionCost + constructionBudget) * (financingInterestRate / 100) * (durationMonths / 12)
      : 0;

  const lotSqft = result.parcel?.lotSqft ?? result.feasibility?.shapeArea ?? 0;
  const hasAssessed = (result.parcel?.landValue ?? 0) > 0 || (result.parcel?.improvementValue ?? 0) > 0;
  const notes: string[] = [];
  if (userInputs?.acquisitionCost != null && userInputs.acquisitionCost > 0) {
    notes.push("Acquisition cost from your entry (e.g. asking price or offer).");
  } else if (hasAssessed) {
    notes.push("Acquisition from King County assessed values. Market may be higher — override with your estimate.");
  } else if (lotSqft > 0) {
    notes.push("Acquisition estimated from lot size × $200/sq ft; override with comps or asking price.");
  } else {
    notes.push("Acquisition uses placeholder; enter your expected purchase price.");
  }
  notes.push(`Construction: $${costPerSqFt}/sq ft. Soft: $${(softCosts / 1000).toFixed(0)}k. Arch/permits: $${(archAndPermitFees / 1000).toFixed(0)}k. Holding: $${(holdingCosts / 1000).toFixed(0)}k.`);
  notes.push(`ARV: $${valuePerSqFt}/sq ft for new build (Seattle area comps). Override if you have local data.`);
  notes.push("Scenario: Buy house (backyard included). Build DADU in backyard.");
  if (sqFt == null) {
    notes.push("Buildable sq ft estimated from lot and zoning; verify with site plan.");
  }

  const confidence =
    acquisitionCost > 0 && sqFt != null && sqFt > 0 ? 70 : acquisitionCost > 0 ? 55 : 45;

  return {
    optionType: option.type,
    estimatedUnits: units,
    estimatedSqFt: effSqFt,
    constructionCostPerSqFt: costPerSqFt,
    purchasePrice: acquisitionCost,
    finishedValuePerSqFt: valuePerSqFt,
    finishedValue,
    salesCostRate,
    equityRate: 0.25,
    durationMonths,
    scenarioConfidence: confidence,
    notes,
    constructionType,
    archAndPermitFees,
    holdingCosts,
    condoizationFees,
    softCosts,
    financingCost,
  };
}

/**
 * Calculate scenario economics from assumptions.
 * Project Costs = Acquisition + Construction + Soft + Arch/Permits + Holding + Condoization + Financing
 */
export function calculateScenarioEconomics(assumptions: ScenarioAssumptions): ScenarioEconomics {
  const {
    constructionCostPerSqFt,
    estimatedSqFt,
    purchasePrice,
    finishedValue,
    salesCostRate,
    equityRate,
    durationMonths,
    scenarioConfidence,
    softCosts,
    archAndPermitFees,
    holdingCosts,
    condoizationFees,
    financingCost,
  } = assumptions;

  const totalSqFt = estimatedSqFt ?? 0;
  const constructionBudget = constructionCostPerSqFt * totalSqFt;
  const landAcquisitionCost = purchasePrice;
  const projectCosts =
    landAcquisitionCost +
    constructionBudget +
    softCosts +
    archAndPermitFees +
    holdingCosts +
    condoizationFees +
    financingCost;
  const salesAndClosingCosts = finishedValue * salesCostRate;
  const profitDollars = finishedValue - salesAndClosingCosts - projectCosts;
  const profitMargin = finishedValue > 0 ? (profitDollars / finishedValue) * 100 : 0;
  const landCostPctOfValue = finishedValue > 0 ? (purchasePrice / finishedValue) * 100 : 0;
  const acqAndConstPctOfValue = finishedValue > 0 ? (projectCosts / finishedValue) * 100 : 0;

  let cashInvested: number | undefined;
  let cashOnCash: number | undefined;
  let annualizedReturn: number | undefined;
  if (equityRate != null && durationMonths != null) {
    cashInvested = projectCosts * equityRate;
    cashOnCash = cashInvested > 0 ? (profitDollars / cashInvested) * 100 : undefined;
    const years = durationMonths / 12;
    annualizedReturn =
      cashInvested != null && cashInvested > 0 && years > 0
        ? (profitDollars / cashInvested / years) * 100
        : undefined;
  }

  const recommendation = getRecommendationFromMarginAndCost(
    profitMargin,
    acqAndConstPctOfValue,
    landCostPctOfValue
  );

  return {
    purchasePrice,
    landAcquisitionCost,
    constructionCostPerSqFt,
    totalSqFt,
    constructionBudget,
    softCosts,
    archAndPermitFees,
    holdingCosts,
    condoizationFees,
    financingCost,
    projectCosts,
    finishedValue,
    salesAndClosingCosts,
    profitDollars,
    profitMargin,
    landCostPctOfValue,
    acqAndConstPctOfValue,
    cashInvested,
    cashOnCash,
    annualizedReturn,
    recommendation,
    confidence: scenarioConfidence,
    assumptions,
  };
}

/**
 * Build site-fit summary for an option.
 */
function buildSiteFit(
  option: HousingOption,
  report: ADUReport,
  result: FeasibilityResult
): { whyEligible: string; advantages: string[]; constraints: string[] } {
  const advantages: string[] = [];
  const constraints: string[] = [];

  advantages.push(option.description);
  if (report.access.type === "alley" || report.access.type === "corner") {
    advantages.push("Favorable access for construction.");
  }
  if ((report.daduFootprint?.buildableSqft ?? 0) >= 600 && option.type === "DADU") {
    advantages.push("Lot supports a substantial DADU footprint.");
  }
  if (report.traits.some((t) => t.sentiment === "good")) {
    advantages.push("Site traits support development.");
  }

  if (!option.allowed) {
    constraints.push(option.note);
  }
  if (report.access.type === "none") {
    constraints.push("Access may limit construction feasibility.");
  }
  if (report.eca.hasIssues) {
    constraints.push("Environmental constraints may apply.");
  }
  if ((result.feasibility?.steepSlopePercent ?? 0) > 0.15) {
    constraints.push("Slope may increase build costs.");
  }

  const whyEligible = option.allowed ? option.note : "Not eligible: " + option.note;
  return { whyEligible, advantages, constraints };
}

/**
 * Build risks list for a scenario.
 */
function buildRisks(economics: ScenarioEconomics, option: HousingOption): string[] {
  const risks: string[] = [];
  if (economics.profitMargin < 10) {
    risks.push("Cost overrun risk: margin is tight; any increase in build costs erodes profit.");
  }
  risks.push("Permitting risk: timelines and conditions can vary.");
  if (option.type === "DADU" || option.type === "AADU") {
    risks.push("Site complexity: access and topography affect cost.");
  }
  risks.push("Value uncertainty: comps and market conditions change.");
  risks.push("Assumption sensitivity: verify construction costs and comps with local data.");
  return risks;
}

/**
 * Build full scenarios for all eligible housing options.
 * Pass userInputs to use custom acquisition, fees, ARV, etc.
 */
export function buildScenariosForOptions(
  options: HousingOption[],
  report: ADUReport,
  result: FeasibilityResult,
  userInputs?: UserScenarioInputs | null
): BuildScenario[] {
  const scenarios: BuildScenario[] = [];
  for (const opt of options) {
    const assumptions = buildScenarioAssumptions(opt, report, result, userInputs);
    if (!assumptions) continue;
    const economics = calculateScenarioEconomics(assumptions);
    const siteFit = buildSiteFit(opt, report, result);
    const risks = buildRisks(economics, opt);
    scenarios.push({
      optionType: opt.type,
      eligibility: opt.allowed,
      housingOption: opt,
      assumptions,
      economics,
      siteFit,
      risks,
    });
  }
  return scenarios;
}

/**
 * Rank scenarios by financial attractiveness (profit margin, then profit dollars).
 */
export function rankScenariosByEconomics(scenarios: BuildScenario[]): {
  ranked: BuildScenario[];
  bestIndex: number;
} {
  const ranked = [...scenarios].sort((a, b) => {
    if (b.economics.profitMargin !== a.economics.profitMargin) {
      return b.economics.profitMargin - a.economics.profitMargin;
    }
    return b.economics.profitDollars - a.economics.profitDollars;
  });
  const bestIndex = ranked.length > 0 ? 0 : -1;
  return { ranked, bestIndex };
}
