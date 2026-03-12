import type { FeasibilityResult } from "./feasibility";
import type { ADUReport } from "./adu-analysis";

/* ── Signal types for deal scoring ── */

export type ScoreCategory =
  | "Exceptional candidate"
  | "Strong candidate"
  | "Promising but needs review"
  | "Mixed signals"
  | "High risk"
  | "Weak candidate";

export type TerrainRisk = "Low terrain risk" | "Moderate terrain risk" | "High terrain risk";

export type BackyardRating = "High" | "Moderate" | "Low";

export type AccessRating = "Excellent" | "Good" | "Fair" | "Constrained";

export type AcquisitionRecommendation = "Pursue" | "Investigate" | "Caution" | "Pass";

export type ConfidenceLevel = "High confidence" | "Moderate confidence" | "Low confidence";

export interface SiteSignals {
  zoningScore: number; // 0-100
  lotSizeScore: number; // 0-100
  terrainScore: number; // 0-100 (higher = lower risk)
  backyardScore: number; // 0-100
  accessScore: number; // 0-100
  contextScore: number; // 0-100 (density, neighborhood)
}

export interface FactorBreakdownItem {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  explanation: string;
}

export interface DealScoreResult {
  score: number;
  scoreCategory: ScoreCategory;
  interpretation: string;
  factorBreakdown?: FactorBreakdownItem[];
}

export interface SiteOverview {
  address: string;
  likelyDevelopmentType: string;
  lotSizeSqft: number;
  terrainRating: TerrainRisk;
  backyardRating: BackyardRating;
  accessSignal: AccessRating;
}

export interface DealSignals {
  siteOverview: SiteOverview;
  lotSize: { sqft: number; score: number };
  terrainSignal: { rating: TerrainRisk; score: number; description: string };
  backyardSignal: { rating: BackyardRating; score: number; description: string };
  accessSignal: { rating: AccessRating; score: number; description: string };
  contextSignal: { score: number; description: string };
  risks: string[];
  confidence: ConfidenceLevel;
}

/* ── Weights for scoring (must sum to 100) ── */

const WEIGHTS = {
  zoning: 30,
  lotSize: 20,
  terrain: 15,
  backyard: 15,
  access: 10,
  context: 10,
};

/* ── Score bands (investor acquisition framing) ── */
/* 90–100 Exceptional | 80–89 Strong | 65–79 Promising | 50–64 Mixed | 35–49 High risk | 0–34 Weak */

function getScoreBand(rounded: number): { category: ScoreCategory; interpretation: string } {
  if (rounded >= 90) {
    return {
      category: "Exceptional candidate",
      interpretation: "Strong early candidate for a backyard DADU. Worth detailed review.",
    };
  }
  if (rounded >= 80) {
    return {
      category: "Strong candidate",
      interpretation: "Strong early candidate for a backyard DADU. Worth a closer look.",
    };
  }
  if (rounded >= 65) {
    return {
      category: "Promising but needs review",
      interpretation: "Promising acquisition target with a few constraints to verify.",
    };
  }
  if (rounded >= 50) {
    return {
      category: "Mixed signals",
      interpretation: "Mixed signals. Some factors support development; others need careful review.",
    };
  }
  if (rounded >= 35) {
    return {
      category: "High risk",
      interpretation: "Higher risk site that needs careful diligence before purchase.",
    };
  }
  return {
    category: "Weak candidate",
    interpretation: "This property does not appear to be a strong DADU investment candidate.",
  };
}

/* ── calculateDealScore ── */

