import { parcelZoningLabel, type FeasibilityResult } from "./feasibility";
import type { ADUReport } from "./adu-analysis";
import { coverageAvailabilityBand } from "./metric-health";

export type OverviewRow = {
  label: string;
  value: string;
  /** Visually emphasize the value cell (e.g. coverage headroom). */
  highlightValue?: boolean;
  /** Semantic tier for main metrics (coverage available, etc.). */
  valueTone?: "good" | "caution" | "severe";
};

export type OverviewGroup = {
  id: string;
  title: string;
  rows: OverviewRow[];
};

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = n <= 1 && n >= 0 ? n * 100 : n;
  return `${Number(v.toFixed(1))}%`;
}

function sqft(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString()} sq ft`;
}

function yesNo(b: boolean | null | undefined): string {
  if (b == null) return "—";
  return b ? "Yes" : "No";
}

function treeCanopyConstraintValue(treeP: number | null | undefined): string {
  if (treeP == null || !Number.isFinite(treeP)) return "—";
  const p = treeP <= 1 && treeP >= 0 ? treeP * 100 : treeP;
  const base = pct(treeP);
  if (p > 35) return `${base} — arborist site visit likely before permitting`;
  return base;
}

/**
 * Human-readable groups for the expanded panel. No raw GIS field names.
 */
export function buildFeasibilityOverviewGroups(
  result: FeasibilityResult,
  report: ADUReport
): OverviewGroup[] {
  const p = result.parcel;
  const f = result.feasibility;
  const groups: OverviewGroup[] = [];

  groups.push({
    id: "property",
    title: "Property",
    rows: [
      { label: "Lot size", value: sqft(p?.lotSqft ?? null) },
      { label: "Zoning", value: parcelZoningLabel(p) ?? "—" },
      { label: "Year built", value: p?.yearBuilt?.trim() || "—" },
      { label: "Parcel ID", value: p?.pin?.trim() || "—" },
    ],
  });

  const cov = report.coverage;
  const availBand = cov ? coverageAvailabilityBand(cov.availableSqft) : "unknown";
  const availTone =
    availBand === "unknown" ? undefined : (availBand as "good" | "caution" | "severe");
  groups.push({
    id: "geometry",
    title: "Lot geometry",
    rows: [
      { label: "Lot width (est.)", value: f?.lotWidth != null ? `${f.lotWidth} ft` : "—" },
      { label: "Lot depth (est.)", value: f?.lotDepth != null ? `${f.lotDepth} ft` : "—" },
      {
        label: "Lot coverage",
        value: cov ? `${cov.currentPercent.toFixed(1)}%` : pct(f?.lotCoveragePercent ?? null),
      },
      {
        label: "Coverage available",
        value: cov ? `${sqft(cov.availableSqft)} under max lot coverage (est.)` : "—",
        highlightValue: Boolean(cov && cov.availableSqft > 0),
        valueTone: availTone,
      },
    ],
  });

  const constraintRows: OverviewRow[] = [
    { label: "Tree canopy", value: treeCanopyConstraintValue(f?.treeCanopyPercent ?? null) },
    { label: "Steep slope", value: pct(f?.steepSlopePercent ?? null) },
    { label: "Wetland area", value: pct(f?.wetlandPercent ?? null) },
    {
      label: "Flood-prone",
      value: f?.floodProne === true ? "Flagged" : f?.floodProne === false ? "Not flagged" : "—",
    },
    {
      label: "Shoreline",
      value: f?.shoreline?.trim() && f.shoreline.toLowerCase() !== "none" ? f.shoreline : "None indicated",
    },
    {
      label: "Liquefaction / slide / peat",
      value: [
        f?.liquefaction ? "Liquefaction" : null,
        f?.knownSlide || f?.potentialSlide ? "Landslide concern" : null,
        f?.peat ? "Peat" : null,
      ]
        .filter(Boolean)
        .join(", ") || "None indicated",
    },
  ];
  groups.push({ id: "constraints", title: "Constraints", rows: constraintRows });

  const aadu = f?.existingAADU ?? 0;
  const dadu = f?.existingDADU ?? 0;
  const totalAdus = f?.totalADU ?? aadu + dadu;
  groups.push({
    id: "structures",
    title: "Structures & ADUs",
    rows: [
      {
        label: "ADUs on parcel",
        value:
          totalAdus > 0
            ? `${totalAdus} total (${aadu} attached, ${dadu} detached)`
            : "None on record",
      },
      {
        label: "Detached garage",
        value:
          (f?.detachedGarageCount ?? 0) > 0
            ? `${f?.detachedGarageCount} · ${sqft(f?.detachedGarageSqft ?? null)}`
            : "None indicated",
      },
      { label: "Alley access", value: yesNo(f?.hasAlley) },
    ],
  });

  return groups;
}

export function parcelViewerUrl(pin: string | null | undefined): string | null {
  if (!pin?.trim()) return null;
  return `https://blue.kingcounty.com/Assessor/eRealProperty/Detail.aspx?ParcelNbr=${encodeURIComponent(pin.trim())}`;
}

export function listingSearchUrl(address: string): string {
  const q = encodeURIComponent(`${address} Seattle WA real estate`);
  return `https://www.google.com/search?q=${q}`;
}
