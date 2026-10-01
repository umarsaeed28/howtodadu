/**
 * Public alleys, from the city's legal right-of-way polygons (L_FEA_SYM = 9, "RW (Alley)").
 * The street network layer marks only 44 alley segments, so these polygons are the source.
 * Cached on disk (data/alleys.geojson) and in memory.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const URL_ = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/Right_of_Way_Polygon/FeatureServer/0/query";
const FILE = join(process.cwd(), "data", "alleys.geojson");
const PAGE = 2000;

export interface AlleyCollection {
  type: "FeatureCollection";
  features: { type: "Feature"; geometry: unknown; properties: Record<string, unknown> }[];
  pulledAt: string;
}

export async function fetchAlleys(): Promise<AlleyCollection> {
  const features: AlleyCollection["features"] = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({
      where: "L_FEA_SYM=9",
      outFields: "OBJECTID",
      outSR: "4326",
      maxAllowableOffset: "0.000006",
      orderByFields: "OBJECTID",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE),
      f: "geojson",
    });
    const res = await fetch(`${URL_}?${params}`, { signal: AbortSignal.timeout(60000) });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message ?? "ArcGIS error");
    const page = (d.features ?? []) as AlleyCollection["features"];
    features.push(...page.map((f) => ({ type: "Feature" as const, geometry: f.geometry, properties: { id: f.properties?.OBJECTID } })));
    if (page.length < PAGE) break;
  }
  return { type: "FeatureCollection", features, pulledAt: new Date().toISOString() };
}

let memo: AlleyCollection | null = null;

export async function getAlleys(): Promise<AlleyCollection> {
  if (memo) return memo;
  if (existsSync(FILE)) {
    memo = JSON.parse(readFileSync(FILE, "utf8")) as AlleyCollection;
    return memo;
  }
  memo = await fetchAlleys();
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(memo));
  } catch {
    /* read-only filesystem: keep the in-memory copy */
  }
  return memo;
}
