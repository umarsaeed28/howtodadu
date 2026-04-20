import { confidenceBandFrom } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { FEEDBACK_RULESET_VERSION } from "./constants";
import type { AnalysisSnapshotV1 } from "./types";

type FingerprintFields = Pick<
  AnalysisSnapshotV1,
  | "rulesetVersion"
  | "daduScore"
  | "zoning"
  | "availableCoverageSqft"
  | "reportConfidence"
  | "verdict"
  | "confidenceBand"
>;

/** Deterministic fingerprint: same inputs → same id for feedback dedup / learning. */
export function computeLogicFingerprint(s: FingerprintFields): string {
  const parts = [
    s.rulesetVersion,
    String(s.daduScore),
    s.zoning ?? "",
    s.availableCoverageSqft != null ? String(Math.round(s.availableCoverageSqft)) : "",
    String(Math.round(s.reportConfidence)),
    s.verdict,
    s.confidenceBand,
  ];
  return parts.join("|");
}

export function buildAnalysisSnapshot(row: FeasibilityTableRow): AnalysisSnapshotV1 {
  const cov = row.report.coverage?.availableSqft ?? null;
  const { band } = confidenceBandFrom(
    row.daduScore,
    row.report.confidence,
    row.report.confidenceLabel,
    cov
  );
  const fpFields: FingerprintFields = {
    rulesetVersion: FEEDBACK_RULESET_VERSION,
    daduScore: row.daduScore,
    zoning: row.zoning,
    availableCoverageSqft: cov,
    reportConfidence: row.report.confidence,
    verdict: row.verdict,
    confidenceBand: band,
  };
  return {
    schema: 1,
    ...fpFields,
    logicFingerprint: computeLogicFingerprint(fpFields),
    address: row.address,
    parcelId: row.result.parcel?.pin?.trim() ?? null,
    verdictLabel: row.verdictLabel,
    confidenceLabel: row.report.confidenceLabel,
    lotSizeSqft: row.lotSizeSqft,
    headline: row.report.headline?.trim() ?? null,
  };
}
