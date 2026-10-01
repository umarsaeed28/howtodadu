import { NextResponse } from "next/server";

const URL_ = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/ADUniverse_feasibility_factors/FeatureServer/0/query";
const MAX_SPAN = 0.022;
const PAGE = 2000;
const PAGES = 3;

/** GET /api/lot-shapes?bbox=w,s,e,n  Lot outlines (GeoJSON) for street-level zoom. Properties: pin. */
export async function GET(req: Request) {
  const parts = (new URL(req.url).searchParams.get("bbox") ?? "").split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return NextResponse.json({ error: "bad bbox" }, { status: 400 });
  const [w, s, e, n] = parts;
  if (e - w > MAX_SPAN || n - s > MAX_SPAN) return NextResponse.json({ error: "Zoom in for lot outlines." }, { status: 400 });
  const base = {
    geometry: parts.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "KCGIS_CGDB_PARCEL_SV_PIN",
    outSR: "4326",
    returnGeometry: "true",
    maxAllowableOffset: "0.000006",
    orderByFields: "OBJECTID",
    resultRecordCount: String(PAGE),
    f: "geojson",
  };
  try {
    const pages = await Promise.all(
      Array.from({ length: PAGES }, async (_, i) => {
        const res = await fetch(`${URL_}?${new URLSearchParams({ ...base, resultOffset: String(i * PAGE) })}`, { signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message ?? "ArcGIS error");
        return (data.features ?? []) as { geometry: unknown; properties?: Record<string, unknown> }[];
      })
    );
    const features = pages.flat().map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: { pin: String(f.properties?.KCGIS_CGDB_PARCEL_SV_PIN ?? "") },
    }));
    return NextResponse.json({ type: "FeatureCollection", features }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lot outlines unavailable" }, { status: 502 });
  }
}
