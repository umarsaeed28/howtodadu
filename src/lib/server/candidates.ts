/**
 * DADU candidates for the home map.
 *
 * Eligibility comes from CURRENT city data (PARCEL_GEO): base zone NR, present use
 * single-family, privately owned. Site factors (alley, corner, canopy, slope, ADU counts)
 * come from the ADUniverse feasibility-factors layer (2021 vintage) joined by PIN.
 * Each lot is scored with the same function the report uses so a pin and its report agree.
 *
 * INTERIM: the DADU footprint rules inside generateADUReport are being replaced by the
 * verified-code architect engine (see the plan). Until then, lot size and footprint come from it.
 */
import { generateADUReport } from "@/lib/adu-analysis";
import { siteScoreFor } from "@/lib/feasibility-table-model";
import { MIN_DADU_SQFT, gradeOf, type Tier } from "@/lib/dadu-score";
import type { FeasibilityResult, ParcelData } from "@/lib/feasibility";
import { str, num } from "@/lib/geo-helpers";
import { factorsToFeasibilityData } from "./factors-map";
import { sideClearance, type Ring } from "@/lib/side-clearance";
import { analyzeTrees, streetAxis, type Crown, type TreeStats } from "@/lib/tree-analysis";
import { gradeFrom, spotSamplePoints, type GradeStats } from "@/lib/grade";
import { sampleElevations } from "./elevation";

const ARCGIS = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services";
const FACTORS_URL = `${ARCGIS}/ADUniverse_feasibility_factors/FeatureServer/0/query`;
const TREES_URL = `${ARCGIS}/TreeCrowns_2021_Seattle/FeatureServer/0/query`;
const PARCEL_GEO_URL = `${ARCGIS}/PARCEL_GEO/FeatureServer/0/query`;
const BUILDINGS_URL = `${ARCGIS}/Building_Outlines_2023/FeatureServer/0/query`;

/** ArcGIS caps a page at 2000 records. */
export const PAGE_LIMIT = 2000;
/** A DADU smaller than this is not worth building, so the lot is not a candidate. */
export { MIN_DADU_SQFT };
export type { Tier };

/** Grade from the site score (rag/documents/36): 3 top pick 93+, 2 good 82+, 1 fair 70+, 0 marginal. */
export function tierOf(score: number): Tier {
  return gradeOf(score).tier;
}
export type Bbox = [number, number, number, number]; // west, south, east, north

export interface Candidate {
  pin: string;
  address: string;
  lat: number;
  lng: number;
  /** 0-100, same score as the report. */
  score: number;
  zoning: string;
  lotSqft: number;
  lotType: string | null;
  alley: boolean;
  canopyPct: number | null;
  steepPct: number | null;
  adusNearby: number;
  zip: string | null;
  corner: boolean;
  /** Tier 3: score 93 and up. The lots to look at first. */
  topPick: boolean;
  /** 3 top pick, 2 good, 1 fair, 0 marginal. Drives the map colors. */
  tier: Tier;
  /** Maximum DADU size the lot can carry, from the same rules the report uses. */
  daduSqft: number | null;
  /** Lot shape from the city's minimum bounding rectangle, feet. */
  lotWidth: number | null;
  lotDepth: number | null;
  existingAdus: number | null;
  /** Room the house leaves on its wider side, feet (2023 building outlines). Null when not measured. */
  sideClearanceFt: number | null;
  /** Trees measured one by one from the 2021 LiDAR crowns. Null when not measured (older library files). */
  trees?: TreeStats | null;
  /** Share of the lot under buildings, 0 to 100: 2023 building outlines, else ADUniverse. Null when unknown. */
  coveragePct?: number | null;
  /** Slope of the ground across the DADU site (grade.ts). Null when not measured. */
  grade?: GradeStats | null;
}

export interface CandidatePage {
  candidates: Candidate[];
  /** True when the box held more eligible lots than one page returns. */
  truncated: boolean;
}

