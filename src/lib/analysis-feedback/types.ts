import type { DaduVerdict } from "@/lib/feasibility-table-model";
import type { ConfidenceBand } from "@/lib/dashboard-normalize";

/** Serializable context for what the app showed when the user rated it. */
export type AnalysisSnapshotV1 = {
  schema: 1;
  rulesetVersion: string;
  /** Stable id for “same analysis output” (score + key inputs). */
  logicFingerprint: string;
  address: string;
  parcelId: string | null;
  daduScore: number;
  verdict: DaduVerdict;
  verdictLabel: string;
  reportConfidence: number;
  confidenceLabel: string;
  confidenceBand: ConfidenceBand;
  zoning: string | null;
  availableCoverageSqft: number | null;
  lotSizeSqft: number | null;
  headline: string | null;
};

export type FeedbackRating = "up" | "down";

export type AnalysisFeedbackRecord = {
  id: string;
  createdAtIso: string;
  rating: FeedbackRating;
  /** Required when rating is down; empty for thumbs up. */
  negativeReason: string | null;
  snapshot: AnalysisSnapshotV1;
  /** Client build id for correlating with releases. */
  appVersion: string;
};
