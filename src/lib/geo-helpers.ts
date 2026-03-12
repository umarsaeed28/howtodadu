const IMG_SIZE = 800;

export function normalizeAddr(a: string): string {
  return a
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function pickBestParcel(
  features: any[],
  lng: number,
  lat: number,
  searchAddress: string
): any {
  const norm = normalizeAddr(searchAddress);
  const searchNum = norm.match(/^(\d+)/)?.[1] ?? "";
  const searchStreet = norm
    .replace(/^\d+\s*/, "")
    .replace(/\s*(SEATTLE|WA|WASHINGTON|\d{5}).*$/i, "")
    .trim();

  if (searchNum && searchStreet) {
    for (const feat of features) {
      const addr = normalizeAddr(feat.attributes?.ADDRESS ?? "");
      if (
        addr.startsWith(searchNum + " ") &&
        addr.includes(searchStreet.split(" ")[0])
      ) {
        return feat;
      }
    }
  }

  let best = features[0];
  let bestDist = Infinity;

  for (const feat of features) {
    const rings: number[][] | undefined = feat.geometry?.rings?.[0];
    if (!rings || rings.length < 3) continue;
    const cx =
      rings.reduce((s: number, c: number[]) => s + c[0], 0) / rings.length;
    const cy =
      rings.reduce((s: number, c: number[]) => s + c[1], 0) / rings.length;
    const dist = (cx - lng) ** 2 + (cy - lat) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = feat;
    }
  }

  return best;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Ray-casting point-in-polygon. Polygon rings in [lng, lat] order. */
export function pointInPolygon(
  x: number,
  y: number,
  rings: number[][]
): boolean {
  if (rings.length < 3) return false;
  let inside = false;
  const n = rings.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = rings[i][0];
    const yi = rings[i][1];
    const xj = rings[j][0];
    const yj = rings[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

export function clipPathToBbox(
  fullPath: number[][],
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number
): number[][][] {
  const segments: number[][][] = [];
  let current: number[][] = [];

  for (const pt of fullPath) {
    const [x, y] = pt;
    const inside = x >= xmin && x <= xmax && y >= ymin && y <= ymax;
    if (inside) {
      current.push(pt);
    } else if (current.length > 0) {
      if (current.length >= 2) segments.push(current);
      current = [];
    }
  }
  if (current.length >= 2) segments.push(current);

  return segments;
}

export function buildLotData(rings: number[][]) {
  if (rings.length < 3) return null;

  const lngs = rings.map((c) => c[0]);
  const lats = rings.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const spanLngDeg = maxLng - minLng;
  const spanLatDeg = maxLat - minLat;
  const latScale = Math.cos((centerLat * Math.PI) / 180);

  const spanLngReal = spanLngDeg * latScale;
  const maxSpan = Math.max(spanLngReal, spanLatDeg);
  const padded = Math.max(maxSpan * 1.25, 0.002);

  const halfLng = padded / latScale / 2;
  const halfLat = padded / 2;

  const bbox: [number, number, number, number] = [
    centerLng - halfLng,
    centerLat - halfLat,
    centerLng + halfLng,
    centerLat + halfLat,
  ];

  const aerialUrl = `/api/aerial?bbox=${bbox.join(",")}&size=${IMG_SIZE},${IMG_SIZE}&style=topo`;

  return { rings, bbox, aerialUrl, imageSize: IMG_SIZE };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function num(v: any): number | null {
  return v != null && typeof v === "number" && !isNaN(v) ? v : null;
}
export function str(v: any): string | null {
  return v != null && typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}
export function bool(v: any): boolean {
  return v === 1 || v === "1" || v === true;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
