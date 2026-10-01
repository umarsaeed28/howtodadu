/**
 * Ground elevation around a lot: a regular grid of samples (feet, NAVD88) from the USGS 3DEP 1 m lidar DEM.
 * Pure helpers: elevation at a point, contour lines (marching squares) and a profile along a line.
 */
export interface TerrainGrid {
  /** South-west corner of the grid, degrees. */
  lng0: number;
  lat0: number;
  /** Step between samples, degrees. */
  dLng: number;
  dLat: number;
  cols: number;
  rows: number;
  /** Row-major from the south-west corner: z[row * cols + col]. Feet. Null where the DEM has no data. */
  z: (number | null)[];
  source: string;
}

const at = (g: TerrainGrid, c: number, r: number) => g.z[r * g.cols + c];

/** Bilinear elevation at a point, feet. Null outside the grid or next to a gap. */
export function elevationAt(g: TerrainGrid, lng: number, lat: number): number | null {
  const fc = (lng - g.lng0) / g.dLng, fr = (lat - g.lat0) / g.dLat;
  const c = Math.floor(fc), r = Math.floor(fr);
  if (c < 0 || r < 0 || c >= g.cols - 1 || r >= g.rows - 1) return null;
  const a = at(g, c, r), b = at(g, c + 1, r), d = at(g, c, r + 1), e = at(g, c + 1, r + 1);
  if (a == null || b == null || d == null || e == null) return null;
  const tx = fc - c, ty = fr - r;
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + d * (1 - tx) * ty + e * tx * ty;
}

export interface Contour {
  elevation: number;
  /** Index contours (every 10 ft) are drawn heavier and labelled. */
  index: boolean;
  /** Line segments as [[lng, lat], [lng, lat]]. */
  segments: [number, number][][];
}

/**
 * Contour lines every `interval` feet by marching squares over the grid. Saddle cells are split by the cell
 * average. Segments are not joined into polylines; drawn as one path they read the same.
 */
export function contourLines(g: TerrainGrid, interval = 2, indexEvery = 10): Contour[] {
  const vals = g.z.filter((v): v is number => v != null);
  if (!vals.length) return [];
  const lo = Math.ceil(Math.min(...vals) / interval) * interval;
  const hi = Math.floor(Math.max(...vals) / interval) * interval;
  const out: Contour[] = [];
  const pt = (c: number, r: number): [number, number] => [g.lng0 + c * g.dLng, g.lat0 + r * g.dLat];
  const lerp = (p: [number, number], q: [number, number], zp: number, zq: number, level: number): [number, number] => {
    const t = zq === zp ? 0.5 : (level - zp) / (zq - zp);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  for (let level = lo; level <= hi; level += interval) {
    const segments: [number, number][][] = [];
    for (let r = 0; r < g.rows - 1; r++) {
      for (let c = 0; c < g.cols - 1; c++) {
        const z0 = at(g, c, r), z1 = at(g, c + 1, r), z2 = at(g, c + 1, r + 1), z3 = at(g, c, r + 1);
        if (z0 == null || z1 == null || z2 == null || z3 == null) continue;
        const p0 = pt(c, r), p1 = pt(c + 1, r), p2 = pt(c + 1, r + 1), p3 = pt(c, r + 1);
        const idx = (z0 >= level ? 1 : 0) | (z1 >= level ? 2 : 0) | (z2 >= level ? 4 : 0) | (z3 >= level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        // Crossing points on the four cell edges: bottom (0-1), right (1-2), top (2-3), left (3-0).
        const e = {
          b: () => lerp(p0, p1, z0, z1, level),
          rt: () => lerp(p1, p2, z1, z2, level),
          t: () => lerp(p3, p2, z3, z2, level),
          l: () => lerp(p0, p3, z0, z3, level),
        };
        const centreHigh = (z0 + z1 + z2 + z3) / 4 >= level;
        const pairs: Record<number, (keyof typeof e)[][]> = {
          1: [["l", "b"]], 2: [["b", "rt"]], 3: [["l", "rt"]], 4: [["rt", "t"]],
          5: centreHigh ? [["l", "t"], ["b", "rt"]] : [["l", "b"], ["rt", "t"]],
          6: [["b", "t"]], 7: [["l", "t"]], 8: [["t", "l"]], 9: [["t", "b"]],
          10: centreHigh ? [["b", "l"], ["t", "rt"]] : [["b", "rt"], ["t", "l"]],
          11: [["t", "rt"]], 12: [["rt", "l"]], 13: [["rt", "b"]], 14: [["b", "l"]],
        };
        for (const [a, b] of pairs[idx]) segments.push([e[a](), e[b]()]);
      }
    }
    if (segments.length) out.push({ elevation: level, index: level % indexEvery === 0, segments });
  }
  return out;
}

/** Elevations every `stepFt` along a line, as distance from the start (feet) and elevation (feet or null). */
export function profile(g: TerrainGrid, from: [number, number], to: [number, number], lengthFt: number, stepFt = 1): { s: number; z: number | null }[] {
  const n = Math.max(2, Math.round(lengthFt / stepFt) + 1);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { s: t * lengthFt, z: elevationAt(g, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t) };
  });
}
