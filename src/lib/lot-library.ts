import { isNrZone } from "@/lib/zoning";
/**
 * The lot library: every Seattle lot the rules say can take a DADU, scored once.
 * Stored columnar so ~100k lots stay small on the wire. Pure encode/decode, no I/O.
 */
import type { Candidate } from "@/lib/server/candidates";
import { physicalDaduSqft } from "@/lib/dadu-score";
import { MIN_FOOTPRINT_SQFT } from "@/lib/tree-analysis";

export interface LotLibraryFile {
  generatedAt: string;
  source: string;
  count: number;
  cols: {
    pin: string[];
    address: string[];
    zip: (string | null)[];
    lat: number[];
    lng: number[];
    score: number[];
    zone: string[];
    lotSqft: number[];
    lotType: (string | null)[];
    alley: number[];
    corner: number[];
    topPick: number[];
    tier: number[];
    canopyPct: (number | null)[];
    steepPct: (number | null)[];
    adusNearby: number[];
    daduSqft: (number | null)[];
    /** Added with the guide-based score. Older files lack them. */
    lotWidth?: (number | null)[];
    lotDepth?: (number | null)[];
    existingAdus?: (number | null)[];
    sideClearanceFt?: (number | null)[];
    /** Trees measured from the 2021 LiDAR crowns (tree-analysis.ts). Null where not measured. */
    treeLarge?: (number | null)[];
    treeMedium?: (number | null)[];
    treeSmall?: (number | null)[];
    treeCanopyPct?: (number | null)[];
    clearSqft?: (number | null)[];
    clearSqftIfMediumRemoved?: (number | null)[];
    /** Room for a DADU before trees (sf), and 1 when it had to look past the house's front wall instead of behind it. */
    siteSqft?: (number | null)[];
    siteSide?: (number | null)[];
    /** Share of the lot under buildings, percent. */
    coveragePct?: (number | null)[];
    /** Slope across the DADU site, percent, and its total rise, feet. */
    gradePct?: (number | null)[];
    gradeRiseFt?: (number | null)[];
  };
}

const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const r2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

export function encodeLibrary(rows: Candidate[], source: string, now = new Date()): LotLibraryFile {
  return {
    generatedAt: now.toISOString(),
    source,
    count: rows.length,
    cols: {
      pin: rows.map((r) => r.pin),
      address: rows.map((r) => r.address),
      zip: rows.map((r) => r.zip),
      lat: rows.map((r) => r5(r.lat)),
      lng: rows.map((r) => r5(r.lng)),
      score: rows.map((r) => r.score),
      zone: rows.map((r) => r.zoning),
      lotSqft: rows.map((r) => r.lotSqft),
      lotType: rows.map((r) => r.lotType),
      alley: rows.map((r) => (r.alley ? 1 : 0)),
      corner: rows.map((r) => (r.corner ? 1 : 0)),
      topPick: rows.map((r) => (r.topPick ? 1 : 0)),
      tier: rows.map((r) => r.tier),
      canopyPct: rows.map((r) => r2(r.canopyPct)),
      steepPct: rows.map((r) => r2(r.steepPct)),
      adusNearby: rows.map((r) => r.adusNearby),
      daduSqft: rows.map((r) => r.daduSqft),
      lotWidth: rows.map((r) => r.lotWidth),
      lotDepth: rows.map((r) => r.lotDepth),
      existingAdus: rows.map((r) => r.existingAdus),
      sideClearanceFt: rows.map((r) => r.sideClearanceFt),
      treeLarge: rows.map((r) => r.trees?.large ?? null),
      treeMedium: rows.map((r) => r.trees?.medium ?? null),
      treeSmall: rows.map((r) => r.trees?.small ?? null),
      treeCanopyPct: rows.map((r) => r.trees?.canopyPct ?? null),
      clearSqft: rows.map((r) => r.trees?.clearSqft ?? null),
      clearSqftIfMediumRemoved: rows.map((r) => r.trees?.clearSqftIfMediumRemoved ?? null),
      siteSqft: rows.map((r) => r.trees?.siteSqft ?? null),
      siteSide: rows.map((r) => (r.trees?.site == null ? null : r.trees.site === "side" ? 1 : 0)),
      coveragePct: rows.map((r) => r.coveragePct ?? null),
      gradePct: rows.map((r) => r.grade?.slopePct ?? null),
      gradeRiseFt: rows.map((r) => r.grade?.riseFt ?? null),
    },
  };
}

/**
 * Hold a library built before the room rule (dadu-score.ts, roomGate) to it: a lot whose house leaves no 15 by 20 ft
 * spot has no DADU, so its score drops to 0 (under the shown floor everywhere), and every DADU size is held to its
 * open spot built two stories. A rebuild (`npm run build:lots`) drops such lots outright and rescores the rest.
 * Mutates and returns the file.
 */
/**
 * The NR rule: the library holds Neighborhood Residential lots only. Any row whose zone is not NR is dropped on load,
 * so a rebuilt library can never put a non-NR lot on the map, the off-market dots or the listings feed.
 */
