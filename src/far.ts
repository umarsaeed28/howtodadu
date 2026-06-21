import { readFileSync } from "node:fs";
import type {
  BonusConditionId,
  FarResult,
  FlaggedConstant,
  FarTier,
  Ruleset,
  Scenario,
  Structure,
} from "./types.js";

export function loadRuleset(path: string): Ruleset {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as Ruleset;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function selectTier(densitySfPerUnit: number, ruleset: Ruleset): FarTier {
  const sorted = [...ruleset.far.tiers].sort((a, b) => b.minSfPerUnit - a.minSfPerUnit);
  for (const tier of sorted) {
    if (densitySfPerUnit >= tier.minSfPerUnit) {
      return tier;
    }
  }
  return sorted[sorted.length - 1];
}

function exemptEntry(ruleset: Ruleset, id: string) {
  return ruleset.far.exemptFromFar.find((e) => e.id === id);
}

function toExemptFlag(
  ruleset: Ruleset,
  id: string,
  value: number
): FlaggedConstant | null {
  const entry = exemptEntry(ruleset, id);
  if (!entry) return null;
  return {
    key: `exempt.${id}`,
    value,
    verified: entry.verified,
    source: entry.source,
    note: entry.note,
  };
}

export function chargeableArea(
  structures: Structure[],
  ruleset: Ruleset
): {
  total: number;
  breakdown: Array<{ id: string; label: string; chargeableSf: number }>;
  exemptFlags: FlaggedConstant[];
} {
  const breakdown: Array<{ id: string; label: string; chargeableSf: number }> = [];
  const exemptFlags: FlaggedConstant[] = [];
  let total = 0;

  for (const st of structures) {
    const accessible = st.accessibleTypeASf ?? 0;
    const commonWall = st.commonWallDeductionSf ?? 0;
    const chargeableSf = round2(Math.max(0, st.aboveGradeSf - accessible - commonWall));
    breakdown.push({ id: st.id, label: st.label, chargeableSf });
    total += chargeableSf;

    if ((st.belowGradeSf ?? 0) > 0) {
      const flag = toExemptFlag(ruleset, "below-grade", st.belowGradeSf ?? 0);
      if (flag) exemptFlags.push(flag);
    }
    if (accessible > 0) {
      const flag = toExemptFlag(ruleset, "accessible-type-a", accessible);
      if (flag) exemptFlags.push(flag);
    }
    if (commonWall > 0) {
      const flag = toExemptFlag(ruleset, "common-walls", commonWall);
      if (flag) exemptFlags.push(flag);
    }
  }

  return { total: round2(total), breakdown, exemptFlags };
}

export function farBudget({
  netLotAreaSf,
  units,
  ruleset,
  bonus,
}: {
  netLotAreaSf: number;
  units: number;
  ruleset: Ruleset;
  bonus?: BonusConditionId;
}): {
  densitySfPerUnit: number;
  tierId: string;
  tierFar: number;
  appliedFar: number;
  bonusApplied: string | null;
  rawBudgetSf: number;
  minFloorSf: number;
  budgetSf: number;
  flags: FlaggedConstant[];
} {
  if (units < 1) {
    throw new Error("units must be >= 1");
  }

  const densitySfPerUnit = round2(netLotAreaSf / units);
  const tier = selectTier(densitySfPerUnit, ruleset);
  let appliedFar = tier.far;
  let bonusApplied: string | null = null;
  const flags: FlaggedConstant[] = [
    {
      key: `tier.${tier.id}`,
      value: tier.far,
      verified: tier.verified,
      source: tier.source,
      note: tier.note,
    },
    {
      key: "minFloorAreaSf",
      value: ruleset.far.minFloorAreaSf.value,
      verified: ruleset.far.minFloorAreaSf.verified,
      source: ruleset.far.minFloorAreaSf.source,
      note: ruleset.far.minFloorAreaSf.note,
    },
  ];

  if (bonus) {
    const bonusRule = ruleset.far.bonuses.find((b) => b.conditionId === bonus);
    if (bonusRule && bonusRule.far > appliedFar) {
      appliedFar = bonusRule.far;
      bonusApplied = bonusRule.id;
      flags.push({
        key: `bonus.${bonusRule.id}`,
        value: bonusRule.far,
        verified: bonusRule.verified,
        source: bonusRule.source,
        note: bonusRule.note,
      });
    }
  }

  const rawBudgetSf = round2(appliedFar * netLotAreaSf);
  const minFloorSf = ruleset.far.minFloorAreaSf.value;
  const budgetSf = round2(Math.max(rawBudgetSf, minFloorSf));

  return {
    densitySfPerUnit,
    tierId: tier.id,
    tierFar: tier.far,
    appliedFar,
    bonusApplied,
    rawBudgetSf,
    minFloorSf,
    budgetSf,
    flags,
  };
}

function dedupeUnverified(flags: FlaggedConstant[]): FlaggedConstant[] {
  const map = new Map<string, FlaggedConstant>();
  for (const flag of flags) {
    if (flag.verified === false) {
      map.set(flag.key, flag);
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function evaluateScenario(scenario: Scenario, ruleset: Ruleset): FarResult {
  const eca = scenario.ecaAreaSf ?? 0;
  const netLotAreaSf = round2(Math.max(0, scenario.grossLotAreaSf - eca));

  const { total: consumedSf, breakdown, exemptFlags } = chargeableArea(
    scenario.structures,
    ruleset
  );

  const budget = farBudget({
    netLotAreaSf,
    units: scenario.units,
    ruleset,
    bonus: scenario.bonus,
  });

  const remainingSf = round2(budget.budgetSf - consumedSf);
  const fits = remainingSf >= 0;

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    units: scenario.units,
    netLotAreaSf,
    densitySfPerUnit: budget.densitySfPerUnit,
    tierId: budget.tierId,
    tierFar: budget.tierFar,
    appliedFar: budget.appliedFar,
    bonusApplied: budget.bonusApplied,
    rawBudgetSf: budget.rawBudgetSf,
    minFloorSf: budget.minFloorSf,
    budgetSf: budget.budgetSf,
    consumedSf,
    remainingSf,
    fits,
    chargeableBreakdown: breakdown,
    unverifiedConstants: dedupeUnverified([...budget.flags, ...exemptFlags]),
    provenance: {
      ruleset: ruleset.rulesetId,
      version: ruleset.version,
      effectiveDate: ruleset.effectiveDate,
      citation: ruleset.far.citation,
    },
  };
}