export function calculateDealScore(
  siteSignals: SiteSignals,
  options?: { includeBreakdown?: boolean }
): DealScoreResult {
  const factors = [
    { key: "zoning" as const, name: "Zoning compatibility", weight: WEIGHTS.zoning, score: siteSignals.zoningScore },
    { key: "lotSize" as const, name: "Lot size", weight: WEIGHTS.lotSize, score: siteSignals.lotSizeScore },
    { key: "terrain" as const, name: "Terrain", weight: WEIGHTS.terrain, score: siteSignals.terrainScore },
    { key: "backyard" as const, name: "Backyard buildability", weight: WEIGHTS.backyard, score: siteSignals.backyardScore },
    { key: "access" as const, name: "Access feasibility", weight: WEIGHTS.access, score: siteSignals.accessScore },
    { key: "context" as const, name: "Contextual suitability", weight: WEIGHTS.context, score: siteSignals.contextScore },
  ];

  const score =
    (siteSignals.zoningScore * WEIGHTS.zoning) / 100 +
    (siteSignals.lotSizeScore * WEIGHTS.lotSize) / 100 +
    (siteSignals.terrainScore * WEIGHTS.terrain) / 100 +
    (siteSignals.backyardScore * WEIGHTS.backyard) / 100 +
    (siteSignals.accessScore * WEIGHTS.access) / 100 +
    (siteSignals.contextScore * WEIGHTS.context) / 100;

  const rounded = Math.round(Math.max(0, Math.min(100, score)));
  const { category, interpretation } = getScoreBand(rounded);

  const factorBreakdown = options?.includeBreakdown
    ? factors.map((f) => ({
        name: f.name,
        weight: f.weight,
        score: f.score,
        contribution: Math.round((f.score / 100) * f.weight),
        explanation:
          f.key === "zoning"
            ? f.score >= 70 ? "DADU-eligible zone." : "Zone may limit DADU potential."
            : f.key === "lotSize"
              ? f.score >= 70 ? "Lot size supports development." : "Lot may constrain footprint."
              : f.key === "terrain"
                ? f.score >= 70 ? "Terrain appears manageable." : "Slope may increase cost."
                : f.key === "backyard"
                  ? f.score >= 70 ? "Rear yard has buildable space." : "Limited rear yard."
                  : f.key === "access"
                    ? f.score >= 70 ? "Access adequate for construction." : "Access needs review."
                    : "Neighborhood context considered.",
      }))
    : undefined;

  return { score: rounded, scoreCategory: category, interpretation, factorBreakdown };
}

/* ── Combined score: Deal Score (60%) + ADU feasibility (40%) ── */

export function calculateCombinedScore(
  dealScore: number,
  aduConfidence: number,
  options?: { includeBreakdown?: boolean }
): DealScoreResult {
  const combined = dealScore * 0.6 + aduConfidence * 0.4;
  const rounded = Math.round(Math.max(0, Math.min(100, combined)));
  const { category, interpretation } = getScoreBand(rounded);
  return {
    score: rounded,
    scoreCategory: category,
    interpretation,
    factorBreakdown: options?.includeBreakdown ? [] : undefined,
  };
}

/* ── getDealScreenSignals: alias for investor-facing deal screening ── */
/* Connects existing ADUniverse feasibility data to deal screening layer */

export const getDealScreenSignals = getSeattleDealSignals;

/*
 * RISK ASSESSMENT — Deal Screening Tool
 *
 * 1. Users may overtrust preliminary results
 *    Mitigation: "Preliminary" labels, confidence indicators, preserve original feasibility details
 *
 * 2. Public data may be incomplete or outdated
 *    Mitigation: ADUniverse disclaimer, "verify" language in risks, recommend professional review
 *
 * 3. GIS visuals can overwhelm users
 *    Mitigation: Concise summaries on every chart/map, progressive disclosure for dense sections
 *
 * 4. Mobile may become too dense
 *    Mitigation: Collapsible accordions for Detailed Feasibility, stacked cards, swipeable snapshots
 */

/**
 * Unified result shape for acquisition screening.
 * getExistingFeasibilityData = fetchFeasibility + generateADUReport (existing flow).
 * dealSignals = getDealScreenSignals(result, report).
 * dealScore = calculateDealScore(siteSignals) + calculateCombinedScore(deal, adu).
 */
export interface UnifiedScreeningResult {
  address: string;
  parcelInfo: FeasibilityResult["parcel"];
  existingFeasibility: ADUReport;
  dealSignals: DealSignals;
  dealScore: DealScoreResult;
  recommendation: AcquisitionRecommendation;
  aiSummary: DealInterpretation;
  risks: string[];
  confidence: ConfidenceLevel;
}

/* ── Acquisition recommendation from score ── */

export function getAcquisitionRecommendation(score: number): AcquisitionRecommendation {
  if (score >= 80) return "Pursue";
  if (score >= 65) return "Investigate";
  if (score >= 50) return "Caution";
  return "Pass";
}

/* ── AI-style deal interpretation (rule-based, placeholder for future LLM) ── */

export interface DealInterpretation {
  opportunity: string;
  risks: string;
  recommendation: string;
}