/** Present use that counts as an existing single-family home. Vacant lots are excluded. */
export const SINGLE_FAMILY_USE = "Single Family(Res Use/Zone)";
/** The one consolidated Neighborhood Residential base zone (Ord. 127376). */
export const ELIGIBLE_BASE_ZONE = "NR";
/** Maximum ADUs per lot (SMC 23.42.022.C). A lot already at the cap is not a candidate. */
export const MAX_ADUS_PER_LOT = 2;

/** `where` for the current-parcel eligibility query. Pure, so it can be tested. */
export function parcelWhere(): string {
  return `BASE_ZONE='${ELIGIBLE_BASE_ZONE}' AND PRES_USE='${SINGLE_FAMILY_USE}' AND PUB_OWN_TYPE='PRIVATE'`;
}

/** The fields of a PARCEL_GEO record the library keeps. */
export interface EligibleParcel {
  pin: string;
  address: string;
  zip: string | null;
  lotSqft: number;
  zoning: string;
}

export function toEligibleParcel(a: Record<string, unknown>): EligibleParcel | null {
  const pin = str(a.PIN);
  const address = (str(a.ADDRESS) ?? "").replace(/\s+/g, " ").trim();
  const lotSqft = num(a.LOT_SQFT);
  const zoning = str(a.ZONING);
  if (!pin || !address || !lotSqft || !zoning) return null;
  return { pin, address, zip: str(a.STR_ZIP), lotSqft, zoning };
}

const OUT_FIELDS = "*";

interface RawFeature {
  attributes: Record<string, unknown>;
  centroid?: { x: number; y: number };
  geometry?: { rings?: number[][][] };
}

/** `sideClearanceFt`: room the house leaves on its wider side, measured from building outlines (null if unmeasured). */
export function toCandidate(f: RawFeature, parcelRow: EligibleParcel, sideClearanceFt: number | null = null, trees: TreeStats | null = null, builtSqft: number | null = null, grade: GradeStats | null = null): Candidate | null {
  const a = f.attributes;
  const c = f.centroid;
  const { pin, address, zoning, lotSqft } = parcelRow;
  if (!c) return null;
  const feasibility = factorsToFeasibilityData(a);
  feasibility.sideClearanceFt = sideClearanceFt;
  feasibility.treeStats = trees;
  feasibility.gradeStats = grade;
  if ((feasibility.totalADU ?? 0) >= MAX_ADUS_PER_LOT) return null; // already at the ADU cap
  const parcel: ParcelData = {
    address: address || null,
    pin,
    lotSqft,
    developableAreaSqft: lotSqft,
    zoning,
    zoningCategory: zoning,
    baseZone: zoning,
    zoningOverlay: null,
    existingUse: SINGLE_FAMILY_USE,
    urbanVillage: null,
    yearBuilt: null,
    landValue: null,
    improvementValue: null,
    propType: null,
    platName: null,
    councilDistrict: null,
    zip: parcelRow.zip,
    shapeArea: null,
    shapeLength: null,
  };
  const result: FeasibilityResult = {
    coordinates: { lat: c.y, lng: c.x },
    parcel,
    feasibility,
    lot: null,
    contours: [],
    sitePlan: null,
  };
  const report = generateADUReport(parcel, feasibility);
  if (!report?.daduFootprint || report.daduFootprint.buildableSqft < MIN_DADU_SQFT) return null; // the rules leave no room for a DADU
  const site = siteScoreFor(result, report);
  if (!site.eligible) return null; // fails a gate: lot under 3,200 sf, ADU cap, or no room

  const corner = (feasibility.lotType ?? "").toLowerCase().includes("corner");
  return {
    pin,
    address,
    zip: parcelRow.zip,
    corner,
    topPick: site.tier === 3,
    tier: site.tier,
    lat: c.y,
    lng: c.x,
    score: site.score,
    zoning,
    lotSqft,
    lotType: feasibility.lotType,
    alley: feasibility.hasAlley,
    canopyPct: feasibility.treeCanopyPercent,
    steepPct: feasibility.steepSlopePercent,
    adusNearby: (feasibility.nearbyDADU ?? 0) + (feasibility.nearbyAADU ?? 0),
    daduSqft: report.daduFootprint.buildableSqft,
    lotWidth: feasibility.lotWidth,
    lotDepth: feasibility.lotDepth,
    existingAdus: feasibility.totalADU,
    sideClearanceFt,
    trees: trees ? { ...trees, clearSpot: null, siteSpot: null } : null,
    grade,
    coveragePct:
      builtSqft != null && lotSqft > 0
        ? Math.round((builtSqft / lotSqft) * 1000) / 10
        : feasibility.lotCoveragePercent == null ? null : Math.round((feasibility.lotCoveragePercent <= 1 ? feasibility.lotCoveragePercent * 100 : feasibility.lotCoveragePercent) * 10) / 10,
  };
}

