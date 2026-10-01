import { num, str, bool } from "@/lib/geo-helpers";
import type { FeasibilityData } from "@/lib/feasibility";

/** Map one ADUniverse_feasibility_factors record (ArcGIS attributes) to FeasibilityData. */
export function factorsToFeasibilityData(
  f: Record<string, unknown>,
): FeasibilityData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = f as any;
  return {
    lotType: str(g.LOT_TYPE),
    hasAlley: bool(g.ALLEY),
    totalBuildingSqft: num(g.TOT_SQFT),
    lotCoveragePercent: num(g.COVERAGE_PC),
    lotCoverageOver: bool(g.LOTCOV_OVER),
    lotWidth: g.MBG_Width ? Math.round(g.MBG_Width) : null,
    lotDepth: g.MBG_Length ? Math.round(g.MBG_Length) : null,
    boundRatio: num(g.bound_ratio),
    steepSlopePercent: num(g.STEEPSLOPE_PC),
    steepSlopeArea: num(g.STEEPSLOPE_AREA),
    wetlandPercent: num(g.WETLAND_PC),
    wetlandArea: num(g.WETLAND_AREA),
    wildlifePercent: num(g.WILDLIFE_PC),
    wildlifeArea: num(g.WILDLIFE_AREA),
    riparianPercent: num(g.RIPARIAN_PC),
    riparianArea: num(g.RIPARIAN_AREA),
    floodProne: bool(g.FLOODPRONE),
    liquefaction: bool(g.LIQUEFACTION),
    knownSlide: bool(g.KNOWNSLIDE),
    potentialSlide: bool(g.POTENTIALSLIDE),
    peat: bool(g.PEAT),
    landfill: bool(g.LANDFILL),
    shoreline: str(g.SHORELINE),
    treeCanopyPercent: num(g.TREE_CANOPY_PC),
    existingAADU: num(g.AADU_COUNT),
    existingDADU: num(g.DADU_COUNT),
    totalADU: num(g.ADU_TOTAL),
    nearbyDADU: num(g.DADU_NEAR_1320),
    nearbyAADU: num(g.AADU_NEAR_1320),
    nearestAADUDist: num(g.NEAREST1AADU_DIST),
    nearestDADUDist: num(g.NEAREST1DADU_DIST),
    detachedGarageCount: num(g.COUNT_DETGAR),
    detachedGarageSqft: num(g.SIZE_DETGAR),
    basementSqft: num(g.SUM_SQFTTOTBASEMENT),
    daylightBasement: str(g.DAYLIGHTBASEMENT),
    minYearBuilt: num(g.MIN_YRBUILT),
    maxYearRenovated: num(g.MAX_YRRENOVATED),
    parcelLineCount: num(g.line_count),
    shapeArea: num(g.Shape__Area),
    shapeLength: num(g.Shape__Length),
    ecaSeattleGisLayers: null,
  };
}
