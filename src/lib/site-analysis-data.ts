/**
 * Architectural site analysis data model.
 * Derived from FeasibilityResult + ADUReport for the site map section.
 * Plain language for UI; GIS-driven fields noted where data will connect.
 */

import type { FeasibilityResult } from "./feasibility";
import type { ADUReport } from "./adu-analysis";

export type SlopeCondition =
  | "mostly_flat"
  | "moderate_slope"
  | "sloped_edge"
  | "steep_slope"
  | "unknown";

export type TreeCondition =
  | "limited_canopy"
  | "moderate_canopy"
  | "canopy_review_needed"
  | "heavy_canopy"
  | "unknown";

export type AccessStatus = "alley" | "corner_workable" | "side_workable" | "side_tight" | "limited" | "unknown";

export interface SiteAnalysisCard {
  id: string;
  label: string;
  status: string;
  explanation: string;
}

export interface SiteAnalysisData {
  /** Always present when lot exists */
  parcelOutline: boolean;
  /** Simplified buildable zone / setback envelope – GIS: DADU setback from lot edges */
  buildableEnvelope: boolean;
  /** Main house, detached garage, other structures – GIS: buildings[], feasibility.totalBuildingSqft */
  structures: { mainHouse: boolean; garage: boolean; other: boolean };
  /** Slope/terrain – GIS: feasibility.steepSlopePercent, contours */
  slopeCondition: SlopeCondition;
  slopeExplanation: string;
  /** Access – GIS: feasibility.hasAlley, lotType, access.sideYardFt */
  accessCondition: AccessStatus;
  accessExplanation: string;
  /** Trees – GIS: feasibility.treeCanopyPercent, sitePlan.trees[] */
  treeCondition: TreeCondition;
  treeExplanation: string;
  /** Privacy/adjacency – GIS: lotType, adjacentParcels */
  privacyCondition: "close_side" | "open_rear" | "mixed" | "unknown";
  privacyExplanation: string;
  /** Street/entry – GIS: hasAlley, streets[], lotType */
  streetContext: string;
  streetExplanation: string;
  /** Sun (Seattle solar) – computed from latitude */
  sunAnalysis: SiteAnalysisCard;
  /** Wind (prevailing S/SSW) – NOAA regional */
  windAnalysis: SiteAnalysisCard;
  /** Items for full feasibility review */
  constraintsToReview: string[];
}

/** Plain-language slope labels for UI */
export const SLOPE_LABELS: Record<SlopeCondition, string> = {
  mostly_flat: "Mostly flat",
  moderate_slope: "Moderate slope",
  sloped_edge: "Sloped edge",
  steep_slope: "Steep slope",
  unknown: "Unknown",
};

/** Plain-language tree labels for UI */
export const TREE_LABELS: Record<TreeCondition, string> = {
  limited_canopy: "Limited canopy",
  moderate_canopy: "Moderate canopy",
  canopy_review_needed: "Canopy review needed",
  heavy_canopy: "Heavy canopy",
  unknown: "Unknown",
};

function slopeFromFeasibility(steepPct: number | null): SlopeCondition {
  if (steepPct == null) return "unknown";
  if (steepPct < 0.05) return "mostly_flat";
  if (steepPct < 0.15) return "moderate_slope";
  if (steepPct < 0.25) return "sloped_edge";
  return "steep_slope";
}

function slopeExplanation(cond: SlopeCondition): string {
  switch (cond) {
    case "mostly_flat":
      return "Lot appears generally flat; minimal grading expected.";
    case "moderate_slope":
      return "Moderate slope may affect siting; early planning should consider drainage and foundation.";
    case "sloped_edge":
      return "Sloped edges may limit buildable area; verify setbacks and contours during design.";
    case "steep_slope":
      return "Steep slope likely affects placement and cost; full slope analysis recommended.";
    default:
      return "Terrain data not available; verify during site visit.";
  }
}

function treeFromFeasibility(canopyPct: number | null): TreeCondition {
  if (canopyPct == null) return "unknown";
  const p = canopyPct * 100;
  if (p < 15) return "limited_canopy";
  if (p < 30) return "moderate_canopy";
  if (p < 50) return "canopy_review_needed";
  return "heavy_canopy";
}

function treeExplanation(cond: TreeCondition): string {
  switch (cond) {
    case "limited_canopy":
      return "Limited tree coverage; siting should be straightforward.";
    case "moderate_canopy":
      return "Moderate tree coverage may affect placement and solar access.";
    case "canopy_review_needed":
      return "Tree canopy may affect siting; review protected trees and removal requirements.";
    case "heavy_canopy":
      return "Heavy canopy; tree survey and SDCI review recommended.";
    default:
      return "Tree data not available; verify during site visit.";
  }
}

