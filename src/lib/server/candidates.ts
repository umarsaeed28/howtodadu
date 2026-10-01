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
import { buildFeasibilityTableRow } from "@/lib/feasibility-table-model";
import type { FeasibilityResult, ParcelData } from "@/lib/feasibility";
import { str, num } from "@/lib/geo-helpers";
import { factorsToFeasibilityData } from "./factors-map";

const ARCGIS = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services";
const FACTORS_URL = `${ARCGIS}/ADUniverse_feasibility_factors/FeatureServer/0/query`;
const PARCEL_GEO_URL = `${ARCGIS}/PARCEL_GEO/FeatureServer/0/query`;

/** ArcGIS caps a page at 2000 records. */
export const PAGE_LIMIT = 2000;
/** A DADU smaller than this is not worth building, so the lot is not a candidate. */
export const MIN_DADU_SQFT = 300;
/**
 * Top pick: a corner or alley lot with a clean site. Scores here run 64 to 89 across the city,
 * so the bar is high, and the lot must also have no steep slope, light canopy and room for a full 1,000 sf DADU.
 */
export const TOP_PICK_SCORE = 85;
/** The map shows only lots scoring 80 or more. Below that is not worth showing. */
export const GOOD_SCORE = 80;
export const MAP_MIN_SCORE = GOOD_SCORE;
export const FAIR_SCORE = 74;

export type Tier = 3 | 2 | 1 | 0; // 3 top pick, 2 good, 1 fair, 0 hard

const pct100 = (v: number | null) => (v == null ? 0 : v <= 1 ? v * 100 : v);

export function isTopPick(o: { score: number; corner: boolean; alley: boolean; steepPct: number | null; canopyPct: number | null; daduSqft: number | null }): boolean {
  return (
    (o.corner || o.alley) &&
    o.score >= TOP_PICK_SCORE &&
    pct100(o.steepPct) === 0 &&
    pct100(o.canopyPct) <= 25 &&
    (o.daduSqft ?? 0) >= 1000
  );
}

export function tierOf(score: number, topPick: boolean): Tier {
  return topPick ? 3 : score >= GOOD_SCORE ? 2 : score >= FAIR_SCORE ? 1 : 0;
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
  /** Corner or alley lot with a clean site and a high score. The lots to look at first. */
  topPick: boolean;
  /** 3 top pick, 2 good, 1 fair, 0 hard. Drives the map colors. */
  tier: Tier;
  /** Maximum DADU size the lot can carry, from the same rules the report uses. */
  daduSqft: number | null;
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
}

export function toCandidate(f: RawFeature, parcelRow: EligibleParcel): Candidate | null {
  const a = f.attributes;
  const c = f.centroid;
  const { pin, address, zoning, lotSqft } = parcelRow;
  if (!c) return null;
  const feasibility = factorsToFeasibilityData(a);
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
  const row = buildFeasibilityTableRow(result, report);

  const corner = feasibility.lotType?.toLowerCase() === "corner";
  const topPick = isTopPick({
    score: row.daduScore,
    corner,
    alley: feasibility.hasAlley,
    steepPct: feasibility.steepSlopePercent,
    canopyPct: feasibility.treeCanopyPercent,
    daduSqft: report.daduFootprint.buildableSqft,
  });
  return {
    pin,
    address,
    zip: parcelRow.zip,
    corner,
    topPick,
    tier: tierOf(row.daduScore, topPick),
    lat: c.y,
    lng: c.x,
    score: row.daduScore,
    zoning,
    lotSqft,
    lotType: feasibility.lotType,
    alley: feasibility.hasAlley,
    canopyPct: feasibility.treeCanopyPercent,
    steepPct: feasibility.steepSlopePercent,
    adusNearby: (feasibility.nearbyDADU ?? 0) + (feasibility.nearbyAADU ?? 0),
    daduSqft: report.daduFootprint.buildableSqft,
  };
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
export async function fetchAllCandidates(onPage?: (stage: string, done: number, total: number) => void): Promise<Candidate[]> {
  const eligible = await fetchEligibleParcels((d, t) => onPage?.("parcels", d, t));
  const total = await pagedCount(FACTORS_URL, "1=1");
  const offsets: number[] = [];
  for (let o = 0; o < total; o += PAGE_LIMIT) offsets.push(o);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  let done = 0;
  await runPool(offsets, async (o) => {
    const r = await arcgisPage(FACTORS_URL, {
      where: "1=1",
      outFields: OUT_FIELDS,
      returnCentroid: "true",
      returnGeometry: "false",
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
      const c = toCandidate(f, row);
      if (c) {
        seen.add(pin);
        out.push(c);
      }
    }
    done += 1;
    onPage?.("factors", done, offsets.length);
  });
  return out;
}
