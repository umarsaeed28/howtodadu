/**
 * The proforma engine's one entry point: compute(inputs) -> outputs. Pure, no UI, no I/O.
 */
import { ENGINE_VERSION, requiredMissing, type MissingField, type ProformaInputs } from "./schema";
import { buildModel, type Model, type MonthRow } from "./model";
import { annualRows, metrics, type AnnualRow, type Metrics } from "./metrics";
import { riskFlags, type RiskFlag } from "./flags";
import { sensitivity, type SensitivityGrid } from "./sensitivity";
import { waterfall, type WaterfallResult } from "./waterfall";
import { applyScenario, SCENARIO_PRESETS } from "./scenarios";
import type { BudgetLine, SourcesUses } from "./budget";

export type { ProformaInputs, MissingField } from "./schema";
export { ENGINE_VERSION, defaultInputs, parseInputs, requiredMissing, Strategy, STRATEGY_LABELS, Scenario, DEFAULT_SOURCES } from "./schema";
export type { Model, MonthRow } from "./model";
export type { AnnualRow, Metrics } from "./metrics";
export type { RiskFlag } from "./flags";
export type { SensitivityGrid } from "./sensitivity";
export type { WaterfallResult } from "./waterfall";
export type { BudgetLine, SourcesUses } from "./budget";
export { applyScenario, SCENARIO_PRESETS } from "./scenarios";

export interface ProformaOutputs {
  engineVersion: string;
  generatedAt: string;
  /** The inputs the run used (after the scenario deltas). */
  inputs: ProformaInputs;
  missing: MissingField[];
  timeline: Model["timeline"];
  sourcesUses: SourcesUses;
  budget: BudgetLine[];
  monthly: MonthRow[];
  annual: AnnualRow[];
  metrics: Metrics;
  waterfall: WaterfallResult | null;
  sensitivity: SensitivityGrid[];
  flags: RiskFlag[];
  loans: { construction: Model["constructionLoan"]; permanent: Model["permLoan"] };
  stabilizedValue: number;
  exitReet: Model["exitReet"];
}

/** One run without sensitivity (the sensitivity grids call this for each cell). */
export function computeCore(inputs: ProformaInputs, now = new Date()): Omit<ProformaOutputs, "sensitivity"> {
  const model = buildModel(inputs);
  const annual = annualRows(inputs, model);
  const m = metrics(inputs, model, annual);
  const eq = inputs.financing.equity;
  const wf = eq ? waterfall({ flows: model.rows.map((r) => r.equityCf), days: model.rows.map((r) => r.day), lpPct: eq.lpPct, prefPct: eq.prefPct, tiers: eq.tiers }) : null;
  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: now.toISOString(),
    inputs,
    missing: requiredMissing(inputs),
    timeline: model.timeline,
    sourcesUses: model.sourcesUses,
    budget: model.budgetLines,
    monthly: model.rows,
    annual,
    metrics: m,
    waterfall: wf,
    flags: riskFlags(inputs, m),
    loans: { construction: model.constructionLoan, permanent: model.permLoan },
    stabilizedValue: model.stabilizedValue,
    exitReet: model.exitReet,
  };
}

/** The full run: applies the chosen scenario's deltas, then everything including the sensitivity grids. */
export function compute(base: ProformaInputs, now = new Date()): ProformaOutputs {
  const inputs = base.meta.scenario === "base" ? base : applyScenario(base, SCENARIO_PRESETS[base.meta.scenario]);
  const core = computeCore(inputs, now);
  const grids = sensitivity(inputs, (x) => { const r = computeCore(x, now); return { leveredIrr: r.metrics.leveredIrr, profit: r.metrics.profit }; });
  return { ...core, sensitivity: grids };
}
