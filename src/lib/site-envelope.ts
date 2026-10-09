import type { FeasibilityData, LotGeometry, SitePlanData } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { lotRotation, turn, unturn } from "@/lib/lot-orientation";

/*
 * The site frame behind the master plan: the lot projected to feet and squared to the page, which side faces the
 * street, every lot line with its setback, and the buildable envelope. Moved out of MasterPlan unchanged so the
 * plans page (fit badges) and the custom journey (live compliance) apply exactly the rules the report draws.
 * This is geometry and setbacks only; it does not touch the FAR engine.
 */
export type Pt = { x: number; y: number };
export type Side = "N" | "S" | "E" | "W";

export const FT_PER_DEG_LAT = 364567;
/** NR front yard: 20 ft (the city may allow less where the neighbours sit closer). A DADU may not sit in it. */
export const FRONT_SETBACK_FT = 20;
/** A side or rear line that faces a street (corner and through lots): treated as 10 ft. Confirm with the city. */
export const STREET_SIDE_SETBACK_FT = 10;
/** An edge faces a street when a street centreline runs within this distance outside it. */
export const STREET_NEAR_FT = 60;
export const MIN_SIDE_FT = 10;

export function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export const signedArea = (pts: Pt[]) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;

/** True when a point lies within `tol` feet of the polygon's outline (touching counts as inside). */
export function nearPoly(p: Pt, poly: Pt[], tol: number): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    if (Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y) <= tol) return true;
  }
  return false;
}

