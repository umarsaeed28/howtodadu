/**
 * Side clearance: how much room the house leaves on each side of the lot, measured from the city's building
 * outlines. A car can only reach the back of a lot with no alley if one side has at least a driveway's width.
 * Pure geometry, no I/O. Coordinates are lng/lat; they are projected to local feet around the lot.
 */
export type LngLat = [number, number];
export type Ring = LngLat[];

/** A driveway needs this much width (adu-analysis MIN_SIDE_ACCESS_FT). */
export const DRIVEWAY_FT = 10;

export interface Clearance {
  /** Room between the house and each side lot line, feet. */
  leftFt: number;
  rightFt: number;
  /** The wider side: the one a driveway would use. */
  maxFt: number;
  houseSqft: number;
}

type XY = [number, number];
const FT_PER_DEG = 111_320 * 3.28084;

function toFeet(rings: Ring[], lat0: number, lng0: number): XY[][] {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return rings.map((r) => r.map(([lng, lat]) => [(lng - lng0) * k * FT_PER_DEG, (lat - lat0) * FT_PER_DEG] as XY));
}

function area(r: XY[]): number {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return Math.abs(s) / 2;
}

function centroid(r: XY[]): XY {
  let x = 0, y = 0;
  for (const p of r) {
    x += p[0];
    y += p[1];
  }
  return [x / r.length, y / r.length];
}

function inside([x, y]: XY, r: XY[]): boolean {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const rotate = (r: XY[], a: number): XY[] => {
  const c = Math.cos(-a), s = Math.sin(-a);
  return r.map(([x, y]) => [x * c - y * s, x * s + y * c] as XY);
};

/** Angle of the lot's long side: the orientation whose bounding box has the least area, then its longer side. */
function longAxis(r: XY[]): number {
  let best = { area: Infinity, angle: 0 };
  for (let i = 0; i < r.length - 1; i++) {
    const a = Math.atan2(r[i + 1][1] - r[i][1], r[i + 1][0] - r[i][0]);
    const q = rotate(r, a);
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    if (w * h < best.area - 1e-6) best = { area: w * h, angle: w >= h ? a : a + Math.PI / 2 };
  }
  return best.angle;
}

/** Parcel's extent across the lot (min and max y) on the vertical line at x. */
function spanAt(r: XY[], x: number): [number, number] | null {
  const ys: number[] = [];
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[j], [x2, y2] = r[i];
    if ((x1 <= x && x < x2) || (x2 <= x && x < x1)) ys.push(y1 + ((x - x1) * (y2 - y1)) / (x2 - x1));
  }
  return ys.length >= 2 ? [Math.min(...ys), Math.max(...ys)] : null;
}

/**
 * Clearance between the largest building on the lot (the house) and the two side lot lines, measured along the
 * house's length. Buildings whose centre is outside the lot (neighbours) are ignored. Null when no building is on the lot.
 */
export function sideClearance(parcel: Ring, buildings: Ring[]): Clearance | null {
  if (parcel.length < 4 || !buildings.length) return null;
  const [lng0, lat0] = parcel[0];
  const [p, ...bs] = toFeet([parcel, ...buildings], lat0, lng0);
  const own = bs.filter((b) => b.length >= 4 && inside(centroid(b), p));
  if (!own.length) return null;
  const house = own.reduce((a, b) => (area(b) > area(a) ? b : a));

  const ang = longAxis(p);
  const pr = rotate(p, ang);
  const hr = rotate(house, ang);
  const hx = hr.map((q) => q[0]), hy = hr.map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...hx), Math.max(...hx), Math.min(...hy), Math.max(...hy)];
  let left = Infinity, right = Infinity;
  for (let i = 0; i <= 8; i++) {
    const s = spanAt(pr, x0 + ((x1 - x0) * (i + 0.5)) / 9);
    if (!s) continue;
    left = Math.min(left, y0 - s[0]);
    right = Math.min(right, s[1] - y1);
  }
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const r1 = (n: number) => Math.max(0, Math.round(n * 10) / 10);
  return { leftFt: r1(left), rightFt: r1(right), maxFt: r1(Math.max(left, right)), houseSqft: Math.round(area(house)) };
}
