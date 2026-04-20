import type { FeasibilityResult } from "./feasibility";

export type AdUniverseRow = { label: string; value: string };

export type AdUniverseGroup = {
  id: string;
  title: string;
  subtitle?: string;
  rows: AdUniverseRow[];
};

export type AdUniverseFeasibilityPanelData = {
  groups: AdUniverseGroup[];
  hasParcelLayer: boolean;
  hasFactorsLayer: boolean;
};

function em(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  return String(v);
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = v <= 1 && v >= 0 ? v * 100 : v;
  return `${Number(n.toFixed(1))}%`;
}

function yesNo(b: boolean | null | undefined): string {
  if (b == null) return "—";
  return b ? "Yes" : "No";
}

function sqft(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v).toLocaleString()} sq ft`;
}

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function ft(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n)} ft`;
}

/**
 * All displayed fields map to ADUniverse Parcels + ADUniverse Feasibility Factors
 * (Seattle City GIS / ArcGIS services).
 */
export function buildAdUniverseFeasibilityPanel(
  result: FeasibilityResult
): AdUniverseFeasibilityPanelData {
  const p = result.parcel;
  const f = result.feasibility;

  const groups: AdUniverseGroup[] = [];

  if (p) {
    groups.push({
      id: "parcel",
      title: "Parcel — ADUniverse Parcels",
      subtitle: "Subject parcel attributes from the parcels feature layer.",
      rows: [
        { label: "PIN / Parcel ID", value: em(p.pin) },
        { label: "Address (parcel)", value: em(p.address) },
        { label: "Zoning", value: em(p.zoning) },
        { label: "Zone category (ZONELUT)", value: em(p.zoningCategory) },
        { label: "Base zone", value: em(p.baseZone) },
        { label: "Zoning overlay (ZONE_GEO)", value: em(p.zoningOverlay) },
        { label: "Existing use", value: em(p.existingUse) },
        { label: "Lot size (SQFTLOT)", value: sqft(p.lotSqft) },
        { label: "Developable land (non-shore)", value: sqft(p.developableAreaSqft) },
        { label: "Urban village", value: em(p.urbanVillage) },
        { label: "Council district", value: em(p.councilDistrict) },
        { label: "ZIP", value: em(p.zip) },
        { label: "Year built (parcel)", value: em(p.yearBuilt) },
        { label: "Land value (assessed)", value: money(p.landValue) },
        { label: "Improvement value (assessed)", value: money(p.improvementValue) },
        { label: "Property type", value: em(p.propType) },
        { label: "Plat name", value: em(p.platName) },
        { label: "Shape area (parcel geom)", value: sqft(p.shapeArea) },
        { label: "Shape length", value: em(p.shapeLength) },
      ],
    });
  }

  if (f) {
    groups.push({
      id: "lot-coverage",
      title: "Lot & building — Feasibility factors",
      subtitle:
        "MBG dimensions, coverage, and envelope data from the feasibility factors layer.",
      rows: [
        { label: "Lot type", value: em(f.lotType) },
        { label: "Alley (rear access)", value: yesNo(f.hasAlley) },
        { label: "Lot width (MBG)", value: ft(f.lotWidth) },
        { label: "Lot depth (MBG)", value: ft(f.lotDepth) },
        { label: "Bound ratio", value: em(f.boundRatio) },
        { label: "Total building sq ft (TOT_SQFT)", value: sqft(f.totalBuildingSqft) },
        { label: "Lot coverage %", value: pct(f.lotCoveragePercent) },
        { label: "Over lot coverage limit", value: yesNo(f.lotCoverageOver) },
      ],
    });

    groups.push({
      id: "environment",
      title: "Environment & critical areas",
      subtitle: "ECA-style overlays from the feasibility factors layer.",
      rows: [
        { label: "Steep slope %", value: pct(f.steepSlopePercent) },
        { label: "Steep slope area", value: sqft(f.steepSlopeArea) },
        { label: "Wetland %", value: pct(f.wetlandPercent) },
        { label: "Wetland area", value: sqft(f.wetlandArea) },
        { label: "Wildlife %", value: pct(f.wildlifePercent) },
        { label: "Wildlife area", value: sqft(f.wildlifeArea) },
        { label: "Riparian %", value: pct(f.riparianPercent) },
        { label: "Riparian area", value: sqft(f.riparianArea) },
        { label: "Flood-prone", value: yesNo(f.floodProne) },
        { label: "Liquefaction", value: yesNo(f.liquefaction) },
        { label: "Known slide", value: yesNo(f.knownSlide) },
        { label: "Potential slide", value: yesNo(f.potentialSlide) },
        { label: "Peat", value: yesNo(f.peat) },
        { label: "Landfill", value: yesNo(f.landfill) },
        { label: "Shoreline", value: em(f.shoreline) },
        { label: "Tree canopy %", value: pct(f.treeCanopyPercent) },
      ],
    });

    groups.push({
      id: "adus",
      title: "ADUs & nearby housing",
      subtitle: "Counts and neighbor distances from the feasibility factors layer.",
      rows: [
        { label: "AADU count on parcel", value: em(f.existingAADU) },
        { label: "DADU count on parcel", value: em(f.existingDADU) },
        { label: "Total ADU on parcel", value: em(f.totalADU) },
        { label: "DADU within 1,320 ft", value: em(f.nearbyDADU) },
        { label: "AADU within 1,320 ft", value: em(f.nearbyAADU) },
        { label: "Nearest AADU distance", value: ft(f.nearestAADUDist) },
        { label: "Nearest DADU distance", value: ft(f.nearestDADUDist) },
      ],
    });

    groups.push({
      id: "structures",
      title: "Structures & footprint detail",
      subtitle: "Garage, basement, and vintage fields from the feasibility factors layer.",
      rows: [
        { label: "Detached garage count", value: em(f.detachedGarageCount) },
        { label: "Detached garage sq ft", value: sqft(f.detachedGarageSqft) },
        { label: "Basement sq ft (total)", value: sqft(f.basementSqft) },
        { label: "Daylight basement", value: em(f.daylightBasement) },
        { label: "Min year built (structures)", value: em(f.minYearBuilt) },
        { label: "Max year renovated", value: em(f.maxYearRenovated) },
        { label: "Parcel line count", value: em(f.parcelLineCount) },
        { label: "Factors shape area", value: sqft(f.shapeArea) },
        { label: "Factors shape length", value: em(f.shapeLength) },
      ],
    });
  }

  return {
    groups,
    hasParcelLayer: !!p,
    hasFactorsLayer: !!f,
  };
}