/** Area of a lng/lat ring in square feet (shoelace on a local flat projection; fine at lot scale). */
export function ringAreaSqft(ring: Ring): number {
  if (ring.length < 3) return 0;
  const lat0 = ring[0][1], ftLat = 364567, ftLng = ftLat * Math.cos((lat0 * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    a += (p[0] * ftLng) * (q[1] * ftLat) - (q[0] * ftLng) * (p[1] * ftLat);
  }
  return Math.abs(a) / 2;
}

async function arcgisPage(url: string, params: Record<string, string>): Promise<{ features: RawFeature[]; error?: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${url}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(60000) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message ?? "ArcGIS error");
      return { features: (data.features ?? []) as RawFeature[] };
    } catch (e) {
      if (attempt === 3) return { features: [], error: e instanceof Error ? e.message : String(e) };
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return { features: [] };
}

async function pagedCount(url: string, where: string): Promise<number> {
  const res = await fetch(`${url}?${new URLSearchParams({ where, returnCountOnly: "true", f: "json" })}`);
  const d = await res.json();
  if (typeof d.count !== "number") throw new Error("Could not count records");
  return d.count;
}

async function runPool(offsets: number[], fn: (offset: number) => Promise<void>, workers = 4) {
  const queue = [...offsets];
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (let o = queue.shift(); o !== undefined; o = queue.shift()) await fn(o);
    })
  );
}

/** Every current, eligible single-family NR parcel, keyed by PIN. Throws if any page fails. */
export async function fetchEligibleParcels(onPage?: (done: number, total: number) => void): Promise<Map<string, EligibleParcel>> {
  const where = parcelWhere();
  const total = await pagedCount(PARCEL_GEO_URL, where);
  const offsets: number[] = [];
  for (let o = 0; o < total; o += PAGE_LIMIT) offsets.push(o);
  const out = new Map<string, EligibleParcel>();
  let done = 0;
  await runPool(offsets, async (o) => {
    const r = await arcgisPage(PARCEL_GEO_URL, {
      where,
      outFields: "PIN,ADDRESS,STR_ZIP,LOT_SQFT,ZONING",
      returnGeometry: "false",
      orderByFields: "OBJECTID",
      resultOffset: String(o),
      resultRecordCount: String(PAGE_LIMIT),
      f: "json",
    });
    if (r.error) throw new Error(`PARCEL_GEO page ${o}: ${r.error}`);
    for (const f of r.features) {
      const p = toEligibleParcel(f.attributes);
      if (p) out.set(p.pin, p);
    }
    done += 1;
    onPage?.(done, offsets.length);
  });
  return out;
}

/**
 * Page through the 2021 site-factors layer and keep lots that are eligible TODAY.
 * Used by the library build script, not by request handlers.
 */