/** Keep the part of a polygon at least `dist` inside the line through `a` with inward unit normal `n` (Sutherland-Hodgman). */
export function clipInside(poly: Pt[], a: Pt, n: Pt, dist: number): Pt[] {
  const f = (p: Pt) => (p.x - a.x) * n.x + (p.y - a.y) * n.y - dist;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) {
      const t = fp / (fp - fq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

export type SiteInput = { lot: LotGeometry; sitePlan: SitePlanData | null | undefined; feasibility: FeasibilityData | null; report: ADUReport | null };

export function computeSiteFrame({ lot, sitePlan, feasibility, report }: SiteInput) {
  /* ---- projection: lng/lat to feet, north up ---- */
  const lat0 = lot.rings.reduce((s, r) => s + r[1], 0) / lot.rings.length;
  const lng0 = lot.rings.reduce((s, r) => s + r[0], 0) / lot.rings.length;
  const ftLng = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const projNorth = (lng: number, lat: number): Pt => ({ x: (lng - lng0) * ftLng, y: -(lat - lat0) * FT_PER_DEG_LAT });
  // Square the lot to the page: a lot at an angle drawn north-up gives a tilted frame, so its width, depth, setbacks
  // and the DADU would all be measured against the wrong box. Everything goes through `proj`, so it all turns together.
  const theta = lotRotation(lot.rings.map((r) => projNorth(r[0], r[1])));
  const proj = (lng: number, lat: number): Pt => unturn(projNorth(lng, lat), theta);
  const ring = (rs: number[][]) => rs.map((r) => proj(r[0], r[1]));
  const unproj = (p: Pt): [number, number] => { const q = turn(p, theta); return [lng0 + q.x / ftLng, lat0 - q.y / FT_PER_DEG_LAT]; };

  const lotPts = ring(lot.rings);
  const x0 = Math.min(...lotPts.map((q) => q.x));
  const x1 = Math.max(...lotPts.map((q) => q.x));
  const y0 = Math.min(...lotPts.map((q) => q.y));
  const y1 = Math.max(...lotPts.map((q) => q.y));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  /* ---- which side faces the street ---- */
  const streets = (sitePlan?.streets ?? []).map((s) => ({ name: s.name, paths: s.paths.map((p) => p.map((c) => proj(c[0], c[1]))) }));
  const mids: Record<Side, Pt> = { N: { x: cx, y: y0 }, S: { x: cx, y: y1 }, W: { x: x0, y: cy }, E: { x: x1, y: cy } };
  let front: Side = "S";
  let best = Infinity;
  // The street frontage is the side whose length matches the recorded lot width.
  const recordedW = feasibility?.lotWidth ?? null;
  const spanX = x1 - x0;
  const spanY = y1 - y0;
  const frontageIsNS = recordedW == null ? true : Math.abs(spanX - recordedW) <= Math.abs(spanY - recordedW);
  const candidates: Side[] = frontageIsNS ? ["N", "S"] : ["E", "W"];
  for (const side of candidates) {
    for (const st of streets)
      for (const pth of st.paths)
        for (const q of pth) {
          const d = Math.hypot(q.x - mids[side].x, q.y - mids[side].y);
          if (d < best) {
            best = d;
            front = side;
          }
        }
  }
  const swap = front === "E" || front === "W";
  const lw = swap ? y1 - y0 : x1 - x0; // width across the street frontage
  const ld = swap ? x1 - x0 : y1 - y0; // depth from street to rear

  /** local (u across, v from street) to svg */
  const L = (u: number, v: number): Pt => {
    switch (front) {
      case "S": return { x: x0 + u, y: y1 - v };
      case "N": return { x: x0 + u, y: y0 + v };
      case "W": return { x: x0 + v, y: y0 + u };
      default: return { x: x1 - v, y: y0 + u };
    }
  };
  const toLocal = (q: Pt): { u: number; v: number } => {
    switch (front) {
      case "S": return { u: q.x - x0, v: y1 - q.y };
      case "N": return { u: q.x - x0, v: q.y - y0 };
      case "W": return { u: q.y - y0, v: q.x - x0 };
      default: return { u: q.y - y0, v: x1 - q.x };
    }
  };
  const rect = (u: number, v: number, w: number, d: number): Pt[] => [L(u, v), L(u + w, v), L(u + w, v + d), L(u, v + d)];
  /* ---- setbacks, envelope, DADU ---- */
  const fp = report?.daduFootprint ?? null;
  const onAlley = !!feasibility?.hasAlley;
  const side = fp?.sideSetback ?? 5;
  const rear = onAlley ? 0 : fp?.rearSetback ?? 5; // a rear line on an alley needs no setback
  /* The buildable envelope follows the real lot lines: each edge is a front, side or rear line by which way it faces,
     and the lot is cut back by that line's setback. Falls back to the bounding rectangle if the shape is degenerate. */
  const frontDir: Pt = front === "N" ? { x: 0, y: -1 } : front === "S" ? { x: 0, y: 1 } : front === "W" ? { x: -1, y: 0 } : { x: 1, y: 0 };
  const lotRing = lotPts.length > 3 && Math.hypot(lotPts[0].x - lotPts[lotPts.length - 1].x, lotPts[0].y - lotPts[lotPts.length - 1].y) < 0.01 ? lotPts.slice(0, -1) : lotPts;
  const orient = signedArea(lotRing) > 0 ? 1 : -1;
  const lotEdges = lotRing.map((a, i) => {
    const b = lotRing[(i + 1) % lotRing.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: (-(b.y - a.y) / len) * orient, y: ((b.x - a.x) / len) * orient }; // inward unit normal
    const facing = -(n.x * frontDir.x + n.y * frontDir.y); // +1 faces the street, -1 faces the rear
    const kind: "front" | "side" | "rear" = facing > 0.6 ? "front" : facing < -0.6 ? "rear" : "side";
    // A side or rear line with a street outside it (a corner or through lot) gets the street-side setback, not 5 ft.
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const onStreet = kind !== "front" && streets.some((st) => st.paths.some((pth) => pth.some((q, k) => {
      const r = pth[k + 1];
      if (!r) return false;
      const dx = r.x - q.x, dy = r.y - q.y, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((mid.x - q.x) * dx + (mid.y - q.y) * dy) / l2));
      const px = q.x + t * dx - mid.x, py = q.y + t * dy - mid.y;
      return Math.hypot(px, py) <= STREET_NEAR_FT && -(px * n.x + py * n.y) > 0; // outside the lot, not across it
    })));
    const setback = kind === "front" ? FRONT_SETBACK_FT : onStreet ? STREET_SIDE_SETBACK_FT : kind === "side" ? side : rear;
    return { a, b, n, len, kind, onStreet, setback };
  });
  // The same setbacks on the lot's own axes (u across the frontage, v from the street), for placing and clamping units.
  const edgeU = (e: (typeof lotEdges)[number]) => toLocal({ x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }).u;
  const maxSb = (pred: (e: (typeof lotEdges)[number]) => boolean, dflt: number) => lotEdges.filter((e) => e.len > 1 && pred(e)).reduce((m, e) => Math.max(m, e.setback), dflt);
  const sideL = maxSb((e) => e.kind === "side" && edgeU(e) < lw / 2, side);
  const sideR = maxSb((e) => e.kind === "side" && edgeU(e) >= lw / 2, side);
  const rearSb = maxSb((e) => e.kind === "rear", rear);
  const frontSb = FRONT_SETBACK_FT;
  const clipped = lotEdges.reduce((poly, e) => (e.setback > 0 && e.len > 1 && poly.length >= 3 ? clipInside(poly, e.a, e.n, e.setback) : poly), lotRing);
  const polyEnvelope = clipped.length >= 3 && Math.abs(signedArea(clipped)) > 20;
  const envelope = polyEnvelope ? clipped : rect(sideL, frontSb, Math.max(0, lw - sideL - sideR), Math.max(0, ld - rearSb - frontSb));
  const maxLiving = fp?.maxAllowedSqft ?? 1000;
  const coverageLeft = report?.coverage?.availableSqft ?? null;
  const canTwoStory = fp?.stories === 2;
  return { theta, proj, ring, unproj, lotPts, x0, x1, y0, y1, cx, cy, streets, front, swap, lw, ld, L, toLocal, rect, fp, onAlley, side, rear, frontDir, lotRing, lotEdges, sideL, sideR, rearSb, frontSb, polyEnvelope, envelope, maxLiving, coverageLeft, canTwoStory };
}

