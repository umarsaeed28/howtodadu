import { parcelZoningLabel, type FeasibilityResult } from "./feasibility";
import type { ADUReport } from "./adu-analysis";
import type { DealSignals, SiteSignals } from "./deal-scoring";
import {
  calculateCombinedScore,
  calculateDealScore,
  daduZoningScoreForDeal,
  getSeattleDealSignals,
} from "./deal-scoring";

export type DaduVerdict = "strong" | "medium" | "low";

export interface FeasibilityTableRow {
  id: string;
  address: string;
  streetLine: string;
  /** Assessed total when available; not list price */
  priceDisplay: string;
  bedsDisplay: string;
  bathsDisplay: string;
  lotSizeSqft: number | null;
  zoning: string | null;
  daduScore: number;
  confidenceShort: string;
  uwProximity: string;
  keyInsight: string;
  verdict: DaduVerdict;
  verdictLabel: string;
  summarySentence: string;
  result: FeasibilityResult;
  report: ADUReport;
  signals: DealSignals;
}

function normalizeId(address: string): string {
  return address.trim().toLowerCase();
}

function streetFromAddress(address: string): string {
  return address.split(/,\s*/)[0]?.trim() || address;
}

function verdictFromCombined(score: number): { verdict: DaduVerdict; label: string } {
  if (score >= 74) return { verdict: "strong", label: "Strong potential" };
  if (score >= 49) return { verdict: "medium", label: "Moderate potential" };
  return { verdict: "low", label: "Lower potential" };
}

function confidenceShort(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("strong") || l.includes("high")) return "Strong";
  if (l.includes("moderate")) return "Moderate";
  if (l.includes("unlikely")) return "Unlikely";
  if (l.includes("low feasibility")) return "Low";
  return "—";
}

function uwProximityFromParcel(result: FeasibilityResult): string {
  const uv = result.parcel?.urbanVillage?.trim();
  if (uv) return `In ${uv}`;
  return "Outside urban village";
}

