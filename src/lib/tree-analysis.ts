import { lotRotation, turn, unturn } from "./lot-orientation";

/**
 * Tree-by-tree read of a lot from the city's 2021 LiDAR tree crowns: how many medium and large trees there are, how much
 * of the lot they cover, and whether a DADU footprint still fits on open ground once their root zones are kept clear.
 *
 * Size classes stand in for Seattle's tree tiers (SMC 25.11), which go by trunk diameter (DSH). LiDAR measures the crown,
 * not the trunk, so the class is an estimate: a crown 30 ft across or a tree 50 ft tall is usually 24 in DSH or more
 * (Tier 2, protected); a crown 20 ft across or 30 ft tall is usually 12 in or more (Tier 3, replacement required).
 * The protected area is the dripline (the crown), the usual stand-in for the root protection zone.
 */

export interface Crown {
  lng: number;
  lat: number;
  /** Crown radius, feet. */
  r: number;
  /** Height, feet (LiDAR 98th percentile). */
  h: number | null;
}

export type TreeSize = "large" | "medium" | "small";

export const LARGE_CROWN_RADIUS_FT = 15;
export const LARGE_HEIGHT_FT = 50;
export const MEDIUM_CROWN_RADIUS_FT = 10;
export const MEDIUM_HEIGHT_FT = 30;
/** Smallest footprint worth calling a DADU site: 15 by 20 ft. */
export const MIN_FOOTPRINT_SQFT = 300;
export const MIN_FOOTPRINT_SIDE_FT = 15;
const HOUSE_GAP_FT = 5;
const SETBACK_FT = 5;
/** The front yard, between the street and the house, is not a DADU site. */
const FRONT_YARD_FT = 20;

/** Which way the address street runs: Seattle avenues north-south, streets east-west. Null for other names. */
export function streetAxis(address: string | null | undefined): "ns" | "ew" | null {
  const a = (address ?? "").split(",")[0].toUpperCase().trim().replace(/\s+\d{5}(-\d{4})?$/, "").replace(/\s+(N|S|E|W|NE|NW|SE|SW)$/, "");
  if (/\s(AVE|AV|AVENUE)$/.test(a)) return "ns";
  if (/\s(ST|STREET)$/.test(a)) return "ew";
  return null;
}

export function treeSize(c: Pick<Crown, "r" | "h">): TreeSize {
  if (c.r >= LARGE_CROWN_RADIUS_FT || (c.h ?? 0) >= LARGE_HEIGHT_FT) return "large";
  if (c.r >= MEDIUM_CROWN_RADIUS_FT || (c.h ?? 0) >= MEDIUM_HEIGHT_FT) return "medium";
  return "small";
}

export interface TreeStats {
  /** Trees whose crowns reach the lot, including a neighbour's overhanging the line. */
  large: number;
  medium: number;
  small: number;
  /** Share of the lot under any crown, 0 to 100 (overlaps counted once). */
  canopyPct: number;
  /** Largest rectangle (at least 15 ft a side) clear of medium and large crowns, the house and the setbacks. Square feet. */
  clearSqft: number;
  /** The same, keeping clear of large crowns only: what is possible if medium trees are removed and replaced. */
  clearSqftIfMediumRemoved: number;
  /** Largest spot for a DADU before trees are considered, square feet: tells "the trees block it" from "the house does". */
  siteSqft?: number;
  /** Where that spot was looked for: behind the house, or (when the house leaves none) past its front wall, side yards included. */
  site?: "behind" | "side";
  /** Where the clear spot is, in lng/lat corners (for drawing). Null when there is none. */
  clearSpot?: [number, number][] | null;
}

type Pt = { x: number; y: number };

const FT_PER_DEG_LAT = 364567;

function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function edgeDist(p: Pt, poly: Pt[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(p, poly[i], poly[(i + 1) % poly.length]));
  return d;
}