export type SiteFrame = ReturnType<typeof computeSiteFrame>;
export type LotEdge = SiteFrame["lotEdges"][number];

/** The rectangle behind the setbacks, on the lot's own axes: a design must fit in it one way round or the other. */
export function envelopeSize(f: Pick<SiteFrame, "lw" | "ld" | "sideL" | "sideR" | "rearSb" | "frontSb">): { w: number; d: number } {
  return { w: Math.max(MIN_SIDE_FT, f.lw - f.sideL - f.sideR), d: Math.max(MIN_SIDE_FT, f.ld - f.rearSb - f.frontSb) };
}

export type PlanFit = { fits: boolean; reason: string | null };

/** Whether a design (width x depth, living sf) fits behind the setbacks, turned either way, and inside the size limit. */
export function planFitFor(f: Pick<SiteFrame, "lw" | "ld" | "sideL" | "sideR" | "rearSb" | "frontSb" | "maxLiving">, p: { widthFt: number; depthFt: number; sqft: number }): PlanFit {
  const env = envelopeSize(f);
  const straight = p.widthFt <= env.w + 0.01 && p.depthFt <= env.d + 0.01;
  const turned = p.depthFt <= env.w + 0.01 && p.widthFt <= env.d + 0.01;
  if (p.sqft > f.maxLiving) return { fits: false, reason: `Over the ${f.maxLiving.toLocaleString("en-US")} sf limit` };
  if (!straight && !turned) return { fits: false, reason: "Too big for this lot" };
  return { fits: true, reason: null };
}

export type SetbackViolation = { edge: "front" | "rear" | "side" | "street side"; overByFt: number };

const EDGE_WORDS: Record<SetbackViolation["edge"], string> = { front: "front", rear: "rear", side: "side", "street side": "street-side" };

/**
 * How far a footprint's corners reach into each setback, measured square to the lot line. Only corners that sit
 * opposite the line count, so a long lot line does not judge a corner that is past its end. The worst per kind of
 * line, largest first. Empty when the footprint keeps every setback.
 */
export function setbackViolations(lotEdges: LotEdge[], corners: Pt[], toleranceFt = 0.25): SetbackViolation[] {
  const worst = new Map<SetbackViolation["edge"], number>();
  for (const e of lotEdges) {
    if (e.setback <= 0 || e.len <= 1) continue;
    const dx = (e.b.x - e.a.x) / e.len, dy = (e.b.y - e.a.y) / e.len;
    for (const q of corners) {
      const along = (q.x - e.a.x) * dx + (q.y - e.a.y) * dy;
      if (along < -1 || along > e.len + 1) continue;
      const inward = (q.x - e.a.x) * e.n.x + (q.y - e.a.y) * e.n.y;
      const over = e.setback - inward;
      if (over <= toleranceFt) continue;
      const edge: SetbackViolation["edge"] = e.kind === "front" ? "front" : e.onStreet ? "street side" : e.kind;
      worst.set(edge, Math.max(worst.get(edge) ?? 0, over));
    }
  }
  return [...worst.entries()].map(([edge, overByFt]) => ({ edge, overByFt: Math.round(overByFt * 2) / 2 })).sort((a, b) => b.overByFt - a.overByFt);
}

/** "Too close to the rear property line by 2 ft." */
export function violationText(v: SetbackViolation): string {
  const ft = v.overByFt < 1 ? "less than 1 ft" : `${Number.isInteger(v.overByFt) ? v.overByFt : v.overByFt.toFixed(1)} ft`;
  return `Too close to the ${EDGE_WORDS[v.edge]} property line by ${ft}.`;
}
