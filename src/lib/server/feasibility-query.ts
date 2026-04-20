import {
  pickBestParcel,
  clipPathToBbox,
  buildLotData,
  pointInPolygon,
  num,
  str,
  bool,
} from "@/lib/geo-helpers";
import type {
  FeasibilityResult,
  SitePlanData,
  SitePlanBuilding,
  SitePlanTree,
  SitePlanStreet,
  SitePlanDriveway,
  SitePlanAdjacentParcel,
} from "@/lib/feasibility";
import { emptyFeasibilityData } from "@/lib/feasibility";
import {
  applySeattleEcaLayersToFeasibility,
  querySeattleEcaIntersectingLayers,
} from "@/lib/server/seattle-eca-gis";

const ARCGIS_BASE =
  "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services";

const PARCELS_URL = `${ARCGIS_BASE}/ADUniverse_parcels/FeatureServer/0/query`;
const FACTORS_URL = `${ARCGIS_BASE}/ADUniverse_feasibility_factors/FeatureServer/0/query`;
const CONTOURS_URL = `${ARCGIS_BASE}/Contours_10ft_2016/FeatureServer/0/query`;
const BUILDINGS_URL = `${ARCGIS_BASE}/Building_Outlines_2023/FeatureServer/0/query`;
const TREES_URL = `${ARCGIS_BASE}/TreeCrowns_2021_Seattle/FeatureServer/0/query`;
const STREETS_URL = `${ARCGIS_BASE}/Street_Network_Database_SND/FeatureServer/0/query`;
const DRIVEWAYS_URL = `${ARCGIS_BASE}/Driveways_and_Parking_Lots/FeatureServer/10/query`;

const ESRI_GEOCODE =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    singleLine: address,
    location: "-122.335,47.608",
    distance: "25000",
    maxLocations: "1",
    outFields: "StAddr,City,Region",
    f: "json",
  });

  const res = await fetch(`${ESRI_GEOCODE}?${params}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  const c = data.candidates?.[0];
  if (!c || c.score < 70) return null;

  const city = (c.attributes?.City ?? "").toString().toLowerCase();
  if (city && city !== "seattle") return null;

  return { lat: c.location.y, lng: c.location.x };
}

async function queryParcelWithGeometry(
  lat: number,
  lng: number,
  searchAddress: string
) {
  const pointParams = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    outSR: "4326",
    returnGeometry: "true",
    f: "json",
  });

  let res = await fetch(`${PARCELS_URL}?${pointParams}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (res.ok) {
    const data = await res.json();
    if (!data.error && data.features?.length) {
      return {
        attributes: data.features[0].attributes,
        geometry: data.features[0].geometry as
          | { rings: number[][][] }
          | undefined,
      };
    }
  }

  const buf = 0.0004;
  const envParams = new URLSearchParams({
    geometry: `${lng - buf},${lat - buf},${lng + buf},${lat + buf}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    outSR: "4326",
    returnGeometry: "true",
    resultRecordCount: "10",
    f: "json",
  });

  res = await fetch(`${PARCELS_URL}?${envParams}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.error || !data.features?.length) return null;

  const pick = pickBestParcel(data.features, lng, lat, searchAddress);

  return {
    attributes: pick.attributes,
    geometry: pick.geometry as { rings: number[][][] } | undefined,
  };
}

async function queryFactors(lat: number, lng: number) {
  const pointParams = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });

  let pointRes = await fetch(`${FACTORS_URL}?${pointParams}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (pointRes.ok) {
    const d = await pointRes.json();
    if (!d.error && d.features?.length) return d.features[0].attributes;
  }

  const buf = 0.00015;
  const params = new URLSearchParams({
    geometry: `${lng - buf},${lat - buf},${lng + buf},${lat + buf}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    resultRecordCount: "1",
    f: "json",
  });

  const res = await fetch(`${FACTORS_URL}?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.error || !data.features?.length) return null;

  return data.features[0].attributes;
}

async function queryContours(bbox: [number, number, number, number]) {
  const [xmin, ymin, xmax, ymax] = bbox;
  const params = new URLSearchParams({
    geometry: `${xmin},${ymin},${xmax},${ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "CONTOUR,TYPE",
    outSR: "4326",
    returnGeometry: "true",
    f: "json",
  });

  try {
    const res = await fetch(`${CONTOURS_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !data.features?.length) return [];

    const result: { elevation: number; type: number; paths: number[][][] }[] =
      [];

    for (const f of data.features) {
      const clipped: number[][][] = [];
      for (const path of f.geometry.paths) {
        const segs = clipPathToBbox(path, xmin, ymin, xmax, ymax);
        clipped.push(...segs);
      }
      if (clipped.length > 0) {
        result.push({
          elevation: f.attributes.CONTOUR,
          type: f.attributes.TYPE,
          paths: clipped,
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}

async function queryBuildings(
  bbox: [number, number, number, number],
  parcelRings: number[][]
): Promise<SitePlanBuilding[]> {
  const [xmin, ymin, xmax, ymax] = bbox;
  const pad = 0.00015;
  const env = `${xmin - pad},${ymin - pad},${xmax + pad},${ymax + pad}`;
  const params = new URLSearchParams({
    geometry: env,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID,PIN,Shape__Area,AREA",
    outSR: "4326",
    returnGeometry: "true",
    resultRecordCount: "50",
    f: "json",
  });
  try {
    const res = await fetch(`${BUILDINGS_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !data.features?.length) return [];
    const buildings: SitePlanBuilding[] = [];
    for (const f of data.features) {
      const rings = f.geometry?.rings?.[0] as number[][] | undefined;
      if (!rings || rings.length < 3) continue;
      const cx =
        rings.reduce((s: number, c: number[]) => s + c[0], 0) / rings.length;
      const cy =
        rings.reduce((s: number, c: number[]) => s + c[1], 0) / rings.length;
      if (!pointInPolygon(cx, cy, parcelRings)) continue;
      const area = num(f.attributes?.Shape__Area ?? f.attributes?.AREA) ?? 0;
      buildings.push({
        rings,
        area: area || 0,
        pin: str(f.attributes?.PIN),
      });
    }
    return buildings.sort((a, b) => b.area - a.area);
  } catch {
    return [];
  }
}