export function generateDealInterpretation(
  signals: DealSignals,
  scoreResult: DealScoreResult
): DealInterpretation {
  const rec = getAcquisitionRecommendation(scoreResult.score);

  let opportunity: string;
  if (scoreResult.score >= 70) {
    opportunity = `DADU-eligible zone with strong potential. ${signals.siteOverview.accessSignal} access and ${signals.siteOverview.backyardRating.toLowerCase()} backyard buildability support development.`;
  } else if (scoreResult.score >= 50) {
    opportunity = `This property may support a DADU. Lot size and zoning are favorable, but some factors need verification.`;
  } else {
    opportunity = `Limited opportunity. Several constraints may make this a difficult or costly DADU project.`;
  }

  const risks =
    signals.risks.length > 0
      ? signals.risks.join(". ") + "."
      : "No major risk flags identified. A site visit would confirm.";

  let recommendation: string;
  if (rec === "Pursue") recommendation = "Worth a detailed review and site visit.";
  else if (rec === "Investigate") recommendation = "Schedule a feasibility review before deciding.";
  else if (rec === "Caution") recommendation = "Proceed only if you are prepared for additional complexity or cost.";
  else recommendation = "Consider other properties unless you have specific reasons to pursue this one.";

  return { opportunity, risks, recommendation };
}

/* ── Derive terrain risk from feasibility data ── */

function getTerrainRating(steepSlopePercent: number | null): TerrainRisk {
  const pct = steepSlopePercent ?? 0;
  if (pct < 0.05) return "Low terrain risk";
  if (pct < 0.25) return "Moderate terrain risk";
  return "High terrain risk";
}

function getTerrainScore(steepSlopePercent: number | null): number {
  const pct = steepSlopePercent ?? 0;
  if (pct < 0.05) return 90;
  if (pct < 0.15) return 70;
  if (pct < 0.25) return 50;
  if (pct < 0.4) return 30;
  return 10;
}

/* ── Derive backyard buildability ── */

function getBackyardRating(
  lotSqft: number,
  coverageFrac: number,
  lotWidth: number
): { rating: BackyardRating; score: number } {
  const availSqft = Math.max(0, (0.35 - coverageFrac) * lotSqft);
  const minUsable = 400;
  if (availSqft >= 600 && lotWidth >= 25) return { rating: "High", score: 85 };
  if (availSqft >= minUsable && lotWidth >= 20) return { rating: "Moderate", score: 60 };
  return { rating: "Low", score: 30 };
}

/* ── Derive access rating ── */

function getAccessRating(
  accessType: "alley" | "corner" | "side" | "none",
  adequate: boolean
): { rating: AccessRating; score: number } {
  if (accessType === "alley") return { rating: "Excellent", score: 95 };
  if (accessType === "corner") return { rating: "Excellent", score: 90 };
  if (accessType === "side" && adequate) return { rating: "Good", score: 75 };
  if (accessType === "side" && !adequate) return { rating: "Fair", score: 45 };
  return { rating: "Constrained", score: 15 };
}

/* ── getSeattleDealSignals: aggregate FeasibilityResult + ADUReport into deal signals ── */

