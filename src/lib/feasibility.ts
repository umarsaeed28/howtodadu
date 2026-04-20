/**
 * Prefer detailed zoning code (e.g. NR3) over legacy assessor bucket (e.g. SF 5000 from ZONELUT).
 */
export function parcelZoningLabel(parcel: ParcelData | null): string | null {
  if (!parcel) return null;
  const z = parcel.zoning?.trim();
  if (z) return z;
  const b = parcel.baseZone?.trim();
  if (b) return b;
  return parcel.zoningCategory?.trim() || null;
}

export interface ParcelData {
  address: string | null;
  pin: string | null;
  lotSqft: number | null;
  developableAreaSqft: number | null;
  zoning: string | null;
  zoningCategory: string | null;
  baseZone: string | null;
  zoningOverlay: string | null;
  existingUse: string | null;
  urbanVillage: string | null;
  yearBuilt: string | null;
  landValue: number | null;
  improvementValue: number | null;
  propType: string | null;
  platName: string | null;
  councilDistrict: number | null;
  zip: string | null;
  shapeArea: number | null;
  shapeLength: number | null;
}

export interface FeasibilityData {
  lotType: string | null;
  hasAlley: boolean;
  totalBuildingSqft: number | null;
  lotCoveragePercent: number | null;
  lotCoverageOver: boolean;
  lotWidth: number | null;
  lotDepth: number | null;
  boundRatio: number | null;
  steepSlopePercent: number | null;
  steepSlopeArea: number | null;
  wetlandPercent: number | null;
  wetlandArea: number | null;
  wildlifePercent: number | null;
  wildlifeArea: number | null;
  riparianPercent: number | null;
  riparianArea: number | null;
  floodProne: boolean;
  liquefaction: boolean;
  knownSlide: boolean;
  potentialSlide: boolean;
  peat: boolean;
  landfill: boolean;
  shoreline: string | null;
  treeCanopyPercent: number | null;
  existingAADU: number | null;
  existingDADU: number | null;
  totalADU: number | null;
  nearbyDADU: number | null;
  nearbyAADU: number | null;
  nearestAADUDist: number | null;
  nearestDADUDist: number | null;
  detachedGarageCount: number | null;
  detachedGarageSqft: number | null;
  basementSqft: number | null;
  daylightBasement: string | null;
  minYearBuilt: number | null;
  maxYearRenovated: number | null;
  parcelLineCount: number | null;
  shapeArea: number | null;
  shapeLength: number | null;
  /**
   * Seattle ARC GIS ECA layers (Environmentally_Critical_Areas_ECA) that intersect the parcel or point.
   * Populated server-side; scoring merges these into hazard flags on {@link FeasibilityData}.
   */
  ecaSeattleGisLayers?: string[] | null;
}

/** Defaults for merging GIS-only ECA hits when the feasibility factors layer is missing. */
export function emptyFeasibilityData(): FeasibilityData {
  return {
    lotType: null,
    hasAlley: false,
    totalBuildingSqft: null,
    lotCoveragePercent: null,
    lotCoverageOver: false,
    lotWidth: null,
    lotDepth: null,
    boundRatio: null,
    steepSlopePercent: null,
    steepSlopeArea: null,
    wetlandPercent: null,
    wetlandArea: null,
    wildlifePercent: null,
    wildlifeArea: null,
    riparianPercent: null,
    riparianArea: null,
    floodProne: false,
    liquefaction: false,
    knownSlide: false,
    potentialSlide: false,
    peat: false,
    landfill: false,
    shoreline: null,
    treeCanopyPercent: null,
    existingAADU: null,
    existingDADU: null,
    totalADU: null,
    nearbyDADU: null,
    nearbyAADU: null,
    nearestAADUDist: null,
    nearestDADUDist: null,
    detachedGarageCount: null,
    detachedGarageSqft: null,
    basementSqft: null,
    daylightBasement: null,
    minYearBuilt: null,
    maxYearRenovated: null,
    parcelLineCount: null,
    shapeArea: null,
    shapeLength: null,
    ecaSeattleGisLayers: null,
  };
}

export interface ContourLine {
  elevation: number;
  type: number;
  paths: number[][][];
}

export interface LotGeometry {
  rings: number[][];
  bbox: [number, number, number, number];
  aerialUrl: string;
  imageSize: number;
}

/** Building footprint from GIS (exact geometry) */
export interface SitePlanBuilding {
  rings: number[][];
  area: number;
  pin?: string | null;
}

/** Tree from LiDAR/GIS - crown polygon or point with radius */
export interface SitePlanTree {
  /** Centroid [lng, lat] */
  centroid: [number, number];
  /** Crown radius in feet */
  radiusFt: number;
  /** Height in feet (98th percentile) */
  heightFt?: number;
  /** Whether in DADU buildable zone (potential removal) */
  inDADUZone?: boolean;
  /** Whether SDCI protected (extra caution) */
  protected?: boolean;
}

/** Street segment for context (ArcGIS polyline: array of paths, each path = array of [lng,lat]) */
export interface SitePlanStreet {
  name: string;
  paths: number[][][];
}

/** Driveway or parking lot polygon from GIS */
export interface SitePlanDriveway {
  rings: number[][];
}

/** Adjacent parcel (not mapped – boundaries only) */
export interface SitePlanAdjacentParcel {
  rings: number[][];
}

/** Extended site plan from GIS */
export interface SitePlanData {
  buildings: SitePlanBuilding[];
  trees: SitePlanTree[];
  streets: SitePlanStreet[];
  driveways: SitePlanDriveway[];
  adjacentParcels: SitePlanAdjacentParcel[];
}

export interface FeasibilityResult {
  coordinates: { lat: number; lng: number };
  parcel: ParcelData | null;
  feasibility: FeasibilityData | null;
  lot: LotGeometry | null;
  contours: ContourLine[];
  sitePlan?: SitePlanData | null;
}

export async function fetchFeasibility(
  address: string
): Promise<FeasibilityResult> {
  const res = await fetch(
    `/api/feasibility?address=${encodeURIComponent(address)}`
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to fetch feasibility data");
  }

  return res.json();
}

/**
 * Returns all current checker data and ADUniverse related outputs.
 * Foundation for augmented deal screening layer.
 * Use: const { result, report } = await getExistingFeasibilityData(address);
 */
export async function getExistingFeasibilityData(address: string): Promise<{
  result: FeasibilityResult;
  report: import("./adu-analysis").ADUReport | null;
}> {
  const result = await fetchFeasibility(address);
  const { generateADUReport } = await import("./adu-analysis");
  const report =
    result.parcel || result.feasibility
      ? generateADUReport(result.parcel, result.feasibility)
      : null;
  return { result, report };
}
