/**
 * How steep the ground is where a DADU would go. Elevations are sampled on a grid across the DADU site (the spot behind
 * the house that tree-analysis.ts finds) and a plane is fitted to them: its slope is the steepness, and the spread of
 * the samples is the total rise. A sloped site needs a stepped foundation, retaining walls and more excavation, so it
 * costs more to build even when the city's steep-slope critical area (40% and up) does not flag it.
 */

export interface GradeStats {
  /** Slope of the best-fit plane across the site, percent (rise over run). */
  slopePct: number;
  /** Highest minus lowest sample, feet. */
  riseFt: number;
}

/** Bands used by the score and the warnings. */
export const GRADE_MODERATE_PCT = 5;
export const GRADE_STEEP_PCT = 10;
export const GRADE_VERY_STEEP_PCT = 20;

const FT_PER_DEG_LAT = 364567;

/** An n x n grid of points inside a 4-corner spot (lng/lat), inset half a step from the edges. */
export function spotSamplePoints(spot: [number, number][], n = 5): [number, number][] {
  const [a, b, , d] = spot; // corners in order: a -> b along one side, a -> d along the other
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const u = (i + 0.5) / n, v = (j + 0.5) / n;
      out.push([a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v]);
    }
  return out;
}

/** Fit z = ax + by + c (feet) by least squares; null when there are too few samples. */
export function gradeFrom(points: [number, number][], z: (number | null)[]): GradeStats | null {
  const ok = points.map((p, i) => ({ p, z: z[i] })).filter((x): x is { p: [number, number]; z: number } => x.z != null && Number.isFinite(x.z));
  if (ok.length < 6) return null;
  const lat0 = ok[0].p[1], ftLng = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const xs = ok.map((o) => (o.p[0] - ok[0].p[0]) * ftLng), ys = ok.map((o) => (o.p[1] - lat0) * FT_PER_DEG_LAT), zs = ok.map((o) => o.z);
  const n = ok.length, mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n, mz = zs.reduce((s, v) => s + v, 0) / n;
  let sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] - mx, y = ys[i] - my, zz = zs[i] - mz;
    sxx += x * x; syy += y * y; sxy += x * y; sxz += x * zz; syz += y * zz;
  }
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-9) return null;
  const a = (sxz * syy - syz * sxy) / det, b = (syz * sxx - sxz * sxy) / det;
  return { slopePct: Math.round(Math.hypot(a, b) * 1000) / 10, riseFt: Math.round((Math.max(...zs) - Math.min(...zs)) * 10) / 10 };
}

/** Plain-words read of a grade, for notes and warnings. */
export function gradeNote(g: GradeStats): string {
  const what = `The DADU site slopes about ${g.slopePct}% (${g.riseFt} ft of rise across it)`;
  if (g.slopePct >= GRADE_VERY_STEEP_PCT) return `${what}: very steep. Expect retaining walls, a stepped foundation and heavy excavation; costs rise sharply and a geotechnical report is likely.`;
  if (g.slopePct >= GRADE_STEEP_PCT) return `${what}: steep. Expect a stepped foundation and retaining walls, which add real cost.`;
  if (g.slopePct >= GRADE_MODERATE_PCT) return `${what}: a moderate slope. Expect a stepped foundation or some grading.`;
  return `${what}: close to flat.`;
}
