import { parcelZoningLabel, type FeasibilityResult } from "./feasibility";
import type { ADUReport } from "./adu-analysis";
import {
  buildFeasibilityTableRow,
  type FeasibilityTableRow,
} from "./feasibility-table-model";

/**
 * Lightweight row for tables up to ~5k rows (no heavy nested GIS objects in memory).
 * Detail payload loaded on expand via cache or refetch.
 */
export type AnalysisStatus = "analyzed" | "failed";

export type ConfidenceBand = "strong" | "medium" | "low" | "needs_review";

export interface DashboardPropertySlim {
  id: string;
  address: string;
  streetLine: string;
  status: AnalysisStatus;
  errorMessage?: string;
  /** Neighborhood label (urban village, ZIP, or city) */
  neighborhood: string;
  /** Display price — assessed total until MLS is integrated */
  priceDisplay: string;
  assessedValueNum: number | null;
  bedsDisplay: string;
  bathsDisplay: string;
  /** Building floor area from city records when available (not true interior finished sq ft) */
  interiorSqftDisplay: string;
  interiorSqftNum: number | null;
  lotSizeSqft: number | null;
  zoning: string | null;
  zip: string | null;
  daduScore: number;
  /** Short label for chips */
  confidenceBand: ConfidenceBand;
  confidenceShort: string;
  uwClosenessDisplay: string;
  keyInsight: string;
  verdictLabel: string;
  summarySentence: string;
  pin: string | null;
  analyzedAtIso: string;
}

function normalizeId(address: string): string {
  return address.trim().toLowerCase();
}

function streetFromAddress(address: string): string {
  return address.split(/,\s*/)[0]?.trim() || address;
}

function assessedNum(result: FeasibilityResult): number | null {
  const land = result.parcel?.landValue;
  const imp = result.parcel?.improvementValue;
  if (land == null && imp == null) return null;
  const t = (land ?? 0) + (imp ?? 0);
  return Number.isFinite(t) && t > 0 ? t : null;
}

function assessedDisplay(result: FeasibilityResult): string {
  const n = assessedNum(result);
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function neighborhoodLabel(result: FeasibilityResult): string {
  const uv = result.parcel?.urbanVillage?.trim();
  if (uv) return uv;
  const z = result.parcel?.zip?.trim();
  if (z) return `ZIP ${z}`;
  return "Seattle";
}

function uwCloseness(result: FeasibilityResult): string {
  const uv = result.parcel?.urbanVillage?.trim();
  if (uv) return "In urban village";
  return "Outside UV";
}

/**
 * Map numeric score + model confidence into four UX bands (not color-only).
 * Avoids labeling most rows as top tier: "strong" requires a high combined score and solid model confidence.
 * Tight available coverage (<700 sf) cannot be "strong" (pairs with score cap in {@link buildFeasibilityTableRow}).
 */
export function confidenceBandFrom(
  daduScore: number,
  reportConfidence: number,
  _reportLabel: string,
  availableCoverageSqft?: number | null
): { band: ConfidenceBand; short: string } {
  const modelLow = reportConfidence < 45;
  const tightCoverage =
    availableCoverageSqft != null &&
    Number.isFinite(availableCoverageSqft) &&
    availableCoverageSqft < 700;

  if (daduScore < 38 || modelLow) {
    return { band: "low", short: "Low" };
  }

  if (tightCoverage) {
    if (daduScore >= 52) return { band: "medium", short: "Medium" };
    return { band: "needs_review", short: "Needs review" };
  }

  if (daduScore >= 80 && reportConfidence >= 72) {
    return { band: "strong", short: "Strong" };
  }

  if (daduScore >= 52 && daduScore < 72) {
    return { band: "needs_review", short: "Needs review" };
  }

  if (daduScore >= 72) {
    return { band: "medium", short: "Medium" };
  }

  if (daduScore >= 52) {
    return { band: "medium", short: "Medium" };
  }

  return { band: "needs_review", short: "Needs review" };
}

export function buildDashboardPropertySlim(
  result: FeasibilityResult,
  report: ADUReport
): DashboardPropertySlim {
  const full = buildFeasibilityTableRow(result, report);
  const f = result.feasibility;
  const tot = f?.totalBuildingSqft;
  const interiorNum = tot != null && Number.isFinite(tot) ? Math.round(tot) : null;
  const interiorDisp =
    interiorNum != null ? `${interiorNum.toLocaleString()} sq ft` : "—";

  const { band, short } = confidenceBandFrom(
    full.daduScore,
    report.confidence,
    report.confidenceLabel,
    report.coverage?.availableSqft ?? null
  );

  const address = result.parcel?.address?.trim() || "Unknown address";

  return {
    id: normalizeId(address),
    address,
    streetLine: streetFromAddress(address),
    status: "analyzed",
    neighborhood: neighborhoodLabel(result),
    priceDisplay: assessedDisplay(result),
    assessedValueNum: assessedNum(result),
    bedsDisplay: "—",
    bathsDisplay: "—",
    interiorSqftDisplay: interiorDisp,
    interiorSqftNum: interiorNum,
    lotSizeSqft: result.parcel?.lotSqft ?? null,
    zoning: parcelZoningLabel(result.parcel),
    zip: result.parcel?.zip?.trim() ?? null,
    daduScore: full.daduScore,
    confidenceBand: band,
    confidenceShort: short,
    uwClosenessDisplay: uwCloseness(result),
    keyInsight: full.keyInsight,
    verdictLabel: full.verdictLabel,
    summarySentence: full.summarySentence,
    pin: result.parcel?.pin ?? null,
    analyzedAtIso: new Date().toISOString(),
  };
}

export function buildDashboardPropertyFailed(
  address: string,
  error: string
): DashboardPropertySlim {
  const streetLine = streetFromAddress(address);
  return {
    id: normalizeId(address),
    address,
    streetLine,
    status: "failed",
    errorMessage: error,
    neighborhood: "—",
    priceDisplay: "—",
    assessedValueNum: null,
    bedsDisplay: "—",
    bathsDisplay: "—",
    interiorSqftDisplay: "—",
    interiorSqftNum: null,
    lotSizeSqft: null,
    zoning: null,
    zip: null,
    daduScore: 0,
    confidenceBand: "low",
    confidenceShort: "—",
    uwClosenessDisplay: "—",
    keyInsight: error.slice(0, 120),
    verdictLabel: "Failed",
    summarySentence: error,
    pin: null,
    analyzedAtIso: new Date().toISOString(),
  };
}

/** Rebuild full table row for expanded panel (client has result + report). */
export function toDetailTableRow(
  result: FeasibilityResult,
  report: ADUReport
): FeasibilityTableRow {
  return buildFeasibilityTableRow(result, report);
}
