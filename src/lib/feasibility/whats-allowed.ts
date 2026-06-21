import { parcelZoningLabel, type FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport, HousingOption } from "@/lib/adu-analysis";

export interface AllowedFact {
  label: string;
  value: string;
  note?: string;
}

export interface CodeCitation {
  label: string;
  href: string;
}

export interface WhatsAllowedReadout {
  confidence: "high";
  zone: string;
  maxUnits: string;
  transitNote: string;
  housingTypes: string[];
  envelope: AllowedFact[];
  citations: CodeCitation[];
}

const SMC_2344041 =
  "https://library.municode.com/wa/seattle/codes/code_of_ordinances?nodeId=TIT23LANDUSAND_PLANDE_CH23.44RESNCODE";
const SMC_234500 =
  "https://library.municode.com/wa/seattle/codes/code_of_ordinances?nodeId=TIT23LANDUSAND_PLANDE_CH23.45RESNCODE";

function zoneFamily(zoning: string | null): string | null {
  const z = (zoning ?? "").toUpperCase();
  if (!z) return null;
  if (z.includes("NR") || z === "NR") return "NR";
  if (z.includes("RSL")) return "RSL";
  if (z.includes("LR")) return "LR";
  if (z.includes("RS") || z.includes("SF")) return "SF";
  return null;
}

function maxUnitsLabel(family: string | null, nearTransit: boolean): string {
  if (family === "LR") return "Density-driven (see build options)";
  if (family === "RSL") return "Up to 3 homes (small lot rules)";
  if (nearTransit) return "Up to 6 homes (HB 1110 + transit proximity)";
  return "Up to 4 homes (HB 1110 base)";
}

function transitProximity(result: FeasibilityResult): { near: boolean; note: string } {
  const uv = result.parcel?.urbanVillage?.trim();
  if (uv) {
    return {
      near: true,
      note: `Within ${uv}. Frequent transit proximity may unlock up to six homes.`,
    };
  }
  return {
    near: false,
    note: "Outside a mapped urban village. Base middle-housing allowance is typically four homes.",
  };
}

function allowedTypes(options: HousingOption[]): string[] {
  return options.filter((o) => o.allowed).map((o) => o.type);
}

function envelopeFacts(result: FeasibilityResult, report: ADUReport): AllowedFact[] {
  const f = result.feasibility;
  const cov = report.coverage;
  const fp = report.daduFootprint;
  const facts: AllowedFact[] = [];

  if (cov) {
    facts.push({
      label: "Lot coverage headroom",
      value: `${Math.round(cov.availableSqft).toLocaleString()} sq ft available (est.)`,
      note: `${cov.currentPercent.toFixed(1)}% used of ${cov.maxPercent.toFixed(0)}% max`,
    });
  } else if (f?.lotCoveragePercent != null) {
    facts.push({
      label: "Lot coverage",
      value: `${(f.lotCoveragePercent <= 1 ? f.lotCoveragePercent * 100 : f.lotCoveragePercent).toFixed(1)}% (GIS)`,
    });
  }

  if (fp) {
    facts.push({
      label: "Rear yard DADU footprint (est.)",
      value: `${Math.round(fp.buildableSqft).toLocaleString()} sq ft buildable`,
      note: fp.note,
    });
    facts.push({
      label: "Max DADU height",
      value: `${fp.maxHeight} ft`,
    });
  }

  if (report.height) {
    facts.push({
      label: "Main structure height allowance",
      value: `${report.height.total} ft total (est.)`,
    });
  }

  if (f?.lotWidth != null && f?.lotDepth != null) {
    facts.push({
      label: "Lot dimensions (est.)",
      value: `${f.lotWidth} ft × ${f.lotDepth} ft`,
    });
  }

  return facts;
}

/** Rules-based readout with high confidence — sourced from GIS + Seattle code summaries. */
export function buildWhatsAllowed(result: FeasibilityResult, report: ADUReport): WhatsAllowedReadout {
  const zone = parcelZoningLabel(result.parcel) ?? result.parcel?.zoning ?? "—";
  const family = zoneFamily(result.parcel?.zoning ?? null);
  const transit = transitProximity(result);

  return {
    confidence: "high",
    zone,
    maxUnits: maxUnitsLabel(family, transit.near),
    transitNote: transit.note,
    housingTypes: allowedTypes(report.housingOptions),
    envelope: envelopeFacts(result, report),
    citations: [
      { label: "Seattle Land Use Code Ch. 23.44 (Residential)", href: SMC_2344041 },
      { label: "Seattle Land Use Code Ch. 23.45 (Lowrise)", href: SMC_234500 },
    ],
  };
}