/** Largest all-true rectangle with both sides at least `minSide` cells (maximal-rectangle stack method). */
export function largestRect(ok: Uint8Array, w: number, h: number, minSide: number): { area: number; x: number; y: number; w: number; h: number } {
  const heights = new Int32Array(w);
  let best = { area: 0, x: 0, y: 0, w: 0, h: 0 };
  const stack: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) heights[x] = ok[y * w + x] ? heights[x] + 1 : 0;
    stack.length = 0;
    for (let x = 0; x <= w; x++) {
      const cur = x === w ? 0 : heights[x];
      while (stack.length && heights[stack[stack.length - 1]] >= cur) {
        const top = stack.pop()!;
        const hh = heights[top];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const ww = x - left;
        if (hh >= minSide && ww >= minSide && hh * ww > best.area) best = { area: hh * ww, x: left, y: y - hh + 1, w: ww, h: hh };
      }
      stack.push(x);
    }
  }
  return best;
}

/**
 * Measure the trees on one lot. Coordinates are lng/lat; the lot is squared to its own sides first, so a clear spot is a
 * rectangle that lines up with the lot lines, the way a DADU would be placed.
 */
export function analyzeTrees(lot: [number, number][], buildings: [number, number][][], crowns: Crown[], streetRuns: "ns" | "ew" | null = null): TreeStats {
  const lat0 = lot.reduce((s, p) => s + p[1], 0) / lot.length;
  const lng0 = lot.reduce((s, p) => s + p[0], 0) / lot.length;
  const ftLng = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const raw = (p: [number, number]): Pt => ({ x: (p[0] - lng0) * ftLng, y: -(p[1] - lat0) * FT_PER_DEG_LAT });
  const lotRaw = lot.map(raw);
  const theta = lotRotation(lotRaw);
  const L = (p: [number, number]) => unturn(raw(p), theta);
  const lotPts = lotRaw.map((p) => unturn(p, theta));
  const houses = buildings.map((b) => b.map(L));
  const trees = crowns.map((c) => ({ c: L([c.lng, c.lat]), r: c.r, size: treeSize(c) }));

  const x0 = Math.min(...lotPts.map((p) => p.x)), x1 = Math.max(...lotPts.map((p) => p.x));
  const y0 = Math.min(...lotPts.map((p) => p.y)), y1 = Math.max(...lotPts.map((p) => p.y));
  // 1 ft cells; 2 ft on very large lots to keep the build fast.
  const cell = (x1 - x0) * (y1 - y0) > 60000 ? 2 : 1;
  const W = Math.max(1, Math.ceil((x1 - x0) / cell)), H = Math.max(1, Math.ceil((y1 - y0) / cell));

  // The front is the street side. Seattle avenues run north-south (street to the west or east), streets east-west (north or
  // south); of those two sides, the front is the one the house sits nearer. Other names: the side nearest the house.
  // The DADU goes behind the house: past its back wall plus the 5 ft gap. Side strips stay free (they carry the driveway).
  const area = (pts: Pt[]) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
  const house = houses.reduce<Pt[] | null>((b, h) => (!b || area(h) > area(b) ? h : b), null);
  // Two candidate sites: behind the house (preferred), and anywhere past the house's front wall and the 20 ft front yard
  // (side yards included), used only when the house leaves no 15 by 20 ft spot behind it.
  let behind: (p: Pt) => boolean = () => true;
  let pastFront: (p: Pt) => boolean = () => true;
  if (house) {
    const hx0 = Math.min(...house.map((p) => p.x)), hx1 = Math.max(...house.map((p) => p.x));
    const hy0 = Math.min(...house.map((p) => p.y)), hy1 = Math.max(...house.map((p) => p.y));
    const F = FRONT_YARD_FT, G = HOUSE_GAP_FT;
    const sides = [
      { axis: "ew", d: hy0 - y0, behind: (p: Pt) => p.y > hy1 + G, past: (p: Pt) => p.y > Math.max(y0 + F, hy0) }, // street on the north (top)
      { axis: "ew", d: y1 - hy1, behind: (p: Pt) => p.y < hy0 - G, past: (p: Pt) => p.y < Math.min(y1 - F, hy1) }, // south
      { axis: "ns", d: hx0 - x0, behind: (p: Pt) => p.x > hx1 + G, past: (p: Pt) => p.x > Math.max(x0 + F, hx0) }, // west
      { axis: "ns", d: x1 - hx1, behind: (p: Pt) => p.x < hx0 - G, past: (p: Pt) => p.x < Math.min(x1 - F, hx1) }, // east
    ];
    const pool = streetRuns ? sides.filter((x) => x.axis === streetRuns) : sides;
    const front = pool.reduce((a, b) => (b.d < a.d ? b : a));
    behind = front.behind;
    pastFront = front.past;
  } else if (streetRuns) {
    // No house on record, so the front cannot be told from the back: keep 20 ft clear on both street-facing sides.
    behind = pastFront = streetRuns === "ns" ? (p) => p.x > x0 + FRONT_YARD_FT && p.x < x1 - FRONT_YARD_FT : (p) => p.y > y0 + FRONT_YARD_FT && p.y < y1 - FRONT_YARD_FT;
  }

  // Per cell: 1 open lot (setbacks and the house gap respected), 2 behind the house, 4 past the front, 8 under a medium or
  // large crown, 16 under a large crown.
  const flags = new Uint8Array(W * H);
  let lotCells = 0, canopyCells = 0;
  const touching = new Set<number>();
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const p = { x: x0 + (i + 0.5) * cell, y: y0 + (j + 0.5) * cell };
      if (!inPoly(p, lotPts)) continue;
      lotCells++;
      let f = 0, under = false;
      for (let k = 0; k < trees.length; k++) {
        const t = trees[k];
        if (Math.hypot(p.x - t.c.x, p.y - t.c.y) > t.r) continue;
        under = true;
        touching.add(k);
        if (t.size !== "small") f |= 8;
        if (t.size === "large") f |= 16;
      }
      if (under) canopyCells++;
      // Only the house keeps its 5 ft gap. A detached garage or shed is often what a DADU replaces or converts, so it does
      // not block the site (the site plan treats it the same way).
      if (edgeDist(p, lotPts) >= SETBACK_FT && !(house && (inPoly(p, house) || edgeDist(p, house) < HOUSE_GAP_FT))) {
        f |= 1;
        if (behind(p)) f |= 2;
        if (pastFront(p)) f |= 4;
      }
      flags[j * W + i] = f;
    }
  }
  const minSide = Math.ceil(MIN_FOOTPRINT_SIDE_FT / cell);
  const rectWhere = (want: number, avoid: number) => {
    const ok = new Uint8Array(W * H);
    for (let k = 0; k < ok.length; k++) ok[k] = (flags[k] & want) === want && !(flags[k] & avoid) ? 1 : 0;
    return largestRect(ok, W, H, minSide);
  };
  const behindRoom = rectWhere(1 | 2, 0);
  const zone = behindRoom.area * cell * cell >= MIN_FOOTPRINT_SQFT ? 2 : 4;
  const siteRoom = zone === 2 ? behindRoom : rectWhere(1 | 4, 0);
  const counts = { large: 0, medium: 0, small: 0 };
  for (const k of touching) counts[trees[k].size]++;
  const a = rectWhere(1 | zone, 8);
  const b = rectWhere(1 | zone, 16);
  const toLngLat = (p: Pt): [number, number] => { const q = turn(p, theta); return [lng0 + q.x / ftLng, lat0 - q.y / FT_PER_DEG_LAT]; };
  const corners = (r: typeof a) => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([i, j]) => toLngLat({ x: x0 + i * cell, y: y0 + j * cell }));
  return {
    ...counts,
    canopyPct: lotCells ? Math.round((canopyCells / lotCells) * 100) : 0,
    clearSqft: a.area * cell * cell,
    clearSqftIfMediumRemoved: b.area * cell * cell,
    clearSpot: a.area ? corners(a) : null,
    siteSqft: siteRoom.area * cell * cell,
    site: zone === 2 ? "behind" : "side",
  };
}