/** Building outlines (2023) for the eligible lots, grouped by PIN, as lng/lat rings. */
export async function fetchBuildingsByPin(pins: Set<string>, onPage?: (done: number, total: number) => void): Promise<Map<string, Ring[]>> {
  const total = await pagedCount(BUILDINGS_URL, "1=1");
  const offsets: number[] = [];
  for (let o = 0; o < total; o += PAGE_LIMIT) offsets.push(o);
  const out = new Map<string, Ring[]>();
  let done = 0;
  await runPool(offsets, async (o) => {
    const r = await arcgisPage(BUILDINGS_URL, {
      where: "1=1",
      outFields: "PIN",
      returnGeometry: "true",
      outSR: "4326",
      geometryPrecision: "7",
      orderByFields: "OBJECTID",
      resultOffset: String(o),
      resultRecordCount: String(PAGE_LIMIT),
      f: "json",
    });
    if (r.error) throw new Error(`Buildings page ${o}: ${r.error}`);
    for (const f of r.features) {
      const pin = str(f.attributes.PIN);
      const ring = f.geometry?.rings?.[0];
      if (!pin || !pins.has(pin) || !ring) continue;
      const list = out.get(pin) ?? [];
      list.push(ring as Ring);
      out.set(pin, list);
    }
    done += 1;
    onPage?.(done, offsets.length);
  });
  return out;
}

/** Every 2021 LiDAR tree crown in Seattle (about 970,000), as a grid index for lookups by area. */
export interface CrownIndex {
  near(lng0: number, lat0: number, lng1: number, lat1: number): Crown[];
  size: number;
}
const CROWN_CELL = 0.001; // degrees, about 360 ft by 250 ft

export async function fetchTreeCrowns(onPage?: (done: number, total: number) => void): Promise<CrownIndex> {
  // Page by OBJECTID range, not offset: deep offsets on this layer take about 40 s a page, id ranges under 1 s.
  const stat = await fetch(`${TREES_URL}?${new URLSearchParams({ where: "1=1", outStatistics: JSON.stringify([{ statisticType: "max", onStatisticField: "OBJECTID", outStatisticFieldName: "mx" }]), f: "json" })}`).then((r) => r.json());
  const maxId = Number(stat?.features?.[0]?.attributes?.mx ?? stat?.features?.[0]?.attributes?.MX);
  if (!Number.isFinite(maxId)) throw new Error("Could not read the tree crown id range");
  const offsets: number[] = [];
  for (let o = 0; o <= maxId; o += PAGE_LIMIT) offsets.push(o);
  const grid = new Map<string, Crown[]>();
  let size = 0, done = 0;
  await runPool(offsets, async (o) => {
    const r = await arcgisPage(TREES_URL, {
      where: `OBJECTID > ${o} AND OBJECTID <= ${o + PAGE_LIMIT}`,
      outFields: "Hgt_Q98,Radius,Shape__Area",
      returnGeometry: "false",
      returnCentroid: "true",
      outSR: "4326",
      resultRecordCount: String(PAGE_LIMIT),
      f: "json",
    });
    if (r.error) throw new Error(`Tree crowns page ${o}: ${r.error}`);
    for (const f of r.features) {
      const c = f.centroid;
      if (!c) continue;
      const area = num(f.attributes.Shape__Area);
      const rad = area && area > 0 ? Math.sqrt(area / Math.PI) : num(f.attributes.Radius) ?? 3;
      const key = `${Math.floor(c.x / CROWN_CELL)},${Math.floor(c.y / CROWN_CELL)}`;
      const list = grid.get(key) ?? [];
      list.push({ lng: c.x, lat: c.y, r: rad, h: num(f.attributes.Hgt_Q98) });
      grid.set(key, list);
      size++;
    }
    done += 1;
    onPage?.(done, offsets.length);
  }, 6);
  return {
    size,
    near(lng0, lat0, lng1, lat1) {
      const out: Crown[] = [];
      for (let i = Math.floor(lng0 / CROWN_CELL); i <= Math.floor(lng1 / CROWN_CELL); i++)
        for (let j = Math.floor(lat0 / CROWN_CELL); j <= Math.floor(lat1 / CROWN_CELL); j++)
          for (const c of grid.get(`${i},${j}`) ?? []) if (c.lng >= lng0 && c.lng <= lng1 && c.lat >= lat0 && c.lat <= lat1) out.push(c);
      return out;
    },
  };
}