function accessFromReport(report: ADUReport | null): AccessStatus {
  const access = report?.access;
  if (!access) return "unknown";
  switch (access.type) {
    case "alley":
      return "alley";
    case "corner":
      return "corner_workable";
    case "side":
      return access.adequate ? "side_workable" : "side_tight";
    case "none":
      return "limited";
    default:
      return "unknown";
  }
}

function accessExplanation(status: AccessStatus, report: ADUReport | null): string {
  const note = report?.access?.note;
  if (note) return note;
  switch (status) {
    case "alley":
      return "Alley access provides construction and rear yard reach.";
    case "corner_workable":
      return "Corner lot offers flexible access options.";
    case "side_workable":
      return "Side access appears workable for construction and utilities.";
    case "side_tight":
      return "Side yard may be tight; verify width during site visit.";
    case "limited":
      return "Access may be constrained; full assessment needed.";
    default:
      return "Verify access conditions during site visit.";
  }
}

function privacyFromLot(lotType: string | null, hasAdjacents: boolean): "close_side" | "open_rear" | "mixed" | "unknown" {
  if (!lotType) return "unknown";
  const t = lotType.toLowerCase();
  if (t.includes("corner")) return "open_rear";
  if (t.includes("interior") && hasAdjacents) return "close_side";
  return "mixed";
}

function privacyExplanation(cond: string): string {
  switch (cond) {
    case "close_side":
      return "Adjacency is tighter on side edges; consider privacy in early design.";
    case "open_rear":
      return "Rear yard looks more flexible for placement and privacy.";
    case "mixed":
      return "Mixed adjacency; review neighboring conditions during design.";
    default:
      return "Verify neighboring conditions during site visit.";
  }
}

function streetContext(result: FeasibilityResult, report: ADUReport | null): string {
  const f = result.feasibility;
  const hasAlley = f?.hasAlley ?? false;
  const lotType = f?.lotType ?? "interior";
  if (hasAlley) return "Alley present; rear access and service entry available.";
  if (lotType?.toLowerCase().includes("corner")) return "Corner lot; street frontage on two sides.";
  return "Interior lot; primary entry from front street.";
}

function streetExplanation(ctx: string): string {
  return ctx;
}

export function deriveSiteAnalysis(
  result: FeasibilityResult,
  report: ADUReport | null
): SiteAnalysisData {
  const f = result.feasibility;
  const sitePlan = result.sitePlan;
  const slopeCond = slopeFromFeasibility(f?.steepSlopePercent ?? null);
  const treeCond = treeFromFeasibility(f?.treeCanopyPercent ?? null);
  const accessCond = accessFromReport(report);
  const privacyCond = privacyFromLot(f?.lotType ?? null, (sitePlan?.adjacentParcels?.length ?? 0) > 0);
  const streetCtx = streetContext(result, report);

  const constraints: string[] = [];
  if ((report?.access?.sideYardFt ?? null) != null) constraints.push("Access width verification");
  if (treeCond === "canopy_review_needed" || treeCond === "heavy_canopy") constraints.push("Tree review if needed");
  constraints.push("Exact setbacks and code review");
  if (f?.wetlandPercent != null && f.wetlandPercent > 0) constraints.push("Utilities or drainage review if available");
  constraints.push("Privacy and neighboring conditions");

  return {
    parcelOutline: true,
    buildableEnvelope: Boolean(report?.daduFootprint),
    structures: {
      mainHouse: (f?.totalBuildingSqft ?? 0) - (f?.detachedGarageSqft ?? 0) > 0,
      garage: (f?.detachedGarageCount ?? 0) > 0,
      other: false, // GIS: other structures from buildings[]
    },
    slopeCondition: slopeCond,
    slopeExplanation: slopeExplanation(slopeCond),
    accessCondition: accessCond,
    accessExplanation: accessExplanation(accessCond, report),
    treeCondition: treeCond,
    treeExplanation: treeExplanation(treeCond),
    privacyCondition: privacyCond,
    privacyExplanation: privacyExplanation(privacyCond),
    streetContext: streetCtx,
    streetExplanation: streetExplanation(streetCtx),
    sunAnalysis: {
      id: "sun",
      label: "Solar orientation",
      status: "Seattle 47.6°N",
      explanation: "Summer sun high, winter low; orient living spaces for daylight.",
    },
    windAnalysis: {
      id: "wind",
      label: "Wind",
      status: "S/SSW prevailing",
      explanation: "Prevailing winds from south; consider outdoor spaces and ventilation.",
    },
    constraintsToReview: constraints,
  };
}
