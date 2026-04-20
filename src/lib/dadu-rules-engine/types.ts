/** Parsed semi-structured ADUniverse-style parcel input. */
export type LotTypeKind = "interior" | "corner" | "alley" | "alley_corner" | "unknown";

export interface ParsedParcel {
  address: string | null;
  parcelId: string | null;
  zoning: string | null;
  lotSizeSqft: number | null;
  lotCoveragePercent: number | null;
  availableCoverageSqft: number | null;
  lotWidthFt: number | null;
  lotDepthFt: number | null;
  lotType: LotTypeKind;
  hasAlleyAccess: boolean;
  /** Explicit line or inferred from lot type / access wording */
  hasSideAccess: boolean | null;
  hasDetachedGarage: boolean;
  garageSqft: number | null;
  treeCanopyPercent: number | null;
  hasEcaIssue: boolean;
  shorelineFlag: boolean | null;
  /** Optional: "nearby ADUs" or density signal */
  nearbyAdusPresent: boolean | null;
}

export type RatingLetter = "A" | "B" | "C" | "D" | "F";

export interface ScoreFactorLine {
  key: string;
  label: string;
  delta: number;
  detail: string;
}

export interface DaduRulesScoreResult {
  score: number;
  rating: RatingLetter;
  ratingLabel: string;
  factors: Record<string, string>;
  factorLines: ScoreFactorLine[];
  flags: string[];
  missingFields: string[];
  /** Effective ceiling from hard constraints (100 if none) */
  hardCapCeiling: number;
}