/** Measure one lot's trees: crowns within 45 ft of the lot (to catch overhang), the house, and the street side. */
export function treesForLot(ring: Ring, houses: Ring[], crowns: CrownIndex, address: string | null): TreeStats {
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const padLat = 45 / 364567, padLng = padLat / Math.cos((ys[0] * Math.PI) / 180);
  const near = crowns.near(Math.min(...xs) - padLng, Math.min(...ys) - padLat, Math.max(...xs) + padLng, Math.max(...ys) + padLat);
  const stats = analyzeTrees(ring as [number, number][], houses as [number, number][][], near, streetAxis(address));
  delete stats.clearSpot; // only the report draws it (siteSpot stays: the build samples its slope, then drops it)
  return stats;
}

export async function fetchAllCandidates(onPage?: (stage: string, done: number, total: number) => void): Promise<Candidate[]> {
  const eligible = await fetchEligibleParcels((d, t) => onPage?.("parcels", d, t));
  const buildings = await fetchBuildingsByPin(new Set(eligible.keys()), (d, t) => onPage?.("buildings", d, t));
  const crowns = await fetchTreeCrowns((d, t) => onPage?.("tree crowns", d, t));
  const total = await pagedCount(FACTORS_URL, "1=1");
  const offsets: number[] = [];
  for (let o = 0; o < total; o += PAGE_LIMIT) offsets.push(o);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const pending: { f: RawFeature; row: EligibleParcel; clearFt: number | null; trees: TreeStats | null; builtSqft: number | null }[] = [];
  let done = 0;
  await runPool(offsets, async (o) => {
    const r = await arcgisPage(FACTORS_URL, {
      where: "1=1",
      outFields: OUT_FIELDS,
      returnCentroid: "true",
      returnGeometry: "true",
      geometryPrecision: "7",
      outSR: "4326",
      orderByFields: "OBJECTID",
      resultOffset: String(o),
      resultRecordCount: String(PAGE_LIMIT),
      f: "json",
    });
    if (r.error) throw new Error(`Factors page ${o}: ${r.error}`);
    for (const f of r.features) {
      const pin = str(f.attributes.KCGIS_CGDB_PARCEL_SV_PIN);
      const row = pin ? eligible.get(pin) : undefined;
      if (!pin || !row || seen.has(pin)) continue;
      const ring = f.geometry?.rings?.[0] as Ring | undefined;
      const clear = ring ? sideClearance(ring, buildings.get(pin) ?? []) : null;
      const trees = ring ? treesForLot(ring, buildings.get(pin) ?? [], crowns, row.address) : null;
      const outlines = buildings.get(pin);
      const builtSqft = outlines?.length ? outlines.reduce((s, r) => s + ringAreaSqft(r), 0) : null;
      seen.add(pin);
      pending.push({ f, row, clearFt: clear?.maxFt ?? null, trees, builtSqft });
    }
    done += 1;
    onPage?.("factors", done, offsets.length);
  });

  // The slope of every lot's DADU site: 25 lidar samples a lot, 500 to a request.
  const points: [number, number][] = [];
  const spans = pending.map((p) => {
    const spot = p.trees?.siteSpot;
    if (!spot) return null;
    const pts = spotSamplePoints(spot);
    const at = points.length;
    points.push(...pts);
    return { at, n: pts.length };
  });
  const z = await sampleElevations(points, (d, t) => onPage?.("elevation", d, t));
  pending.forEach((p, i) => {
    const span = spans[i];
    const grade = span ? gradeFrom(points.slice(span.at, span.at + span.n), z.slice(span.at, span.at + span.n)) : null;
    const c = toCandidate(p.f, p.row, p.clearFt, p.trees, p.builtSqft, grade);
    if (c) out.push(c);
  });
  return out;
}
