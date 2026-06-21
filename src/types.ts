export interface FlaggedConstant {
  key: string;
  value: number;
  verified: boolean;
  source: string;
  note?: string;
}

export interface FarTier {
  id: string;
  minSfPerUnit: number;
  far: number;
  verified: boolean;
  source: string;
  note?: string;
}

export interface FarBonus {
  id: string;
  conditionId: BonusConditionId;
  far: number;
  verified: boolean;
  source: string;
  note?: string;
}

export type BonusConditionId =
  | "stackedFlats"
  | "frequentTransitGreen"
  | "stackedFlatsGreenOrSchool";

export interface RulesetFar {
  citation: string;
  appliesTo: string;
  previousRule: string;
  minFloorAreaSf: FlaggedConstant & { value: number };
  tiers: FarTier[];
  bonuses: FarBonus[];
  exemptFromFar: Array<{
    id: string;
    verified: boolean;
    source: string;
    note?: string;
  }>;
}

export interface Ruleset {
  rulesetId: string;
  version: string;
  effectiveDate: string;
  jurisdiction: string;
  sourceLegislation: string;
  disclaimer: string;
  far: RulesetFar;
  rsl: {
    far: FlaggedConstant & { value: number };
  };
}

export interface Structure {
  id: string;
  label: string;
  kind: "existing" | "proposed";
  aboveGradeSf: number;
  belowGradeSf?: number;
  accessibleTypeASf?: number;
  commonWallDeductionSf?: number;
}

export interface Scenario {
  id: string;
  label: string;
  grossLotAreaSf: number;
  ecaAreaSf?: number;
  units: number;
  structures: Structure[];
  bonus?: BonusConditionId;
}

export interface ChargeableBreakdownItem {
  id: string;
  label: string;
  chargeableSf: number;
}

export interface FarResult {
  scenarioId: string;
  label: string;
  units: number;
  netLotAreaSf: number;
  densitySfPerUnit: number;
  tierId: string;
  tierFar: number;
  appliedFar: number;
  bonusApplied: string | null;
  rawBudgetSf: number;
  minFloorSf: number;
  budgetSf: number;
  consumedSf: number;
  remainingSf: number;
  fits: boolean;
  chargeableBreakdown: ChargeableBreakdownItem[];
  unverifiedConstants: FlaggedConstant[];
  provenance: {
    ruleset: string;
    version: string;
    effectiveDate: string;
    citation: string;
  };
}