async function queryTrees(
  bbox: [number, number, number, number],
  parcelRings: number[][]
): Promise<SitePlanTree[]> {
  const [xmin, ymin, xmax, ymax] = bbox;
  const pad = 0.0001;
  const env = `${xmin - pad},${ymin - pad},${xmax + pad},${ymax + pad}`;
  const params = new URLSearchParams({
    geometry: env,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID,Hgt_Q98,Radius,Shape__Area",
    outSR: "4326",
    returnGeometry: "true",
    resultRecordCount: "200",
    f: "json",
  });
  try {
    const res = await fetch(`${TREES_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !data.features?.length) return [];
    const trees: SitePlanTree[] = [];
    for (const f of data.features) {
      const geom = f.geometry;
      let cx: number;
      let cy: number;
      let radiusFt = 0;
      if (geom?.rings?.[0]) {
        const rings = geom.rings[0] as number[][];
        cx =
          rings.reduce((s: number, c: number[]) => s + c[0], 0) / rings.length;
        cy =
          rings.reduce((s: number, c: number[]) => s + c[1], 0) / rings.length;
        const area = num(f.attributes?.Shape__Area);
        if (area != null && area > 0) {
          radiusFt = Math.sqrt(area / Math.PI);
        } else {
          radiusFt = num(f.attributes?.Radius) ?? 0;
        }
      } else {
        continue;
      }
      if (!pointInPolygon(cx, cy, parcelRings)) continue;
      const heightFt = num(f.attributes?.Hgt_Q98);
      trees.push({
        centroid: [cx, cy],
        radiusFt: radiusFt || 3,
        heightFt: heightFt ?? undefined,
      });
    }
    return trees;
  } catch {
    return [];
  }
}

async function queryStreets(
  bbox: [number, number, number, number]
): Promise<SitePlanStreet[]> {
  const [xmin, ymin, xmax, ymax] = bbox;
  const pad = 0.0002;
  const env = `${xmin - pad},${ymin - pad},${xmax + pad},${ymax + pad}`;
  const params = new URLSearchParams({
    geometry: env,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    where: "SEGMENT_TYPE = 1 OR SEGMENT_TYPE = 5",
    outFields:
      "ORD_STNAME_CONCAT,ORD_PRE_DIR,ORD_STREET_NAME,ORD_STREET_TYPE,ORD_SUF_DIR",
    outSR: "4326",
    returnGeometry: "true",
    resultRecordCount: "30",
    f: "json",
  });
  try {
    const res = await fetch(`${STREETS_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !data.features?.length) return [];
    const seen = new Set<string>();
    const streets: SitePlanStreet[] = [];
    for (const f of data.features) {
      const concat = str(f.attributes?.ORD_STNAME_CONCAT);
      const parts = [
        str(f.attributes?.ORD_PRE_DIR),
        str(f.attributes?.ORD_STREET_NAME),
        str(f.attributes?.ORD_STREET_TYPE),
        str(f.attributes?.ORD_SUF_DIR),
      ]
        .filter(Boolean)
        .join(" ");
      const name = concat ?? (parts || "Street");
      if (seen.has(name)) continue;
      seen.add(name);
      const paths = f.geometry?.paths as number[][][] | undefined;
      if (!paths?.length) continue;
      streets.push({ name, paths });
    }
    return streets;
  } catch {
    return [];
  }
}

async function queryDriveways(
  bbox: [number, number, number, number],
  parcelRings: number[][]
): Promise<SitePlanDriveway[]> {
  const [xmin, ymin, xmax, ymax] = bbox;
  const pad = 0.0001;
  const env = `${xmin - pad},${ymin - pad},${xmax + pad},${ymax + pad}`;
  const params = new URLSearchParams({
    geometry: env,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID",
    outSR: "4326",
    returnGeometry: "true",
    resultRecordCount: "50",
    f: "json",
  });
  try {
    const res = await fetch(`${DRIVEWAYS_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !data.features?.length) return [];
    const driveways: SitePlanDriveway[] = [];
    for (const f of data.features) {
      const rings = f.geometry?.rings?.[0] as number[][] | undefined;
      if (!rings || rings.length < 3) continue;
      const cx =
        rings.reduce((s: number, c: number[]) => s + c[0], 0) / rings.length;
      const cy =
        rings.reduce((s: number, c: number[]) => s + c[1], 0) / rings.length;
      if (!pointInPolygon(cx, cy, parcelRings)) continue;
      driveways.push({ rings });
    }
    return driveways;
  } catch {
    return [];
  }
}

async function queryAdjacentParcels(
  bbox: [number, number, number, number],
  parcelRings: number[][],
  subjectPin: string | null
): Promise<SitePlanAdjacentParcel[]> {
  const [xmin, ymin, xmax, ymax] = bbox;
  const pad = 0.0003;
  const env = `${xmin - pad},${ymin - pad},${xmax + pad},${ymax + pad}`;
  const params = new URLSearchParams({
    geometry: env,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "PIN",
    outSR: "4326",
    returnGeometry: "true",
    resultRecordCount: "25",
    f: "json",
  });
  try {
    const res = await fetch(`${PARCELS_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error || !data.features?.length) return [];
    const adjacent: SitePlanAdjacentParcel[] = [];
    for (const f of data.features) {
      const pin = str(f.attributes?.PIN);
      if (subjectPin && pin === subjectPin) continue;
      const rings = f.geometry?.rings?.[0] as number[][] | undefined;
      if (!rings || rings.length < 3) continue;
      const cx =
        rings.reduce((s: number, c: number[]) => s + c[0], 0) / rings.length;
      const cy =
        rings.reduce((s: number, c: number[]) => s + c[1], 0) / rings.length;
      if (pointInPolygon(cx, cy, parcelRings)) continue;
      adjacent.push({ rings });
    }
    return adjacent;
  } catch {
    return [];
  }
}

export type FeasibilityQueryFailure = {
  ok: false;
  status: 400 | 404;
  error: string;
};

export type FeasibilityQuerySuccess = { ok: true; data: FeasibilityResult };

export async function getFeasibilityForAddress(
  address: string
): Promise<FeasibilityQuerySuccess | FeasibilityQueryFailure> {
  const trimmed = address.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "Address parameter is required" };
  }

  const coords = await geocode(trimmed);
  if (!coords) {
    return {
      ok: false,
      status: 404,
      error: "Could not find that address in Seattle",
    };
  }

  const [parcelResult, factors] = await Promise.all([
    queryParcelWithGeometry(coords.lat, coords.lng, trimmed),
    queryFactors(coords.lat, coords.lng),
  ]);

  const p = parcelResult?.attributes;

  if (!p && !factors) {
    return {
      ok: false,
      status: 404,
      error: "No parcel data found at this location",
    };
  }

  const parcelRings = parcelResult?.geometry?.rings?.[0] as
    | number[][]
    | undefined;

  const ecaLayerHits = await querySeattleEcaIntersectingLayers(
    coords.lng,
    coords.lat,
    { parcelRing: parcelRings }
  );

  const lotData = parcelRings ? buildLotData(parcelRings) : null;
  const bbox = lotData?.bbox;

  const subjectPin = p ? str(p.PIN) : null;
  const [contours, buildings, trees, streets, driveways, adjacentParcels] =
    await Promise.all([
      lotData ? queryContours(lotData.bbox) : [],
      lotData && parcelRings ? queryBuildings(lotData.bbox, parcelRings) : [],
      lotData && parcelRings ? queryTrees(lotData.bbox, parcelRings) : [],
      bbox ? queryStreets(bbox) : [],
      lotData && parcelRings ? queryDriveways(lotData.bbox, parcelRings) : [],
      lotData && parcelRings
        ? queryAdjacentParcels(lotData.bbox, parcelRings, subjectPin)
        : [],
    ]);

  const sitePlan: SitePlanData | null =
    lotData &&
    (buildings.length > 0 ||
      trees.length > 0 ||
      streets.length > 0 ||
      driveways.length > 0 ||
      adjacentParcels.length > 0)
      ? { buildings, trees, streets, driveways, adjacentParcels }
      : null;

  const f = factors;

  let feasibilityMerged =
    f || ecaLayerHits.length > 0
      ? applySeattleEcaLayersToFeasibility(
          f
            ? {
                lotType: str(f.LOT_TYPE),
                hasAlley: bool(f.ALLEY),
                totalBuildingSqft: num(f.TOT_SQFT),
                lotCoveragePercent: num(f.COVERAGE_PC),
                lotCoverageOver: bool(f.LOTCOV_OVER),
                lotWidth: f.MBG_Width ? Math.round(f.MBG_Width) : null,
                lotDepth: f.MBG_Length ? Math.round(f.MBG_Length) : null,
                boundRatio: num(f.bound_ratio),
                steepSlopePercent: num(f.STEEPSLOPE_PC),
                steepSlopeArea: num(f.STEEPSLOPE_AREA),
                wetlandPercent: num(f.WETLAND_PC),
                wetlandArea: num(f.WETLAND_AREA),
                wildlifePercent: num(f.WILDLIFE_PC),
                wildlifeArea: num(f.WILDLIFE_AREA),
                riparianPercent: num(f.RIPARIAN_PC),
                riparianArea: num(f.RIPARIAN_AREA),
                floodProne: bool(f.FLOODPRONE),
                liquefaction: bool(f.LIQUEFACTION),
                knownSlide: bool(f.KNOWNSLIDE),
                potentialSlide: bool(f.POTENTIALSLIDE),
                peat: bool(f.PEAT),
                landfill: bool(f.LANDFILL),
                shoreline: str(f.SHORELINE),
                treeCanopyPercent: num(f.TREE_CANOPY_PC),
                existingAADU: num(f.AADU_COUNT),
                existingDADU: num(f.DADU_COUNT),
                totalADU: num(f.ADU_TOTAL),
                nearbyDADU: num(f.DADU_NEAR_1320),
                nearbyAADU: num(f.AADU_NEAR_1320),
                nearestAADUDist: num(f.NEAREST1AADU_DIST),
                nearestDADUDist: num(f.NEAREST1DADU_DIST),
                detachedGarageCount: num(f.COUNT_DETGAR),
                detachedGarageSqft: num(f.SIZE_DETGAR),
                basementSqft: num(f.SUM_SQFTTOTBASEMENT),
                daylightBasement: str(f.DAYLIGHTBASEMENT),
                minYearBuilt: num(f.MIN_YRBUILT),
                maxYearRenovated: num(f.MAX_YRRENOVATED),
                parcelLineCount: num(f.line_count),
                shapeArea: num(f.Shape__Area),
                shapeLength: num(f.Shape__Length),
                ecaSeattleGisLayers: null,
              }
            : emptyFeasibilityData(),
          ecaLayerHits
        )
      : null;

  const data: FeasibilityResult = {
    coordinates: coords,
    contours,
    parcel: p
      ? {
          address: str(p.ADDRESS)?.replace(/\s+/g, " ") ?? null,
          pin: str(p.PIN),
          lotSqft: num(p.SQFTLOT),
          developableAreaSqft: num(p.LAND_NO_SHORE_SQFT),
          zoning: str(p.ZONING),
          zoningCategory: str(p.ZONELUT),
          baseZone: str(p.BASE_ZONE),
          zoningOverlay: str(p.ZONE_GEO),
          existingUse: str(p.PRES_USE_DESC),
          urbanVillage: str(p.UV_NAME),
          yearBuilt: str(p.YEAR_BUILT),
          landValue: num(p.LAND_AV),
          improvementValue: num(p.BLDG_AV),
          propType: str(p.PROPTYPE),
          platName: str(p.PLATNAME),
          councilDistrict: num(p.COUNCIL_DIST),
          zip: str(p.STR_ZIP),
          shapeArea: num(p.Shape__Area),
          shapeLength: num(p.Shape__Length),
        }
      : null,
    feasibility: feasibilityMerged,
    lot: lotData,
    sitePlan: sitePlan ?? undefined,
  };

  return { ok: true, data };
}
