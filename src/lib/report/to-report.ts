import {
  FeasibilityReport,
  type Citation,
  type ScenarioId,
  type SourcedNumber,
  type Verdict,
} from "../../../packages/schema/src";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { buildRiskLines } from "@/lib/feasibility-table-model";

import { COST_PER_SF as SHARED_COST_PER_SF } from "@/lib/config/costs";

/** Construction cost per buildable sf. One shared constant, mirrors the `config` table (cost_per_sf = 350). */
export const COST_PER_SF = SHARED_COST_PER_SF;
export const SCORE_BANDS = { feasibleMin: 70, conditionalMin: 40 } as const;

/** GIS percent fields arrive as either 0-1 fractions or 0-100 values. Normalize to 0-100. */
export function toPercent(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v < 0) return null;
  return v <= 1 ? v * 100 : v;
}

export function reportVerdict(score: number): Verdict {
  if (score >= SCORE_BANDS.feasibleMin) return "Feasible";
  if (score >= SCORE_BANDS.conditionalMin) return "Conditional";
  return "Not feasible";
}

const SURVEY_REQUIRED = [
  "Private tree species and exact trunk diameter",
  "Utility capacity and side sewer location",
  "Unpermitted structures",
  "Easements and covenants",
  "Exact grade beyond DEM resolution",
];

const DADU_SECTION = "SMC 23.44.041";

function unverified(section: string): Citation {
  return { section, effective_from: null, status: "unverified", chunk_id: null, quote: null };
}

function num(
  value: number,
  unit: string,
  origin: SourcedNumber["origin"],
  layer: string | null,
  pulledAt: string
): SourcedNumber {
  return {
    value,
    unit,
    origin,
    provenance: layer ? { source_layer: layer, pulled_at: pulledAt, layer_last_edit: null } : null,
  };
}

/**
 * Map today's /api/feasibility output into the FeasibilityReport shape.
 * Every number is sourced from existing GIS fields or the rules engine; nothing is invented.
 * Code citations stay "unverified" until the RAG backend supplies real ones.
 */
export function toReport(row: FeasibilityTableRow, now: Date = new Date()): FeasibilityReport {
  const { result, report, signals } = row;
  const generatedAt = now.toISOString();
  const p = result.parcel;
  const f = result.feasibility;
  const fp = report.daduFootprint;

  const score = num(row.daduScore, "points", "config", null, generatedAt);
  const failing = report.checks.filter((c) => c.status === "fail").map((c) => `${c.label}: ${c.shortNote}`);
  // A hard code prohibition forces Not feasible regardless of score.
  const verdict: Verdict = failing.length > 0 ? "Not feasible" : reportVerdict(row.daduScore);

  const buildableSf = fp
    ? num(fp.buildableSqft, "sf", "far_engine", "ADUniverse feasibility factors", generatedAt)
    : null;
  const cost = fp
    ? num(Math.round(fp.buildableSqft * COST_PER_SF), "USD", "config", null, generatedAt)
    : null;

  const facts: FeasibilityReport["property_facts"] = [];
  const pushFact = (label: string, value: number | null | undefined, unit: string, layer: string) => {
    if (value == null || !Number.isFinite(value)) return;
    facts.push({ label, ...num(value, unit, "postgis", layer, generatedAt) });
  };
  pushFact("Lot area", p?.lotSqft, "sf", "PARCEL_GEO");
  pushFact("Lot width", f?.lotWidth, "ft", "ADUniverse feasibility factors");
  pushFact("Lot depth", f?.lotDepth, "ft", "ADUniverse feasibility factors");
  pushFact("Building area", f?.totalBuildingSqft, "sf", "Building_Outlines_2023");
  pushFact("Lot coverage", toPercent(f?.lotCoveragePercent), "%", "ADUniverse feasibility factors");
  pushFact("Tree canopy", toPercent(f?.treeCanopyPercent), "%", "Seattle canopy data");

  const scenarios: FeasibilityReport["scenarios"] = [];
  const addScenario = (
    id: ScenarioId,
    allowed: boolean | null,
    units: number | null,
    note: string,
    scored: boolean
  ) => {
    scenarios.push({
      id,
      verdict: scored ? verdict : null,
      score: scored ? score : null,
      max_buildable_sf: scored ? buildableSf : null,
      construction_cost_usd: scored ? cost : null,
      units,
      allowed,
      note,
      deductions: [],
      citations: [unverified(DADU_SECTION)],
    });
  };
  addScenario(
    "single_dadu",
    fp != null,
    fp ? 1 : 0,
    fp?.note ?? "Lot does not meet the minimum for a detached accessory dwelling unit.",
    true
  );
  const opt = (needle: string) =>
    report.housingOptions.find((o) => o.type.toLowerCase().includes(needle));
  const middle = opt("fourplex") ?? opt("middle") ?? report.housingOptions[0];
  addScenario("two_dadus", null, null, "Not scored yet. Two-DADU rules are not in this data.", false);
  addScenario("aadu_plus_dadu", null, null, "Not scored yet. Needs basement and garage data from the assessor.", false);
  addScenario(
    "nr_middle_housing",
    middle?.allowed ?? null,
    middle?.estimatedUnits ?? null,
    middle?.note ?? "Not scored yet.",
    false
  );
  addScenario("unit_lot_subdivision", null, null, "Not scored yet. Needs lot dimension and subdivision rules.", false);

  const riskLines = buildRiskLines(signals, report);
  const titles = [...failing, ...riskLines.filter((r) => !failing.includes(r))];
  const risks: FeasibilityReport["risks"] = titles.slice(0, 8).map((title, i) => ({
    rank: i + 1,
    title,
    explanation: "",
    evidence: [],
    citations: [],
    hard_prohibition: i < failing.length,
  }));

  const constraints: FeasibilityReport["site_constraints"] = report.checks.map((c) => ({
    label: c.label,
    detail: `${c.value}. ${c.shortNote}`.trim(),
    evidence: [],
  }));
  if (report.eca.hasIssues) {
    constraints.push({
      label: "Environmentally critical areas",
      detail: report.eca.labels.join(", "),
      evidence: [],
    });
  }

  const best: ScenarioId = "single_dadu";
  const address = p?.address?.trim() || row.address;

  const out: FeasibilityReport = {
    pin: p?.pin ?? "unknown",
    address,
    generated_at: generatedAt,
    summary: {
      verdict,
      best_scenario: best,
      score,
      max_buildable_sf: buildableSf,
      construction_cost_usd: cost,
      headline: row.summarySentence,
    },
    property_facts: facts,
    scenarios,
    site_constraints: constraints,
    risks,
    citations: [unverified(DADU_SECTION)],
    plans: [],
    master_plan_svg: null,
    conflicts: [],
    survey_required: SURVEY_REQUIRED,
    data_pulled: [
      { layer: "PARCEL_GEO", provenance: { source_layer: "PARCEL_GEO", pulled_at: generatedAt, layer_last_edit: null } },
      { layer: "Building_Outlines_2023", provenance: { source_layer: "Building_Outlines_2023", pulled_at: generatedAt, layer_last_edit: null } },
      { layer: "ADUniverse feasibility factors (legacy cross-check)", provenance: { source_layer: "ADUniverse_feasibility_factors", pulled_at: generatedAt, layer_last_edit: null } },
    ],
  };
  return FeasibilityReport.parse(out);
}
