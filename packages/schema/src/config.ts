import { z } from "zod";

export const ScenarioId = z.enum([
  "single_dadu",
  "two_dadus",
  "aadu_plus_dadu",
  "nr_middle_housing",
  "unit_lot_subdivision",
]);
export type ScenarioId = z.infer<typeof ScenarioId>;

/** Mirrors the `config` table. The 12 ft access width is a construction heuristic, not code. */
export const Config = z.object({
  cost_per_sf: z.number().positive().default(350),
  min_access_width_ft: z.number().positive().default(12),
  exceptional_tree_diameter_in: z.number().positive(),
  slope_thresholds: z.object({
    moderate_pct: z.number(),
    steep_pct: z.number(),
  }),
  deductions: z.record(z.string(), z.number()),
  score_bands: z
    .object({ feasible_min: z.number(), conditional_min: z.number() })
    .default({ feasible_min: 70, conditional_min: 40 }),
});
export type Config = z.infer<typeof Config>;

export const Rule = z.object({
  zone: z.string(),
  rule_key: z.string(),
  value: z.number(),
  unit: z.string(),
  smc_section: z.string(),
  effective_from: z.iso.date(),
  effective_to: z.iso.date().nullable(),
});
export type Rule = z.infer<typeof Rule>;
