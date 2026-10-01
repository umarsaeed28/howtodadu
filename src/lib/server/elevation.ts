import type { TerrainGrid } from "@/lib/terrain";

/** USGS 3DEP elevation (1 m lidar DEM in Seattle). Values come back in meters. */
const SAMPLES_URL = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";
const M_TO_FT = 3.28084;
const CHUNK = 500;
const MAX_POINTS = 3000;

/**
 * A grid of ground elevations around a parcel: the parcel's box plus `marginM` on every side, about every
 * `stepM` meters (coarser when the box is large). Fail-soft: null when the service is down.
 */
export async function fetchTerrain(ring: number[][], marginM = 16, stepM = 1.5): Promise<TerrainGrid | null> {
  if (ring.length < 3) return null;
  const lngs = ring.map((p) => p[0]), lats = ring.map((p) => p[1]);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const mLat = 111_320, mLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const west = Math.min(...lngs) - marginM / mLng, east = Math.max(...lngs) + marginM / mLng;
  const south = Math.min(...lats) - marginM / mLat, north = Math.max(...lats) + marginM / mLat;
  let step = stepM;
  const size = () => ({ cols: Math.floor(((east - west) * mLng) / step) + 1, rows: Math.floor(((north - south) * mLat) / step) + 1 });
  while (size().cols * size().rows > MAX_POINTS) step *= 1.25;
  const { cols, rows } = size();
  const dLng = step / mLng, dLat = step / mLat;
  const pts: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([west + c * dLng, south + r * dLat]);

  try {
    const chunks: [number, number][][] = [];
    for (let i = 0; i < pts.length; i += CHUNK) chunks.push(pts.slice(i, i + CHUNK));
    const parts = await Promise.all(
      chunks.map(async (chunk) => {
        const body = new URLSearchParams({
          geometry: JSON.stringify({ points: chunk, spatialReference: { wkid: 4326 } }),
          geometryType: "esriGeometryMultipoint",
          returnFirstValueOnly: "true",
          f: "json",
        });
        const res = await fetch(SAMPLES_URL, { method: "POST", body, signal: AbortSignal.timeout(15000), next: { revalidate: 86400 * 30 } });
        const d = (await res.json()) as { samples?: { locationId: number; value: string }[]; error?: unknown };
        if (d.error || !d.samples) throw new Error("elevation service error");
        const z: (number | null)[] = new Array(chunk.length).fill(null);
        for (const s of d.samples) {
          const v = Number(s.value);
          if (Number.isFinite(v) && v > -100) z[s.locationId] = v * M_TO_FT;
        }
        return z;
      })
    );
    const z = parts.flat();
    if (!z.some((v) => v != null)) return null;
    return { lng0: west, lat0: south, dLng, dLat, cols, rows, z, source: "USGS 3DEP 1 m lidar elevation" };
  } catch {
    return null;
  }
}