export function getSeattleDealSignals(
  result: FeasibilityResult,
  report: ADUReport
): DealSignals {
  const parcel = result.parcel;
  const feasibility = result.feasibility;
  const lotSqft = parcel?.lotSqft ?? 0;
  const coverageFrac = (feasibility?.lotCoveragePercent ?? 0) / 100;
  const lotWidth = feasibility?.lotWidth ?? 0;
  const steepSlope = feasibility?.steepSlopePercent ?? 0;

  /* Zoning: DADU-eligible zones get high score */
  const zoneFamily = parcel?.zoning?.slice(0, 2) ?? parcel?.zoningCategory?.slice(0, 2) ?? "";
  const zoningOk = ["NR", "RSL", "LR", "SF"].some((z) => zoneFamily.toUpperCase().startsWith(z));
  const zoningScore = zoningOk ? 90 : lotSqft > 0 ? 30 : 0;

  /* Lot size */
  const lotSizeScore = lotSqft >= 5000 ? 95 : lotSqft >= 4000 ? 85 : lotSqft >= 3200 ? 70 : lotSqft >= 2500 ? 40 : 15;

  /* Terrain */
  const terrainRating = getTerrainRating(steepSlope);
  const terrainScoreVal = getTerrainScore(steepSlope);

  /* Backyard */
  const backyard = getBackyardRating(lotSqft, coverageFrac, lotWidth);

  /* Access */
  const access = getAccessRating(report.access.type, report.access.adequate);

  /* Context: nearby ADUs, urban village */
  const nearby = (report.nearby?.[0]?.count ?? 0) + (report.nearby?.[1]?.count ?? 0);
  const contextScore = nearby >= 3 ? 75 : nearby >= 1 ? 65 : 50;

  /* Site overview */
  const likelyType = report.housingOptions?.find((o) => o.type === "DADU" && o.allowed)
    ? "DADU"
    : report.housingOptions?.find((o) => o.allowed)
      ? report.housingOptions.find((o) => o.allowed)?.type ?? "Residential"
      : "Unclear";

  /* Risks */
  const risks: string[] = [];
  if (report.access.type === "none" || !report.access.adequate) risks.push("Access uncertainty");
  if (terrainRating === "High terrain risk" || terrainRating === "Moderate terrain risk")
    risks.push("Slope complexity");
  if (lotSqft < 4000) risks.push("Tight lot");
  if (report.eca.hasIssues) risks.push("Environmental constraints");
  if (backyard.rating === "Low") risks.push("Layout constraints");
  const riskList = risks.slice(0, 4);

  /* Confidence from report */
  let confidence: ConfidenceLevel;
  const conf = report.confidence ?? 50;
  if (conf >= 75) confidence = "High confidence";
  else if (conf >= 50) confidence = "Moderate confidence";
  else confidence = "Low confidence";

  const siteSignals: SiteSignals = {
    zoningScore,
    lotSizeScore,
    terrainScore: terrainScoreVal,
    backyardScore: backyard.score,
    accessScore: access.score,
    contextScore,
  };

  const dealScore = calculateDealScore(siteSignals);

  return {
    siteOverview: {
      address: parcel?.address ?? "Unknown",
      likelyDevelopmentType: likelyType,
      lotSizeSqft: lotSqft,
      terrainRating,
      backyardRating: backyard.rating,
      accessSignal: access.rating,
    },
    lotSize: { sqft: lotSqft, score: lotSizeScore },
    terrainSignal: {
      rating: terrainRating,
      score: terrainScoreVal,
      description:
        terrainRating === "Low terrain risk"
          ? "Flat or gentle slope. Standard construction."
          : terrainRating === "Moderate terrain risk"
            ? "Some slope. May affect layout and cost."
            : "Significant slope. Requires careful engineering.",
    },
    backyardSignal: {
      rating: backyard.rating,
      score: backyard.score,
      description:
        backyard.rating === "High"
          ? "Good rear yard space for a DADU footprint."
          : backyard.rating === "Moderate"
            ? "Usable rear yard. Design will need to optimize."
            : "Limited rear yard. Constrained buildable area.",
    },
    accessSignal: {
      rating: access.rating,
      score: access.score,
      description: report.access.note,
    },
    contextSignal: {
      score: contextScore,
      description:
        nearby >= 3
          ? "Neighborhood has established DADU development."
          : nearby >= 1
            ? "Other ADUs nearby. Precedent exists."
            : "Few ADUs in immediate area.",
    },
    risks: riskList,
    confidence,
  };
}

/* ── getSiteImagery: placeholder for future ArcGIS/imagery export ── */

/**
 * Placeholder for dynamic site imagery export.
 * Future: Integrate with ArcGIS Imagery API or similar for high-res
 * parcel outlines, aerial export, or PDF report generation.
 */
export async function getSiteImagery(
  address: string
): Promise<{ url?: string; placeholder?: boolean }> {
  // TODO: ArcGIS REST ImageExport or similar
  // const exportUrl = await arcgisImageExport(address, { format: "png", ... });
  return { placeholder: true };
}

/* ── Mock data for development/testing ── */

export function generateMockDealSignals(address: string): DealSignals {
  return {
    siteOverview: {
      address,
      likelyDevelopmentType: "DADU",
      lotSizeSqft: 5250,
      terrainRating: "Low terrain risk",
      backyardRating: "High",
      accessSignal: "Good",
    },
    lotSize: { sqft: 5250, score: 95 },
    terrainSignal: {
      rating: "Low terrain risk",
      score: 90,
      description: "Flat or gentle slope. Standard construction.",
    },
    backyardSignal: {
      rating: "High",
      score: 85,
      description: "Good rear yard space for a DADU footprint.",
    },
    accessSignal: {
      rating: "Good",
      score: 75,
      description: "Side yard provides adequate passage for construction.",
    },
    contextSignal: {
      score: 65,
      description: "Other ADUs nearby. Precedent exists.",
    },
    risks: [],
    confidence: "High confidence",
  };
}
