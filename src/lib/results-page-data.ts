/**
 * Structured data for the restructured investor-focused results page.
 * Transforms FeasibilityResult + ADUReport + DealSignals into section-ready objects.
 */

import type { FeasibilityResult } from "./feasibility";
import type {
  ADUReport,
  CoverageData,
  HeightData,
  DADUFootprint,
  HousingOption,
  PropertyTrait,
  AccessInfo,
  NearbyADU,
  FeasibilityCheck,
} from "./adu-analysis";
import type { DealSignals, DealScoreResult } from "./deal-scoring";
import {
  calculateDealScore,
  calculateCombinedScore,
  generateDealInterpretation,
  getAcquisitionRecommendation,
} from "./deal-scoring";

export interface DealSnapshotData {
  score: number;
  scoreCategory: string;
  opportunityType: string;
  keyStrengths: string[];
  keyRisks: string[];
  confidenceLevel: string;
  interpretation: {
    opportunity: string;
    risks: string;
    recommendation: string;
  };
  recommendation: string;
}

export interface PropertyOverviewData {
  parcelId: string | null;
  zoning: string | null;
  lotSizeSqft: number | null;
  dimensions: { width: number | null; depth: number | null };
  yearBuilt: string | null;
  existingADUs: number;
}

export interface BuildPotentialData {
  coverageUsedPercent: number | null;
  coverageLimitPercent: number | null;
  remainingBuildableSqft: number | null;
  estimatedDADUSize: number | null;
  heightLimit: number | null;
  coverage: CoverageData | null;
  daduFootprint: DADUFootprint | null;
  height: HeightData | null;
}

export interface SiteConditionsData {
  lotType: string | null;
  accessType: string;
  sideYardWidthFt: number | null;
  garagePresence: boolean;
  garageSqft: number | null;
  treeCanopyPercent: number | null;
  interpretation: string;
  access: AccessInfo;
}

export interface NeighborhoodSignalsData {
  adusWithinQuarterMile: number;
  distanceToNearestFt: number | null;
  nearby: NearbyADU[];
}

export interface DevelopmentOptionsData {
  options: HousingOption[];
}

export interface RegulatoryDetailsData {
  zoningChecks: FeasibilityCheck[];
  lotStandardsChecks: FeasibilityCheck[];
  coverageChecks: FeasibilityCheck[];
  heightChecks: FeasibilityCheck[];
  stats: { label: string; value: string; sub?: string }[];
  eca: { hasIssues: boolean; labels: string[] };
}

export interface ResultsPageData {
  dealSnapshot: DealSnapshotData;
  propertyOverview: PropertyOverviewData;
  buildPotential: BuildPotentialData;
  siteConditions: SiteConditionsData;
  neighborhoodSignals: NeighborhoodSignalsData;
  developmentOptions: DevelopmentOptionsData;
  regulatoryDetails: RegulatoryDetailsData;
  address: string;
}

/**
 * Build structured results page data from result + report.
 */