export function enforceNrRule(f: LotLibraryFile): LotLibraryFile {
  const keep: number[] = [];
  for (let i = 0; i < f.count; i++) if (isNrZone(f.cols.zone[i])) keep.push(i);
  if (keep.length === f.count) return f;
  const cols = Object.fromEntries(Object.entries(f.cols).map(([k, arr]) => [k, Array.isArray(arr) ? keep.map((i) => arr[i]) : arr])) as LotLibraryFile["cols"];
  return { ...f, count: keep.length, cols };
}

export function enforceRoomRule(f: LotLibraryFile): LotLibraryFile {
  const c = f.cols;
  const room = c.siteSqft;
  if (!room) return f;
  for (let i = 0; i < f.count; i++) {
    const r = room[i];
    if (r == null) continue;
    if (r < MIN_FOOTPRINT_SQFT) {
      c.score[i] = 0;
      c.tier[i] = 0;
      c.topPick[i] = 0;
      c.daduSqft[i] = null;
    } else c.daduSqft[i] = physicalDaduSqft(c.daduSqft[i], r);
  }
  return f;
}

export function decodeLibrary(f: LotLibraryFile, zips?: string[] | null): Candidate[] {
  const c = f.cols;
  const want = zips && zips.length ? new Set(zips) : null;
  const out: Candidate[] = [];
  for (let i = 0; i < f.count; i++) {
    if (want && !(c.zip[i] && want.has(c.zip[i]!))) continue;
    out.push({
      pin: c.pin[i],
      address: c.address[i],
      zip: c.zip[i],
      lat: c.lat[i],
      lng: c.lng[i],
      score: c.score[i],
      zoning: c.zone[i],
      lotSqft: c.lotSqft[i],
      lotType: c.lotType[i],
      alley: c.alley[i] === 1,
      corner: c.corner[i] === 1,
      topPick: c.topPick[i] === 1,
      tier: c.tier[i] as Candidate["tier"],
      canopyPct: c.canopyPct[i],
      steepPct: c.steepPct[i],
      adusNearby: c.adusNearby[i],
      daduSqft: c.daduSqft[i],
      lotWidth: c.lotWidth?.[i] ?? null,
      lotDepth: c.lotDepth?.[i] ?? null,
      existingAdus: c.existingAdus?.[i] ?? null,
      sideClearanceFt: c.sideClearanceFt?.[i] ?? null,
      coveragePct: c.coveragePct?.[i] ?? null,
      grade: c.gradePct?.[i] != null ? { slopePct: c.gradePct[i]!, riseFt: c.gradeRiseFt?.[i] ?? 0 } : null,
      trees:
        c.clearSqft?.[i] != null
          ? { large: c.treeLarge![i] ?? 0, medium: c.treeMedium![i] ?? 0, small: c.treeSmall![i] ?? 0, canopyPct: c.treeCanopyPct![i] ?? 0, clearSqft: c.clearSqft[i]!, clearSqftIfMediumRemoved: c.clearSqftIfMediumRemoved![i] ?? 0, ...(c.siteSqft?.[i] != null ? { siteSqft: c.siteSqft[i]!, site: c.siteSide?.[i] === 1 ? ("side" as const) : ("behind" as const) } : {}) }
          : null,
    });
  }
  return out;
}

export function zipCounts(f: LotLibraryFile, minScore = 0): { zip: string; lots: number; topPicks: number }[] {
  const m = new Map<string, { lots: number; topPicks: number }>();
  for (let i = 0; i < f.count; i++) {
    const z = f.cols.zip[i];
    if (!z || f.cols.score[i] < minScore) continue;
    const e = m.get(z) ?? { lots: 0, topPicks: 0 };
    e.lots += 1;
    e.topPicks += f.cols.topPick[i];
    m.set(z, e);
  }
  return [...m.entries()].map(([zip, v]) => ({ zip, ...v })).sort((a, b) => a.zip.localeCompare(b.zip));
}

/** Haversine-free flat distance in meters. Fine at city scale. */
export function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dy = (aLat - bLat) * 111_320;
  const dx = (aLng - bLng) * 111_320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** Nearest library lot to a point within maxMeters, using a coarse grid so 100k lots stay fast. */
export function makeLotFinder(lots: Candidate[], cell = 0.002) {
  const grid = new Map<string, Candidate[]>();
  const key = (lat: number, lng: number) => `${Math.floor(lat / cell)}:${Math.floor(lng / cell)}`;
  for (const l of lots) {
    const k = key(l.lat, l.lng);
    const arr = grid.get(k);
    if (arr) arr.push(l);
    else grid.set(k, [l]);
  }
  return (lat: number, lng: number, maxMeters = 35): Candidate | null => {
    const ci = Math.floor(lat / cell);
    const cj = Math.floor(lng / cell);
    let best: Candidate | null = null;
    let bestD = maxMeters;
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++)
        for (const l of grid.get(`${i}:${j}`) ?? []) {
          const d = metersBetween(lat, lng, l.lat, l.lng);
          if (d <= bestD) {
            best = l;
            bestD = d;
          }
        }
    return best;
  };
}