function assessedTotalDisplay(result: FeasibilityResult): string {
  const land = result.parcel?.landValue;
  const imp = result.parcel?.improvementValue;
  if (land == null && imp == null) return "—";
  const total = (land ?? 0) + (imp ?? 0);
  if (!Number.isFinite(total) || total <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(total);
}

function buildSiteSignalsForDealScore(
  result: FeasibilityResult,
  signals: DealSignals
): SiteSignals {
  const parcel = result.parcel;
  const lotSqft = parcel?.lotSqft ?? 0;
  const zoneLabel = parcelZoningLabel(parcel) ?? "";
  const zoningScore = daduZoningScoreForDeal(zoneLabel, lotSqft);
  return {
    zoningScore,
    lotSizeScore: signals.lotSize.score,
    terrainScore: signals.terrainSignal.score,
    backyardScore: signals.backyardSignal.score,
    accessScore: signals.accessSignal.score,
    contextScore: signals.contextSignal.score,
  };
}

function keyInsightFrom(report: ADUReport, signals: DealSignals): string {
  if (report.headline?.trim()) return report.headline.trim();
  const d = signals.siteOverview;
  const parts: string[] = [];
  if (d.lotSizeSqft >= 4000) parts.push("Spacious lot");
  else if (d.lotSizeSqft >= 3200) parts.push("Meets typical DADU lot size");
  if (signals.terrainSignal.rating === "Low terrain risk") parts.push("manageable terrain");
  if (signals.accessSignal.rating === "Excellent" || signals.accessSignal.rating === "Good")
    parts.push("solid access");
  if (parts.length === 0) return signals.contextSignal.description;
  return parts.slice(0, 2).join(", ") + ".";
}

function summarySentence(
  report: ADUReport,
  signals: DealSignals,
  combined: number
): string {
  const { label: verdictLabel } = verdictFromCombined(combined);
  const lot = signals.siteOverview.lotSizeSqft;
  const lotPart =
    lot > 0 ? `~${lot.toLocaleString()} sq ft lot` : "Lot size from city records";
  const zone = report.stats.find((s) => s.label === "Zoning")?.value ?? "—";
  const riskHint =
    signals.risks.length > 0
      ? `Watch: ${signals.risks[0].toLowerCase()}.`
      : "Few major flags from city data.";
  return `${verdictLabel}. ${lotPart}, ${zone}. ${riskHint}`;
}

/**
 * Three human-readable strengths (not raw field dumps).
 */
export function buildWhyBullets(
  report: ADUReport,
  signals: DealSignals
): string[] {
  const bullets: string[] = [];
  const zone = report.stats.find((s) => s.label === "Zoning")?.value;
  if (zone && !zone.includes("—")) {
    const zt = zone.trim();
    if (/^LR/i.test(zt)) {
      bullets.push(
        `LR zoning allows ADUs, but this context often favors townhomes or small multifamily—confirm a rear DADU matches your acquisition thesis.`
      );
    } else if (/^NR/i.test(zt)) {
      bullets.push(`Neighborhood Residential (${zt}) is a strong fit for backyard DADUs when lot and access checks out.`);
    } else {
      bullets.push(`Zoning (${zone}) supports ADU development in many cases.`);
    }
  }
  if (signals.lotSize.sqft >= 4000) {
    bullets.push("Lot size gives flexibility for a rear DADU layout.");
  } else if (signals.lotSize.sqft >= 3200) {
    bullets.push("Lot meets common minimums for detached ADUs—verify setbacks on site.");
  }
  if (signals.terrainSignal.rating === "Low terrain risk") {
    bullets.push("Slope and terrain look manageable for standard construction.");
  } else if (signals.backyardSignal.rating === "High") {
    bullets.push("Rear yard appears to have usable buildable space.");
  }
  if (signals.accessSignal.rating === "Excellent" || signals.accessSignal.rating === "Good") {
    bullets.push(`${signals.accessSignal.rating} construction access from the street or alley.`);
  }
  if (bullets.length < 3 && signals.contextSignal.score >= 65) {
    bullets.push(signals.contextSignal.description);
  }
  while (bullets.length < 3) {
    bullets.push("Review permit history and utilities before making an offer.");
    if (bullets.length >= 3) break;
  }
  return [...new Set(bullets)].slice(0, 3);
}

/** Short risk lines for the detail panel */
export function buildRiskLines(signals: DealSignals, report: ADUReport): string[] {
  const out: string[] = [...signals.risks];
  if (report.eca.hasIssues) {
    if (!out.some((x) => x.toLowerCase().includes("environment")))
      out.push("Environmental overlays may add review.");
  }
  const tree = report.traits.find((t) => t.title.toLowerCase().includes("tree"));
  if (tree?.sentiment === "bad") {
    if (tree.note?.toLowerCase().includes("arborist")) {
      out.push(
        "Heavy tree cover—expect an arborist site visit and SDCI tree review before permitting."
      );
    } else {
      out.push("Tree regulations may limit clearing—plan for retention or permits.");
    }
  } else if (tree?.sentiment === "neutral") {
    out.push("Tree regulations may limit clearing—plan for retention or permits.");
  }
  if (out.length === 0) {
    out.push("Site conditions not fully verified—confirm with survey and SDCI.");
  }
  return [...new Set(out)].slice(0, 5);
}

export function buildFeasibilityTableRow(
  result: FeasibilityResult,
  report: ADUReport
): FeasibilityTableRow {
  const signals = getSeattleDealSignals(result, report);
  const siteSignals = buildSiteSignalsForDealScore(result, signals);
  const deal = calculateDealScore(siteSignals);
  const combined = calculateCombinedScore(deal.score, report.confidence);
  const availCov = report.coverage?.availableSqft;
  let daduScore = combined.score;
  if (availCov != null && Number.isFinite(availCov) && availCov < 700) {
    daduScore = Math.min(daduScore, 74);
  }
  const address = result.parcel?.address?.trim() || "Unknown address";
  const { verdict, label: verdictLabel } = verdictFromCombined(daduScore);

  return {
    id: normalizeId(address),
    address,
    streetLine: streetFromAddress(address),
    priceDisplay: assessedTotalDisplay(result),
    bedsDisplay: "—",
    bathsDisplay: "—",
    lotSizeSqft: result.parcel?.lotSqft ?? null,
    zoning: parcelZoningLabel(result.parcel),
    daduScore,
    confidenceShort: confidenceShort(report.confidenceLabel),
    uwProximity: uwProximityFromParcel(result),
    keyInsight: keyInsightFrom(report, signals),
    verdict,
    verdictLabel,
    summarySentence: summarySentence(report, signals, daduScore),
    result,
    report,
    signals,
  };
}
