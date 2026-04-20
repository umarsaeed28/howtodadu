/**
 * Seattle City GIS — Environmentally Critical Areas (ECA), ARC GIS FeatureServer.
 * @see https://data-seattlecitygis.opendata.arcgis.com/maps/environmentally-critical-areas-eca
 */

import type { FeasibilityData } from "../feasibility";

const ARCGIS_BASE =
  "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services";

/** Combined ECA service (polygons + points/lines per sublayer). */
export const SEATTLE_ECA_FEATURE_SERVER = `${ARCGIS_BASE}/Environmentally_Critical_Areas_ECA/FeatureServer`;

/** Layer index → display name (matches FeatureServer sublayers 0–11). */
export const SEATTLE_ECA_LAYER_NAMES: Record<number, string> = {
  0: "ECA Flood Prone Areas",
  1: "ECA Known Slide Areas",
  2: "ECA Known Slide Events",
  3: "ECA Known Slide Scarps",
  4: "ECA Landfills Historical",
  5: "ECA Liquefaction Prone Areas",
  6: "ECA Peat Settlement Prone Areas",
  7: "ECA Potential Slide Areas",
  8: "ECA Riparian Corridors",
  9: "ECA Steep Slope",
  10: "ECA Wetlands",
  11: "ECA Wildlife Habitat",
};

const ECA_LAYER_IDS = Object.keys(SEATTLE_ECA_LAYER_NAMES).map(Number);

function geometryParam(
  lng: number,
  lat: number,
  parcelRing?: number[][]
): { geometry: string; geometryType: string } {
  if (parcelRing && parcelRing.length >= 3) {
    return {
      geometry: JSON.stringify({
        rings: [parcelRing],
        spatialReference: { wkid: 4326 },
      }),
      geometryType: "esriGeometryPolygon",
    };
  }
  return {
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
  };
}

/**
 * Returns ECA sublayer IDs (0–11) that intersect the parcel polygon or, if no ring, the address point.
 */
export async function querySeattleEcaIntersectingLayers(
  lng: number,
  lat: number,
  options?: { parcelRing?: number[][]; signal?: AbortSignal }
): Promise<number[]> {
  const { geometry, geometryType } = geometryParam(lng, lat, options?.parcelRing);
  const signal = options?.signal ?? AbortSignal.timeout(12000);

  const hits: number[] = [];

  await Promise.all(
    ECA_LAYER_IDS.map(async (layerId) => {
      const params = new URLSearchParams({
        geometry,
        geometryType,
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        where: "1=1",
        returnGeometry: "false",
        returnCountOnly: "true",
        f: "json",
      });

      try {
        const res = await fetch(
          `${SEATTLE_ECA_FEATURE_SERVER}/${layerId}/query?${params}`,
          { signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { error?: unknown; count?: number };
        if (data.error) return;
        const n = data.count ?? 0;
        if (n > 0) hits.push(layerId);
      } catch {
        /* ignore layer failures — other layers may still succeed */
      }
    })
  );

  return hits.sort((a, b) => a - b);
}

/**
 * Merge ECA polygon/point intersections into feasibility flags so ADU report ECA penalties apply.
 * Uses conservative minimums for %-based fields when GIS confirms overlap but factors lack detail.
 */
export function applySeattleEcaLayersToFeasibility(
  base: FeasibilityData,
  layerIds: number[]
): FeasibilityData {
  if (layerIds.length === 0) return base;
  const f = { ...base };
  const ids = new Set(layerIds);
  f.ecaSeattleGisLayers = layerIds.map((id) => SEATTLE_ECA_LAYER_NAMES[id]).filter(Boolean);

  if (ids.has(0)) f.floodProne = true;
  if (ids.has(1) || ids.has(2)) f.knownSlide = true;
  if (ids.has(3)) f.potentialSlide = true;
  if (ids.has(4)) f.landfill = true;
  if (ids.has(5)) f.liquefaction = true;
  if (ids.has(6)) f.peat = true;
  if (ids.has(7)) f.potentialSlide = true;
  if (ids.has(8)) f.riparianPercent = Math.max(f.riparianPercent ?? 0, 0.08);
  if (ids.has(9)) f.steepSlopePercent = Math.max(f.steepSlopePercent ?? 0, 0.12);
  if (ids.has(10)) f.wetlandPercent = Math.max(f.wetlandPercent ?? 0, 0.08);
  if (ids.has(11)) f.wildlifePercent = Math.max(f.wildlifePercent ?? 0, 0.08);

  return f;
}
