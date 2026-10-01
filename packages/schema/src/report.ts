import { z } from "zod";
import { Citation, Provenance, SourcedNumber } from "./provenance";
import { ScenarioId } from "./config";

export const Verdict = z.enum(["Feasible", "Conditional", "Not feasible"]);
export type Verdict = z.infer<typeof Verdict>;

export const Risk = z.object({
  rank: z.number().int().min(1),
  title: z.string(),
  explanation: z.string(), // prose only, no figures that are not in `evidence`
  evidence: z.array(SourcedNumber),
  citations: z.array(Citation),
  hard_prohibition: z.boolean(),
});

export const Scenario = z.object({
  id: ScenarioId,
  verdict: Verdict.nullable(), // null = not scored yet (no sourced score exists for this scenario)
  score: SourcedNumber.nullable(),
  max_buildable_sf: SourcedNumber.nullable(),
  construction_cost_usd: SourcedNumber.nullable(), // buildable sf x cost_per_sf, construction only
  units: z.number().int().nullable(),
  allowed: z.boolean().nullable(),
  note: z.string(),
  deductions: z.array(z.object({ key: z.string(), points: z.number(), reason: z.string() })),
  citations: z.array(Citation),
});

export const PlanMatch = z.object({
  plan_id: z.string(),
  name: z.string(),
  footprint_sf: z.number(),
  fits: z.boolean(),
});

export const SourceConflict = z.object({
  topic: z.string(),
  one_line: z.string(), // current SMC vs ADUniverse, SMC wins
  smc_citation: Citation,
});

export const FeasibilityReport = z.object({
  pin: z.string(),
  address: z.string(),
  generated_at: z.iso.datetime(),
  summary: z.object({
    verdict: Verdict,
    best_scenario: ScenarioId,
    score: SourcedNumber,
    max_buildable_sf: SourcedNumber.nullable(),
    construction_cost_usd: SourcedNumber.nullable(),
    headline: z.string(),
  }),
  property_facts: z.array(SourcedNumber.extend({ label: z.string() })),
  scenarios: z.array(Scenario).min(1),
  site_constraints: z.array(z.object({ label: z.string(), detail: z.string(), evidence: z.array(SourcedNumber) })),
  risks: z.array(Risk),
  citations: z.array(Citation),
  plans: z.array(PlanMatch),
  master_plan_svg: z.string().nullable(), // rendered by @pencil/site-plan, never by the LLM
  conflicts: z.array(SourceConflict),
  survey_required: z.array(z.string()), // known gaps
  data_pulled: z.array(z.object({ layer: z.string(), provenance: Provenance })),
});
export type FeasibilityReport = z.infer<typeof FeasibilityReport>;
