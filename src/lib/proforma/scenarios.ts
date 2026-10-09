/**
 * Base / downside / upside: the presets from content/claims.json (pencil_scenario_presets) applied as deltas to
 * the base inputs. The page lets the user edit the deltas; `applyScenario` is pure.
 */
import claims from "../../../content/claims.json";
import type { ProformaInputs, Scenario } from "./schema";
import { roundCents } from "./money";

export interface ScenarioDelta {
  /** Hard cost per sf, percent change. */
  hardPct: number;
  /** Rents, percent change. */
  rentPct: number;
  /** Exit cap rate, percentage points added. */
  exitCapPts: number;
  /** Permit months added. */
  permitMo: number;
}

const presets = claims.claims.find((c) => c.id === "pencil_scenario_presets")!.value as { downside: ScenarioDelta; upside: ScenarioDelta };

export const SCENARIO_PRESETS: Record<Scenario, ScenarioDelta> = {
  base: { hardPct: 0, rentPct: 0, exitCapPts: 0, permitMo: 0 },
  downside: presets.downside,
  upside: presets.upside,
};

export function applyScenario(i: ProformaInputs, d: ScenarioDelta): ProformaInputs {
  return {
    ...i,
    budget: { ...i.budget, hardPerSf: roundCents(i.budget.hardPerSf * (1 + d.hardPct / 100)) },
    operations: { ...i.operations, units: i.operations.units.map((u) => ({ ...u, rent: roundCents(u.rent * (1 + d.rentPct / 100)) })) },
    growthExit: { ...i.growthExit, exitCapPct: Math.max(0.5, i.growthExit.exitCapPct + d.exitCapPts) },
    timeline: { ...i.timeline, permitMo: Math.max(0, i.timeline.permitMo + d.permitMo) },
  };
}