export function buildResultsPageData(
  result: FeasibilityResult,
  report: ADUReport,
  signals: DealSignals
): ResultsPageData {
  const siteSignals = {
    zoningScore: result.parcel?.zoning
      ? ["NR", "RSL", "LR", "SF"].some((z) =>
          (result.parcel!.zoning ?? "").toUpperCase().startsWith(z)
        )
        ? 90
        : 30
      : 0,
    lotSizeScore: signals.lotSize.score,
    terrainScore: signals.terrainSignal.score,
    backyardScore: signals.backyardSignal.score,
    accessScore: signals.accessSignal.score,
    contextScore: signals.contextSignal.score,
  };
  const dealScoreResult = calculateDealScore(siteSignals, { includeBreakdown: true });
  const combinedResult = calculateCombinedScore(dealScoreResult.score, report.confidence);
  const interpretation = generateDealInterpretation(signals, combinedResult);
  const recommendation = getAcquisitionRecommendation(combinedResult.score);

  const p = result.parcel;
  const f = result.feasibility;
  const cov = report.coverage;

  const zoning = p?.zoning ?? report.stats.find((s) => s.label === "Zoning")?.value ?? null;
  const lotSize = p?.lotSqft ?? f?.shapeArea ?? 0;

  const keyStrengths: string[] = [];
  if (signals.lotSize.score >= 70) keyStrengths.push("Lot size supports development");
  if (signals.terrainSignal.score >= 70) keyStrengths.push("Low terrain risk");
  if (signals.backyardSignal.score >= 70) keyStrengths.push("Good backyard buildability");
  if (signals.accessSignal.score >= 70) keyStrengths.push(signals.accessSignal.rating + " access");
  if (zoning && ["NR", "RSL", "LR", "SF"].some((z) => (zoning ?? "").toUpperCase().startsWith(z)))
    keyStrengths.push("DADU-eligible zoning");
  if (keyStrengths.length === 0) keyStrengths.push("Zoning allows ADU development");

  const accessLabel =
    report.access.type === "alley"
      ? "Alley"
      : report.access.type === "corner"
        ? "Corner lot"
        : report.access.type === "side"
          ? report.access.sideYardFt != null
            ? `Side (~${report.access.sideYardFt} ft)`
            : "Side yard"
          : report.access.type === "none"
            ? "None"
            : "—";

  const nearbyTotal = (report.nearby?.[0]?.count ?? 0) + (report.nearby?.[1]?.count ?? 0);
  const nearestFt =
    report.nearby?.[0]?.nearestFeet != null && report.nearby?.[1]?.nearestFeet != null
      ? Math.min(report.nearby[0].nearestFeet, report.nearby[1].nearestFeet)
      : report.nearby?.[0]?.nearestFeet ?? report.nearby?.[1]?.nearestFeet ?? null;

  const garageCount = f?.detachedGarageCount ?? 0;
  const garageSqft = garageCount > 0 ? (f?.detachedGarageSqft ?? 0) : 0;
  const treePct = f?.treeCanopyPercent != null
    ? (f.treeCanopyPercent <= 1 ? f.treeCanopyPercent * 100 : f.treeCanopyPercent)
    : null;

  let siteInterpretation = "";
  if (report.access.type === "alley" || report.access.type === "corner") {
    siteInterpretation = "Access is favorable. Alley or corner lot simplifies equipment delivery.";
  } else if (report.access.type === "side" && report.access.adequate) {
    siteInterpretation = "Side yard access appears adequate for construction.";
  } else if (report.access.type === "side" && !report.access.adequate) {
    siteInterpretation = "Side yard may be tight. Crane delivery could be required.";
  } else {
    siteInterpretation = "Access is constrained. Verify build access before pursuing.";
  }
  if (garageCount > 0) {
    siteInterpretation += ` Detached garage (~${garageSqft.toLocaleString()} sq ft) may be convertible.`;
  }
  if (treePct != null && treePct > 10) {
    siteInterpretation += ` ~${treePct.toFixed(0)}% tree canopy—removal may require permits.`;
  }

  const zoningChecks = report.checks.filter((c) =>
    ["Zoning", "Lot Size", "Existing ADUs"].includes(c.label)
  );
  const lotStandardsChecks = report.checks.filter((c) =>
    ["Lot Width", "Lot Depth", "Lot Coverage"].includes(c.label)
  );
  const coverageChecks = report.checks.filter((c) => c.label === "Lot Coverage");
  const heightChecks = report.checks.filter((c) =>
    c.label.toLowerCase().includes("height")
  );

  return {
    dealSnapshot: {
      score: combinedResult.score,
      scoreCategory: combinedResult.scoreCategory,
      opportunityType: signals.siteOverview.likelyDevelopmentType,
      keyStrengths,
      keyRisks: signals.risks,
      confidenceLevel: signals.confidence,
      interpretation,
      recommendation,
    },
    propertyOverview: {
      parcelId: p?.pin ?? null,
      zoning,
      lotSizeSqft: lotSize > 0 ? lotSize : null,
      dimensions: {
        width: f?.lotWidth ?? null,
        depth: f?.lotDepth ?? null,
      },
      yearBuilt: p?.yearBuilt ?? null,
      existingADUs: f?.totalADU ?? 0,
    },
    buildPotential: {
      coverageUsedPercent: cov?.currentPercent ?? null,
      coverageLimitPercent: cov?.maxPercent ?? null,
      remainingBuildableSqft: cov?.availableSqft ?? null,
      estimatedDADUSize: report.daduFootprint?.buildableSqft ?? null,
      heightLimit: report.height?.total ?? null,
      coverage: report.coverage,
      daduFootprint: report.daduFootprint,
      height: report.height,
    },
    siteConditions: {
      lotType: f?.lotType ?? null,
      accessType: accessLabel,
      sideYardWidthFt: report.access.sideYardFt ?? null,
      garagePresence: garageCount > 0,
      garageSqft: garageSqft > 0 ? garageSqft : null,
      treeCanopyPercent: treePct,
      interpretation: siteInterpretation,
      access: report.access,
    },
    neighborhoodSignals: {
      adusWithinQuarterMile: nearbyTotal,
      distanceToNearestFt: nearestFt,
      nearby: report.nearby ?? [],
    },
    developmentOptions: {
      options: report.housingOptions ?? [],
    },
    regulatoryDetails: {
      zoningChecks: zoningChecks.length > 0 ? zoningChecks : report.checks,
      lotStandardsChecks: lotStandardsChecks.length > 0 ? lotStandardsChecks : [],
      coverageChecks,
      heightChecks,
      stats: report.stats,
      eca: {
        hasIssues: report.eca.hasIssues,
        labels: report.eca.labels,
      },
    },
    address: signals.siteOverview.address,
  };
}
