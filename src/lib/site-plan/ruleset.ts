/**
 * Versioned Seattle middle-housing rules referenced by the site plan and detail views.
 * Every value carries a citation, effective date, and confidence tier.
 */
import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { computeFar, maxFarForZone } from "@/lib/feasibility/far";
import { buildWhatsAllowed } from "@/lib/feasibility/whats-allowed";

export const RULESET_VERSION = "seattle-smc-2024.06";
export const RULESET_EFFECTIVE = "2024-06-01";

export type RuleConfidence = "verified" | "derived" | "unverified";

export interface CodeRule {
  id: string;
  label: string;
  value: string;
  citation: string;
  citationUrl: string;
  effectiveDate: string;
  confidence: RuleConfidence;
  note?: string;
}

const SMC_2344041 =
  "https://library.municode.com/wa/seattle/codes/code_of_ordinances?nodeId=TIT23LANDUSAND_PLANDE_CH23.44RESNCODE";
const SMC_234500 =
  "https://library.municode.com/wa/seattle/codes/code_of_ordinances?nodeId=TIT23LANDUSAND_PLANDE_CH23.45RESNCODE";
const HB1110 =
  "https://library.municode.com/wa/seattle/codes/code_of_ordinances?nodeId=TIT23LANDUSAND_PLANDE";

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null || !Number.isFinite(n)) return "unverified — confirm against SMC";
  return `${n.toLocaleString()}${suffix}`;
}

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "unverified — confirm against SMC";
  const v = n <= 1 && n >= 0 ? n * 100 : n;
  return `${v.toFixed(1)}%`;
}

/** Build display rules for a property from GIS + versioned code tables. */
export function buildCodeRules(result: FeasibilityResult, report: ADUReport): CodeRule[] {
  const allowed = buildWhatsAllowed(result, report);
  const f = result.feasibility;
  const cov = report.coverage;
  const fp = report.daduFootprint;
  const existingFar = computeFar(f?.totalBuildingSqft ?? null, result.parcel?.lotSqft ?? null);
  const maxFar = maxFarForZone(result.parcel?.zoning ?? null);

  const rules: CodeRule[] = [
    {
      id: "zoning",
      label: "Zoning district",
      value: allowed.zone,
      citation: "Seattle GIS parcel · ZONING / BASE_ZONE",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: result.parcel?.zoning ? "verified" : "unverified",
    },
    {
      id: "max-units",
      label: "Max homes (est.)",
      value: allowed.maxUnits,
      citation: "HB 1110 · SMC 23.45 (middle housing)",
      citationUrl: HB1110,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: "derived",
      note: allowed.transitNote,
    },
    {
      id: "lot-coverage-max",
      label: "Max lot coverage",
      value: cov ? pct(cov.maxPercent) : "unverified — confirm against SMC",
      citation: "SMC 23.44.041 · ADUniverse feasibility factors",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: cov ? "derived" : "unverified",
    },
    {
      id: "lot-coverage-used",
      label: "Existing lot coverage",
      value: cov ? pct(cov.currentPercent) : pct(f?.lotCoveragePercent ?? null),
      citation: "Seattle GIS · ADUniverse feasibility factors COVERAGE_PC",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: cov || f?.lotCoveragePercent != null ? "verified" : "unverified",
    },
    {
      id: "coverage-available",
      label: "Coverage headroom",
      value: cov ? fmt(cov.availableSqft, " sq ft") : "unverified — confirm against SMC",
      citation: "Derived from GIS coverage used vs max",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: cov ? "derived" : "unverified",
    },
    {
      id: "dadu-max-sqft",
      label: "Max DADU size",
      value: fp ? fmt(fp.maxAllowedSqft, " sq ft") : "unverified — confirm against SMC",
      citation: "SMC 23.44.041.030",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: fp ? "verified" : "unverified",
    },
    {
      id: "dadu-setback-rear",
      label: "DADU rear setback",
      value: fp ? `${fp.rearSetback} ft` : "unverified — confirm against SMC",
      citation: "SMC 23.44.041.030",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: fp ? "verified" : "unverified",
    },
    {
      id: "dadu-setback-side",
      label: "DADU side setback",
      value: fp ? `${fp.sideSetback} ft` : "unverified — confirm against SMC",
      citation: "SMC 23.44.041.030",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: fp ? "verified" : "unverified",
    },
    {
      id: "height-max",
      label: "Max structure height (est.)",
      value: report.height ? `${report.height.total} ft` : "unverified — confirm against SMC",
      citation: "SMC 23.44.041 · lot width table",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: report.height ? "derived" : "unverified",
    },
    {
      id: "far-existing",
      label: "Existing FAR",
      value: existingFar.ratio != null ? existingFar.display : "unverified — confirm against SMC",
      citation: "GIS building area ÷ lot area",
      citationUrl: SMC_2344041,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: existingFar.ratio != null ? "derived" : "unverified",
    },
    {
      id: "far-max",
      label: "Max FAR (zone est.)",
      value: maxFar != null ? maxFar.toFixed(2) : "unverified — confirm against SMC",
      citation: "Zone-family planning table · confirm with SMC",
      citationUrl: SMC_234500,
      effectiveDate: RULESET_EFFECTIVE,
      confidence: maxFar != null ? "derived" : "unverified",
      note: "Planning estimate only. Not a permit determination.",
    },
  ];

  return rules;
}
