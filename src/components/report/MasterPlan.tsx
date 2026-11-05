"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import { Calculator, Plus, RotateCcw } from "lucide-react";
import type { FeasibilityData, LotGeometry, SitePlanData } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { calculatorHref } from "@/lib/calculator/inputs";
import { contourLines, profile, type TerrainGrid } from "@/lib/terrain";
import { lotRotation, turn, unturn } from "@/lib/lot-orientation";
import { MIN_FOOTPRINT_SQFT, treeSize } from "@/lib/tree-analysis";
import LotSection from "./LotSection";
import { PlanPicker, PlacedPlanCard, type PlanFit } from "./PlanPicker";
import { PREAPPROVED_PLANS, type PreApprovedPlan } from "@/lib/preapproved-dadus";

type Pt = { x: number; y: number };
type Side = "N" | "S" | "E" | "W";

const FT_PER_DEG_LAT = 364567;
const MIN_ACCESS_FT = 12; // construction heuristic, mirrors config.min_access_width_ft
const DRIVEWAY_FT = 10; // a driveway needs 10 ft (dadu-score)
const BLOCKED_BELOW_FT = 8; // roofline gap under 8 ft: no vehicle access (dadu-score)

/** Angle in degrees of the street segment nearest a point, kept upright for text. */
function labelAt(paths: Pt[][], target: Pt, avoid?: Pt[]): { p: Pt; deg: number } | null {
  let best: { p: Pt; deg: number; d: number } | null = null;
  for (const pth of paths)
    for (let i = 0; i < pth.length - 1; i++) {
      const a = pth[i], b = pth[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
      // The closest point on the segment, nudged along it until it is clear of the lot (a street that touches the lot).
      let t = Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / len2));
      let p = { x: a.x + t * dx, y: a.y + t * dy };
      if (avoid && (pointInPoly(p, avoid) || nearPoly(p, avoid, 12))) {
        const len = Math.sqrt(len2);
        let found = false;
        for (const dir of [1, -1])
          for (let k = 14; k <= len && !found; k += 4) {
            const tt = t + (dir * k) / len;
            if (tt < 0 || tt > 1) break;
            const q = { x: a.x + tt * dx, y: a.y + tt * dy };
            if (!pointInPoly(q, avoid) && !nearPoly(q, avoid, 12)) { p = q; t = tt; found = true; }
          }
        if (!found) continue;
      }
      const d = Math.hypot(p.x - target.x, p.y - target.y);
      if (!best || d < best.d) {
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (deg > 90) deg -= 180;
        if (deg < -90) deg += 180;
        best = { p, deg, d };
      }
    }
  return best ? { p: best.p, deg: best.deg } : null;
}

function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const signedArea = (pts: Pt[]) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;

/** Keep the part of a polygon at least `dist` inside the line through `a` with inward unit normal `n` (Sutherland-Hodgman). */
/** True when a point lies within `tol` feet of the polygon's outline (touching counts as inside). */
function nearPoly(p: Pt, poly: Pt[], tol: number): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    if (Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y) <= tol) return true;
  }
  return false;
}

function clipInside(poly: Pt[], a: Pt, n: Pt, dist: number): Pt[] {
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

const path = (pts: Pt[], close = true) =>
  pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(" ") + (close ? " Z" : "");

/** What the PDF export needs from the plan as the user has left it: the live drawings plus the unit numbers and rule checks. */
export type PlanSnapshot = {
  plan: SVGSVGElement | null;
  section: SVGSVGElement | null;
  stories: 1 | 2;
  totalLiving: number;
  units: { name: string; long: string; plan: { designer: string; name: string; sqft: number; beds: string; baths: string; widthFt: number; depthFt: number; approx: boolean; detailUrl: string } | null; w: number; d: number; footprint: number; living: number; maxLiving: number; ok: boolean; checks: { ok: boolean; text: string }[] }[];
  warnings: string[];
  notes: string;
  setbacks: { side: number; rear: number; onAlley: boolean; front: number; streetSide: number | null };
};

type PlanProps = {
  lot: LotGeometry | null;
  sitePlan: SitePlanData | null | undefined;
  feasibility: FeasibilityData | null;
  report: ADUReport | null;
  pin: string | null;
  terrain?: TerrainGrid | null;
  /** Filled with a function that reads the plan as it stands now (units where the user dragged them). */
  snapshotRef?: MutableRefObject<(() => PlanSnapshot) | null>;
  /** Fired with the DADU's living area (sf) as drawn, so the page's build estimate and return follow the plan. Null when there is no DADU. */
  onDaduChange?: (livingSf: number | null) => void;
};

/** DADU in lot-local feet: u across the street frontage, v from the street toward the rear. */
type Box = { u: number; v: number; w: number; d: number };
type Grab = "move" | "rotate" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type Unit = Box & {
  kind: "dadu" | "aadu";
  /** A pre-approved design: its size is fixed, only its position and turn change. */
  plan?: PreApprovedPlan;
  /** Turn in degrees about the centre, for a pre-approved design. u, v, w, d describe the unturned box. */
  angle?: number;
};
/** The axis-aligned box a unit covers once turned. Rules (setbacks, house gap, overlap) are checked against it. */
const extent = (x: Unit): Box => {
  const a = ((x.angle ?? 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = x.w * c + x.d * s, d = x.w * s + x.d * c;
  return { u: x.u + x.w / 2 - w / 2, v: x.v + x.d / 2 - d / 2, w, d };
};
const MIN_SIDE_FT = 10;
/** A detached ADU keeps 5 ft from the house (team rule). An attached ADU joins the house, so it does not. */
const HOUSE_SEPARATION_FT = 5;
/** NR front yard: 20 ft (the city may allow less where the neighbours sit closer). A DADU may not sit in it. */
const FRONT_SETBACK_FT = 20;
/** A side or rear line that faces a street (corner and through lots): treated as 10 ft. Confirm with the city. */
const STREET_SIDE_SETBACK_FT = 10;
/** An edge faces a street when a street centreline runs within this distance outside it. */
const STREET_NEAR_FT = 60;
const UNIT_STYLE = {
  dadu: { fill: "#E6C97E", name: "DADU", long: "Detached ADU (backyard cottage)" },
  aadu: { fill: "#A9CFC4", name: "AADU", long: "Attached ADU (addition)" },
} as const;

export default function MasterPlan(props: PlanProps) {
  if (!props.lot || props.lot.rings.length < 3) {
    return (
      <div className="pa-inset flex aspect-[4/3] items-center justify-center p-6 text-center text-sm" style={{ color: "var(--slate)" }}>
        Parcel geometry is not available for this address, so the master plan cannot be drawn.
      </div>
    );
  }
  return <PlanSheet key={props.pin ?? "lot"} {...props} lot={props.lot} />;
}

function PlanSheet({ lot, sitePlan, feasibility, report, pin, terrain, snapshotRef, onDaduChange }: PlanProps & { lot: LotGeometry }) {
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
  /** A unit's four corners on the plan, turned about its centre. */
  function screenCorners(x: Unit): Pt[] {
    const a = ((x.angle ?? 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const cu = x.u + x.w / 2, cv = x.v + x.d / 2;
    return ([[-x.w / 2, -x.d / 2], [x.w / 2, -x.d / 2], [x.w / 2, x.d / 2], [-x.w / 2, x.d / 2]] as const).map(([px, py]) => L(cu + px * ca - py * sa, cv + px * sa + py * ca));
  }

  /* ---- existing structures on this lot ---- */
  const houses = (sitePlan?.buildings ?? [])
    .map((b) => ({ pts: ring(b.rings), pin: b.pin ?? null }))
    .filter((b) => {
      if (pin && b.pin && b.pin === pin) return true;
      const c = { x: b.pts.reduce((s, q) => s + q.x, 0) / b.pts.length, y: b.pts.reduce((s, q) => s + q.y, 0) / b.pts.length };
      return pointInPoly(c, lotPts);
    });
  // The driveway question is about the house only (the largest building), the same rule the score's side-clearance
  // measurement uses. A shed or garage in a back corner must not decide which side the car goes down.
  const polyArea = (pts: Pt[]) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
  const houseShape = houses.reduce<(typeof houses)[number] | null>((best, h) => (!best || polyArea(h.pts) > polyArea(best.pts) ? h : best), null);
  const hLocal = houseShape ? houseShape.pts.map(toLocal) : [];
  const houseMinU = hLocal.length ? Math.min(...hLocal.map((q) => q.u)) : null;
  const houseMaxU = hLocal.length ? Math.max(...hLocal.map((q) => q.u)) : null;
  const houseMaxV = hLocal.length ? Math.max(...hLocal.map((q) => q.v)) : 0;

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

  /* ---- existing buildings in lot-local feet; the largest is the house ---- */
  const bldgBoxes = houses
    .map((h) => {
      const q = h.pts.map(toLocal);
      const u0 = Math.min(...q.map((p) => p.u)), u1 = Math.max(...q.map((p) => p.u)), v0 = Math.min(...q.map((p) => p.v)), v1 = Math.max(...q.map((p) => p.v));
      return { u0, u1, v0, v1, area: (u1 - u0) * (v1 - v0) };
    })
    .sort((a, b) => b.area - a.area);
  const mainHouse = bldgBoxes[0] ?? null;

  // Computed once per lot (the sheet is keyed by parcel): the search below is too heavy to repeat on every drag.
  const [initialDadu] = useState<Unit | null>(() => fp
    ? (() => {
        const w = Math.max(MIN_SIDE_FT, Math.min(fp.suggestedWidth, lw - sideL - sideR));
        const d0 = Math.max(MIN_SIDE_FT, Math.min(fp.suggestedDepth, ld - rearSb - frontSb));
        // Start in open ground: rear first, centred first, shrinking the depth before giving up, and keeping clear of
        // every existing building (5 ft from the house). Falls back to the plain rear-centre spot.
        // Medium and large tree crowns in lot-local feet: the first pass keeps clear of them too.
        const crowns = (sitePlan?.trees ?? [])
          .filter((t) => (t.size ?? treeSize({ r: t.radiusFt, h: t.heightFt ?? null })) !== "small")
          .map((t) => ({ ...toLocal(proj(t.centroid[0], t.centroid[1])), r: t.radiusFt }));
        const clear = (u: number, v: number, dd: number, avoidTrees: boolean) =>
          bldgBoxes.every((b, i) => {
            const gu = Math.max(0, b.u0 - (u + w), u - b.u1), gv = Math.max(0, b.v0 - (v + dd), v - b.v1);
            return Math.hypot(gu, gv) >= (i === 0 ? HOUSE_SEPARATION_FT : 0.5);
          }) &&
          (!avoidTrees || crowns.every((c) => Math.hypot(Math.max(0, u - c.u, c.u - (u + w)), Math.max(0, v - c.v, c.v - (v + dd))) >= c.r));
        // Inside the buildable envelope: a lot that is not a rectangle (triangles, flag lots) has corners of its bounding
        // box outside the lot, so every corner of the footprint must be inside the envelope polygon.
        const inside = (u: number, v: number, ww: number, dd: number) => !polyEnvelope || rect(u, v, ww, dd).every((q) => pointInPoly(q, envelope) || nearPoly(q, envelope, 0.6));
        const behind = houseMaxV ? houseMaxV + HOUSE_SEPARATION_FT : 0;
        // Pass 1: behind the house and clear of trees (the same open ground the score measures). Pass 2: anywhere.
        // Widths shrink after depths, down to 15 ft, so a small spot still gets a cottage.
        for (const avoidTrees of [true, false])
          for (let ww = w; ww >= Math.min(w, 15); ww -= 1) {
            const us: number[] = [];
            for (let k = 0; sideL + k <= lw - sideR - ww; k += 1) us.push(sideL + k);
            us.sort((p, q) => Math.abs(p - (lw - ww) / 2) - Math.abs(q - (lw - ww) / 2));
            for (let dd = d0; dd >= Math.min(d0, 15); dd -= 1)
              for (let v = ld - rearSb - dd; v >= Math.max(frontSb, avoidTrees ? behind : 0); v -= 1)
                for (const u of us) if (inside(u, v, ww, dd) && clear(u, v, dd, avoidTrees)) return { kind: "dadu", u, v, w: ww, d: dd };
          }
        // Nothing fits: centre a minimum footprint on the envelope so it at least starts on the lot.
        const c = envelope.reduce((a, q) => ({ x: a.x + q.x / envelope.length, y: a.y + q.y / envelope.length }), { x: 0, y: 0 });
        const cl = toLocal(c);
        return { kind: "dadu", u: cl.u - MIN_SIDE_FT / 2, v: cl.v - MIN_SIDE_FT / 2, w: MIN_SIDE_FT, d: MIN_SIDE_FT };
      })()
    : null);
  const [units, setUnits] = useState<Unit[]>(initialDadu ? [initialDadu] : []);
  const [stories, setStories] = useState<1 | 2>(canTwoStory ? 2 : 1);
  const [active, setActive] = useState<number | null>(null);
  const [dragging, setDragging] = useState<Grab | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const figRef = useRef<HTMLElement | null>(null);
  const grab = useRef<{ idx: number; mode: Grab; start: { u: number; v: number }; box: Unit } | null>(null);

  /** Keep a unit inside the lot behind the setbacks, at least 10 ft a side, snapped to whole feet. */
  const clampBox = useCallback(
    (b: Unit): Unit => {
      if (b.plan) {
        // A pre-approved design keeps its drawn size; only where it sits can change.
        const e = extent(b);
        const cu0 = b.u + b.w / 2, cv0 = b.v + b.d / 2;
        const cu = Math.round(Math.min(lw - sideR - e.w / 2, Math.max(sideL + e.w / 2, cu0)) * 2) / 2;
        const cv = Math.round(Math.min(ld - rearSb - e.d / 2, Math.max(frontSb + e.d / 2, cv0)) * 2) / 2;
        return { ...b, u: cu - b.w / 2, v: cv - b.d / 2 };
      }
      const maxW = Math.max(MIN_SIDE_FT, lw - sideL - sideR);
      const maxD = Math.max(MIN_SIDE_FT, ld - rearSb - frontSb);
      const w = Math.round(Math.min(maxW, Math.max(MIN_SIDE_FT, b.w)));
      const d = Math.round(Math.min(maxD, Math.max(MIN_SIDE_FT, b.d)));
      const u = Math.round(Math.min(lw - sideR - w, Math.max(sideL, b.u)) * 2) / 2;
      const v = Math.round(Math.min(ld - rearSb - d, Math.max(frontSb, b.v)) * 2) / 2;
      return { ...b, u, v, w, d };
    },
    [lw, ld, sideL, sideR, rearSb, frontSb]
  );
  const setUnit = (idx: number, b: Unit) => setUnits((us) => us.map((x, i) => (i === idx ? clampBox(b) : x)));

  /** Gap between two boxes in feet, 0 when they touch or overlap. */
  const gap = (a: Box, b: { u0: number; u1: number; v0: number; v1: number }) => {
    const gu = Math.max(0, b.u0 - (a.u + a.w), a.u - b.u1);
    const gv = Math.max(0, b.v0 - (a.v + a.d), a.v - b.v1);
    return Math.hypot(gu, gv);
  };
  // 0.5 ft tolerance: positions snap to half feet, so touching must not read as overlapping.
  const OVERLAP_TOL = 0.5;
  const overlaps = (a: Box, b: { u0: number; u1: number; v0: number; v1: number }) => a.u < b.u1 - OVERLAP_TOL && a.u + a.w > b.u0 + OVERLAP_TOL && a.v < b.v1 - OVERLAP_TOL && a.v + a.d > b.v0 + OVERLAP_TOL;

  /** An attached ADU starts against the back of the house. */
  const addAadu = () => {
    if (units.some((x) => x.kind === "aadu")) return;
    const h = mainHouse;
    if (!h) {
      setUnits((us) => [...us, clampBox({ kind: "aadu", u: lw / 2 - 10, v: ld / 3, w: 20, d: 16 })]);
      return;
    }
    // Try spots against the back of the house, then its sides, and keep the first that clears other buildings and the DADU.
    const others = [...bldgBoxes.slice(1), ...units.map((x) => { const e = extent(x); return { u0: e.u, u1: e.u + e.w, v0: e.v, v1: e.v + e.d }; })];
    const back = Math.ceil(h.v1 * 2) / 2;
    const tries: Unit[] = [];
    for (const [w, d] of [[20, 16], [16, 14], [12, 12]])
      tries.push(
        { kind: "aadu", u: (h.u0 + h.u1) / 2 - w / 2, v: back, w, d },
        { kind: "aadu", u: h.u0, v: back, w, d },
        { kind: "aadu", u: h.u1 - w, v: back, w, d },
        { kind: "aadu", u: h.u1, v: (h.v0 + h.v1) / 2 - d / 2, w: d, d: w },
        { kind: "aadu", u: h.u0 - d, v: (h.v0 + h.v1) / 2 - d / 2, w: d, d: w }
      );
    const fits = tries.map(clampBox).find((t) => !others.some((o) => overlaps(t, o)) && !overlaps(t, h) && gap(t, h) <= 1);
    setUnits((us) => [...us, fits ?? clampBox(tries[0])]);
  };
  const removeAadu = () => setUnits((us) => us.filter((x) => x.kind !== "aadu"));

  /* ---- pre-approved designs: a fixed footprint in place of the resizable DADU box ---- */
  const envW = Math.max(MIN_SIDE_FT, lw - sideL - sideR);
  const envD = Math.max(MIN_SIDE_FT, ld - rearSb - frontSb);
  /** Whether a design fits behind the setbacks (turned either way) and inside the living-area limit. */
  const planFit = (p: PreApprovedPlan): PlanFit => {
    const straight = p.widthFt <= envW + 0.01 && p.depthFt <= envD + 0.01;
    const turned = p.depthFt <= envW + 0.01 && p.widthFt <= envD + 0.01;
    if (p.sqft > maxLiving) return { fits: false, reason: `Over the ${maxLiving.toLocaleString("en-US")} sf limit` };
    if (!straight && !turned) return { fits: false, reason: "Too big for this lot" };
    return { fits: true, reason: null };
  };
  const placePlan = (p: PreApprovedPlan | null) => {
    if (!p) return removePlan();
    // Use the orientation that fits; start where the DADU box was so the swap reads as the same spot.
    const turned = !(p.widthFt <= envW + 0.01 && p.depthFt <= envD + 0.01) && p.depthFt <= envW + 0.01 && p.widthFt <= envD + 0.01;
    const w = p.widthFt, d = p.depthFt;
    setUnits((us) => {
      const old = us.find((x) => x.kind === "dadu");
      // Keep the turn when switching sizes of the same design; a new design starts square to the lot unless only turned fits.
      const angle = old?.plan && old.plan.family === p.family ? old.angle ?? 0 : turned ? 90 : 0;
      const cu = old ? old.u + old.w / 2 : lw / 2, cv = old ? old.v + old.d / 2 : ld - rearSb - (turned ? w : d) / 2;
      const next = clampBox({ kind: "dadu", plan: p, angle, u: cu - w / 2, v: cv - d / 2, w, d });
      return [next, ...us.filter((x) => x.kind !== "dadu")];
    });
    setActive(0);
  };
  const rotatePlan = () =>
    setUnits((us) =>
      us.map((x) => {
        if (!x.plan) return x;
        // Quarter turn to the next 90 degrees.
        return clampBox({ ...x, angle: (Math.floor(((x.angle ?? 0) + 1) / 90) * 90 + 90) % 360 });
      })
    );
  function removePlan() {
    setUnits((us) => (initialDadu ? [initialDadu, ...us.filter((x) => x.kind !== "dadu")] : us.filter((x) => x.kind !== "dadu")));
    setStories(canTwoStory ? 2 : 1);
    setActive(null);
  }


  /** Rule checks per unit. A DADU keeps 5 ft from the house; an attached ADU must join it. */
  // Medium and large crowns: building under one means removing or working around a tree that needs review.
  const bigCrowns = (sitePlan?.trees ?? [])
    .map((t) => ({ c: proj(t.centroid[0], t.centroid[1]), r: t.radiusFt, size: t.size ?? treeSize({ r: t.radiusFt, h: t.heightFt ?? null }) }))
    .filter((t) => t.size !== "small");
  const crownsUnder = (poly: Pt[]) => bigCrowns.filter((t) => pointInPoly(t.c, poly) || nearPoly(t.c, poly, t.r));
  const checks = units.map((x) => {
    const footprint = Math.round(x.w * x.d);
    const living = x.plan ? x.plan.sqft : x.kind === "dadu" ? footprint * stories : footprint;
    const ex = extent(x);
    const hitsBuilding = bldgBoxes.some((b) => overlaps(ex, b));
    const houseGap = mainHouse ? gap(ex, mainHouse) : null;
    const list: { ok: boolean; text: string }[] = [];
    if (x.plan && (ex.w > lw - sideL - sideR + 0.01 || ex.d > ld - rearSb - frontSb + 0.01))
      list.push({ ok: false, text: "Too large for the buildable area behind the setbacks. Try turning it" });
    else if (polyEnvelope && !screenCorners(x).every((q) => pointInPoly(q, envelope) || nearPoly(q, envelope, 0.6)))
      list.push({ ok: false, text: "Crosses a setback. Drag it inside the green area" });
    else list.push({ ok: true, text: "Inside the lot setbacks" });
    if (x.plan) list.push({ ok: true, text: `Pre-approved design by ${x.plan.designer}` });
    if (hitsBuilding) list.push({ ok: false, text: "Overlaps an existing building" });
    const under = crownsUnder(screenCorners(x));
    if (under.length) {
      const nL = under.filter((t) => t.size === "large").length, nM = under.length - nL;
      // A large tree is likely protected: a real problem. A medium one can come out with a review and replacement.
      if (nL) list.push({ ok: false, text: `Under ${nL} large tree crown${nL === 1 ? "" : "s"}${nM ? ` and ${nM} medium` : ""}: large trees are likely protected` });
      else list.push({ ok: true, text: `Over ${nM} medium tree${nM === 1 ? "" : "s"}: plan to remove and replace (tree review)` });
    } else if (bigCrowns.length) list.push({ ok: true, text: "Clear of medium and large tree crowns" });
    if (x.kind === "dadu" && !hitsBuilding && houseGap != null)
      list.push(houseGap < HOUSE_SEPARATION_FT ? { ok: false, text: `${houseGap.toFixed(1)} ft from the house; a DADU needs ${HOUSE_SEPARATION_FT} ft` } : { ok: true, text: `${houseGap.toFixed(0)} ft from the house (${HOUSE_SEPARATION_FT} ft needed)` });
    if (x.kind === "aadu" && !hitsBuilding && houseGap != null)
      list.push(houseGap > 1 ? { ok: false, text: "An attached ADU must join the house" } : { ok: true, text: "Joined to the house" });
    if (living > maxLiving) list.push({ ok: false, text: `${living.toLocaleString("en-US")} sf is over the ${maxLiving.toLocaleString("en-US")} sf limit` });
    return { footprint, living, list, ok: list.every((c) => c.ok) };
  });
  const totalFootprint = checks.reduce((s, c) => s + c.footprint, 0);
  const totalLiving = checks.reduce((s, c) => s + Math.min(c.living, maxLiving), 0);
  const overCoverage = coverageLeft != null && totalFootprint > coverageLeft;
  const existingAdus = feasibility?.totalADU ?? 0;
  const overAduCap = existingAdus + units.length > 2;
  const daduIdx = units.findIndex((x) => x.kind === "dadu");
  const planUnit = units.find((x) => x.plan) ?? null;
  const daduUnit = daduIdx >= 0 ? units[daduIdx] : null;
  const daduExt = daduUnit ? extent(daduUnit) : null;
  const dadu: Pt[] | null = daduExt ? rect(daduExt.u, daduExt.v, daduExt.w, daduExt.d) : null;
  const daduConflict = daduIdx >= 0 && !checks[daduIdx].ok;
  const daduLiving = daduIdx >= 0 ? Math.min(checks[daduIdx].living, maxLiving) : null;
  useEffect(() => {
    onDaduChange?.(daduLiving);
  }, [daduLiving, onDaduChange]);

  /* ---- vehicle access: alley, corner, or the roomier side yard (same rule as the score) ---- */
  type AccessKind = "alley" | "corner" | "side" | "tight" | "blocked";
  let access: { a: Pt; b: Pt; width: number | null; kind: AccessKind; label: string; lane?: Pt[] } | null = null;
  let noSideYard = false;
  const isCorner = (feasibility?.lotType ?? "").toLowerCase().includes("corner");
  if (feasibility?.hasAlley) {
    // From the alley to the DADU's back edge, so the arrow does not cover its label.
    const um = daduUnit ? daduUnit.u + daduUnit.w / 2 : lw / 2;
    access = { a: L(um, ld + 3), b: L(um, daduExt ? daduExt.v + daduExt.d + 0.5 : ld * 0.8), width: null, kind: "alley", label: "Alley access" };
  } else if (houseMinU != null && houseMaxU != null) {
    const left = houseMinU;
    const right = lw - houseMaxU;
    const useLeft = left >= right;
    const drawn = Math.max(0, useLeft ? left : right);
    const width = feasibility?.sideClearanceFt ?? drawn; // the measured value the score uses
    const u = useLeft ? left / 2 : houseMaxU + right / 2;
    const kind: AccessKind = width >= DRIVEWAY_FT ? "side" : width >= BLOCKED_BELOW_FT ? "tight" : "blocked";
    const label = kind === "side" ? `Driveway ${width.toFixed(1)}'` : kind === "tight" ? `${width.toFixed(1)}': confirm` : `No car access: ${width.toFixed(1)}'`;
    // From the front lot line past the house to the cottage (or just past the house): the lane a car would use.
    const vEnd = Math.min(ld - 2, Math.max(houseMaxV + 4, daduExt && daduExt.v > houseMaxV ? daduExt.v : 0));
    const laneW = Math.max(1, Math.min(drawn - 0.5, DRIVEWAY_FT));
    const lane = rect(u - laneW / 2, 0, laneW, vEnd);
    if (drawn >= 1.5) access = { a: L(u, 1), b: L(u, vEnd), width, kind: isCorner && kind === "blocked" ? "corner" : kind, label: isCorner && kind === "blocked" ? "Corner: use the side street" : label, lane };
    else noSideYard = true;
  }
  const accessColor = (k: AccessKind) => (k === "blocked" ? "#B9573F" : k === "tight" ? "#B8862B" : "#145A40");

  /* ---- alleys near the lot ---- */
  const alleys = (sitePlan?.alleys ?? []).map((r) => ring(r));

  /* ---- trees ---- */
  const pad = 14;
  const trees = (sitePlan?.trees ?? [])
    .map((t) => ({ c: proj(t.centroid[0], t.centroid[1]), r: t.radiusFt, size: t.size ?? treeSize({ r: t.radiusFt, h: t.heightFt ?? null }) }))
    .filter((t) => t.c.x > x0 - t.r - pad && t.c.x < x1 + t.r + pad && t.c.y > y0 - t.r - pad && t.c.y < y1 + t.r + pad);
  const treeStats = feasibility?.treeStats ?? null;
  // The biggest spot behind the house that keeps clear of medium and large crowns (none when it is under 300 sf).
  const clearSpot = treeStats?.clearSpot && treeStats.clearSqft >= MIN_FOOTPRINT_SQFT ? treeStats.clearSpot.map(([lng, lat]) => proj(lng, lat)) : null;
  const TREE_STYLE = {
    large: { stroke: "#2F6B49", fill: "rgba(31,94,59,0.12)", width: 0.8, dash: false },
    medium: { stroke: "#4F9068", fill: "rgba(63,138,94,0.07)", width: 0.6, dash: true },
    small: { stroke: "#9CC2A8", fill: "none", width: 0.45, dash: true },
  } as const;

  /* ---- drag and resize ---- */
  const localAt = (e: React.PointerEvent): { u: number; v: number } | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return toLocal({ x: p.x, y: p.y });
  };
  const startGrab = (idx: number, mode: Grab) => (e: React.PointerEvent) => {
    const at = localAt(e);
    if (!at || !units[idx]) return;
    e.stopPropagation();
    e.preventDefault();
    // Focus the unit so the keyboard (arrows, R to rotate) works right after a drag.
    (e.currentTarget as Element).closest<SVGGElement>("g[role=group]")?.focus();
    svgRef.current?.setPointerCapture(e.pointerId);
    grab.current = { idx, mode, start: at, box: units[idx] };
    setDragging(mode);
    setActive(idx);
  };
  const onMove = (e: React.PointerEvent) => {
    const g = grab.current;
    if (!g) return;
    const at = localAt(e);
    if (!at) return;
    const du = at.u - g.start.u, dv = at.v - g.start.v;
    const b = { ...g.box };
    if (g.mode === "rotate" && b.plan) {
      // The handle sits on the box's street-side axis, so the pointer's bearing from the centre is the turn.
      const ru = at.u - (b.u + b.w / 2), rv = at.v - (b.v + b.d / 2);
      if (Math.hypot(ru, rv) < 1) return;
      let deg = (Math.atan2(ru, -rv) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      // Free turn; Shift gives 15 degree steps, and the square-to-the-lot angles pull in softly.
      deg = e.shiftKey ? Math.round(deg / 15) * 15 : deg;
      for (const q of [0, 90, 180, 270, 360]) if (Math.abs(deg - q) < 3) deg = q % 360;
      setUnit(g.idx, { ...b, angle: Math.round(deg * 2) / 2 % 360 });
      return;
    }
    if (g.mode === "move" || b.plan) {
      b.u += du;
      b.v += dv;
    } else {
      // Handles are named by screen side; map them to local edges through the plan's orientation.
      const ends = handleEdges(g.mode);
      if (ends.u === "lo") { b.u += du; b.w -= du; }
      if (ends.u === "hi") b.w += du;
      if (ends.v === "lo") { b.v += dv; b.d -= dv; }
      if (ends.v === "hi") b.d += dv;
    }
    setUnit(g.idx, b);
  };
  const endGrab = (e: React.PointerEvent) => {
    if (!grab.current) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    grab.current = null;
    setDragging(null);
  };
  const onKey = (idx: number) => (e: React.KeyboardEvent) => {
    const box = units[idx];
    if (!box) return;
    const step = e.altKey ? 0.5 : 1;
    const k: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (box.plan && e.key.toLowerCase() === "r") {
      e.preventDefault();
      rotatePlan();
      return;
    }
    const mv = k[e.key];
    if (!mv) return;
    e.preventDefault();
    if (e.shiftKey && !box.plan) {
      // Shift + arrows resize: right/down grow, left/up shrink, along that screen direction.
      const grow = (mv[0] || mv[1]) > 0 ? step : -step;
      const alongU = (mv[0] !== 0) !== swap;
      setUnit(idx, alongU ? { ...box, w: box.w + grow } : { ...box, d: box.d + grow });
      return;
    }
    const a = toLocal({ x: 0, y: 0 }), bpt = toLocal({ x: mv[0], y: mv[1] });
    setUnit(idx, { ...box, u: box.u + (bpt.u - a.u), v: box.v + (bpt.v - a.v) });
  };
  /** Which local edge a screen-named handle moves (depends only on the plan's orientation). */
  function handleEdges(h: Grab): { u: "lo" | "hi" | null; v: "lo" | "hi" | null } {
    const out: { u: "lo" | "hi" | null; v: "lo" | "hi" | null } = { u: null, v: null };
    const o = toLocal({ x: 0, y: 0 });
    for (const ch of h) {
      if (ch !== "n" && ch !== "s" && ch !== "e" && ch !== "w") continue;
      const q = toLocal({ n: { x: 0, y: -1 }, s: { x: 0, y: 1 }, e: { x: 1, y: 0 }, w: { x: -1, y: 0 } }[ch]);
      if (Math.abs(q.u - o.u) > Math.abs(q.v - o.v)) out.u = q.u > o.u ? "hi" : "lo";
      else out.v = q.v > o.v ? "hi" : "lo";
    }
    return out;
  }
  const screenBox = (x: Unit) => {
    const pts = screenCorners(x);
    return { pts, x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)) };
  };
  /** The 5 ft separation a DADU keeps from the house, drawn as a dashed ring. */
  // Kept inside the lot lines: the rule is about where the DADU can go, and the DADU never leaves the lot.
  const separationRing = mainHouse && daduUnit ? lotEdges.reduce((poly, e) => (e.len > 1 && poly.length >= 3 ? clipInside(poly, e.a, e.n, 0) : poly), rect(mainHouse.u0 - HOUSE_SEPARATION_FT, mainHouse.v0 - HOUSE_SEPARATION_FT, mainHouse.u1 - mainHouse.u0 + 2 * HOUSE_SEPARATION_FT, mainHouse.v1 - mainHouse.v0 + 2 * HOUSE_SEPARATION_FT)) : null;
  const separation = separationRing && separationRing.length >= 3 ? separationRing : null;

  /* ---- setback bands: the strip between each lot line and the envelope ---- */
  const setbackBands: { pts: Pt[]; label: string; at: Pt; vertical: boolean }[] = [];
  /** Hatched ring between the lot lines and the envelope, and one label per side, on the longest edge of each kind. */
  const setbackRing = polyEnvelope ? `${path(lotRing)} ${path(envelope)}` : null;
  const setbackLabels: { at: Pt; deg: number; label: string }[] = [];
  if (polyEnvelope) {
    const longest = (pick: (e: (typeof lotEdges)[number]) => boolean) => lotEdges.filter(pick).sort((p, q) => q.len - p.len)[0];
    const across = (e: (typeof lotEdges)[number]) => (swap ? (e.a.y + e.b.y) / 2 - cy : (e.a.x + e.b.x) / 2 - cx);
    const leftSide = longest((e) => e.kind === "side" && across(e) < 0);
    const rightSide = longest((e) => e.kind === "side" && across(e) >= 0);
    const rearEdge = longest((e) => e.kind === "rear");
    const frontEdge = longest((e) => e.kind === "front");
    for (const e of [frontEdge, leftSide, rightSide, rearEdge]) {
      if (!e || e.setback <= 0 || e.len < 12) continue;
      let deg = (Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x) * 180) / Math.PI;
      if (deg > 90) deg -= 180;
      if (deg < -90) deg += 180;
      const t = e.kind === "rear" || e.kind === "front" ? 0.5 : 0.62;
      const label = e.kind === "front" ? `${e.setback}' front yard` : e.onStreet ? `${e.setback}' street side setback` : `${e.setback}' ${e.kind} setback`;
      setbackLabels.push({ at: { x: e.a.x + (e.b.x - e.a.x) * t + e.n.x * e.setback / 2, y: e.a.y + (e.b.y - e.a.y) * t + e.n.y * e.setback / 2 }, deg, label });
    }
  }
  if (!polyEnvelope) {
    setbackBands.push({ pts: rect(0, 0, lw, frontSb), label: `${frontSb}' front yard`, at: L(lw / 2, frontSb / 2), vertical: swap });
    if (sideL > 0) setbackBands.push({ pts: rect(0, 0, sideL, ld), label: `${sideL}' side setback`, at: L(sideL / 2, ld * 0.62), vertical: !swap });
    if (sideR > 0) setbackBands.push({ pts: rect(lw - sideR, 0, sideR, ld), label: `${sideR}' side setback`, at: L(lw - sideR / 2, ld * 0.62), vertical: !swap });
    if (rearSb > 0) setbackBands.push({ pts: rect(sideL, ld - rearSb, Math.max(0, lw - sideL - sideR), rearSb), label: `${rearSb}' rear setback`, at: L(lw / 2, ld - rearSb / 2), vertical: swap });
  }

  /* ---- viewBox ---- */
  const margin = 44;
  const vbX = x0 - margin;
  const vbY = y0 - margin;
  const vbW = x1 - x0 + margin * 2;
  const vbH = y1 - y0 + margin * 2;
  const fs = Math.max(vbW, vbH) / 40;
  const sw = Math.max(vbW, vbH) / 300;

  const dimOff = 9;
  const widthDim = [L(0, -dimOff), L(lw, -dimOff)]; // street side: the rear may be an alley
  const depthDim = [L(-dimOff, 0), L(-dimOff, ld)];
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const wm = mid(widthDim[0], widthDim[1]);
  const dm = mid(depthDim[0], depthDim[1]);

  const adj = (sitePlan?.adjacentParcels ?? []).map((a) => path(ring(a.rings)));
  const drives = (sitePlan?.driveways ?? []).map((d) => path(ring(d.rings)));
  const lotW = Math.round(feasibility?.lotWidth ?? lw);
  const lotD = Math.round(feasibility?.lotDepth ?? ld);

  /* ---- terrain: 2 ft contours and the section through the lot (through the DADU when there is one) ---- */
  const contours = terrain ? contourLines(terrain, 2, 10) : [];
  const SECTION_PAD = 14; // feet past each end of the lot
  const sectionU = daduUnit ? daduUnit.u + daduUnit.w / 2 : lw / 2;
  const secA = L(sectionU, -SECTION_PAD), secB = L(sectionU, ld + SECTION_PAD);
  const sectionProfile = terrain ? profile(terrain, unproj(secA), unproj(secB), ld + 2 * SECTION_PAD, 1) : [];
  const hasSection = sectionProfile.some((p) => p.z != null);
  /** Where an existing building crosses the section line, as distances along it. */
  // The house always shows (cut or beyond the cut); other buildings only where the line crosses them.
  const sectionBuildings = bldgBoxes
    .map((b, i) => ({ s0: b.v0 + SECTION_PAD, s1: b.v1 + SECTION_PAD, main: b === mainHouse, key: i, cut: sectionU > b.u0 && sectionU < b.u1 }))
    .filter((b) => b.cut || b.main);

  /* ---- the sentence under the plan, also printed in the PDF ---- */
  const notes = [
    `The front yard is drawn at ${FRONT_SETBACK_FT} ft, the Neighborhood Residential standard (the city can allow less where the neighbours sit closer)${lotEdges.some((e) => e.onStreet) ? `, and a side or rear line on a street at ${STREET_SIDE_SETBACK_FT} ft; confirm both with the city` : ""}. ECA outlines are not drawn: this data has no geometry for them.`,
    daduConflict && " The DADU breaks a rule where it sits now (see the checks below). Drag it clear.",
    access?.kind === "alley" && " Cars and construction reach the back from the alley.",
    access?.kind === "side" && access.width != null && access.width < MIN_ACCESS_FT && ` The side yard fits a ${DRIVEWAY_FT} ft driveway but is under the ${MIN_ACCESS_FT} ft construction heuristic.`,
    access?.kind === "tight" && ` The roofline leaves about ${access.width?.toFixed(1)} ft beside the house. Below the eaves it may fit a ${DRIVEWAY_FT} ft driveway; confirm on site.`,
    access?.kind === "blocked" && ` No vehicle access to the rear: the house leaves only ${access.width?.toFixed(1)} ft beside it and there is no alley. A driveway needs ${DRIVEWAY_FT} ft.`,
    access?.kind === "corner" && " The side yards are too narrow, but the corner lot's second street can serve the back.",
    noSideYard && " The house leaves no usable side yard for an access path, so none is drawn.",
    !streets.length && " No street geometry returned, so the street side is assumed south.",
  ].filter(Boolean).join("");
  const ts = feasibility?.treeStats;
  const warnings = [
    ts && ts.clearSqft < MIN_FOOTPRINT_SQFT && `Trees: ${ts.large} large and ${ts.medium} medium trees reach this lot, and no open 15 by 20 ft spot behind the house clears them. A DADU here means removing trees, with a tree review and replacement${ts.clearSqftIfMediumRemoved < MIN_FOOTPRINT_SQFT ? "; even then, large trees leave no room" : ""}.`,
    overCoverage && `Together the new footprints (${totalFootprint.toLocaleString("en-US")} sf) are over the ${Math.round(coverageLeft ?? 0).toLocaleString("en-US")} sf of lot coverage left.`,
    overAduCap && `A lot can have 2 ADUs. This one already has ${existingAdus}, so you can add ${Math.max(0, 2 - existingAdus)} more.`,
  ].filter((w): w is string => !!w);
  // Re-assigned every render so the PDF always reads the units where the user left them.
  useEffect(() => {
    if (!snapshotRef) return;
    snapshotRef.current = () => ({
      plan: svgRef.current,
      section: (figRef.current?.querySelector("svg[data-pdf-section]") as SVGSVGElement | null) ?? null,
      stories: planUnit?.plan ? planUnit.plan.stories : stories,
      totalLiving,
      units: units.map((x, i) => ({ name: x.plan ? x.plan.name : UNIT_STYLE[x.kind].name, long: x.plan ? `${x.plan.name} by ${x.plan.designer} (pre-approved design)` : UNIT_STYLE[x.kind].long, plan: x.plan ? { designer: x.plan.designer, name: x.plan.name, sqft: x.plan.sqft, beds: x.plan.beds, baths: x.plan.baths, widthFt: x.plan.widthFt, depthFt: x.plan.depthFt, approx: x.plan.approx, detailUrl: x.plan.detailUrl } : null, w: Math.round(x.w), d: Math.round(x.d), footprint: checks[i].footprint, living: checks[i].living, maxLiving, ok: checks[i].ok, checks: checks[i].list })),
      warnings,
      notes,
      setbacks: { side, rear, onAlley, front: FRONT_SETBACK_FT, streetSide: lotEdges.some((e) => e.onStreet) ? STREET_SIDE_SETBACK_FT : null },
    });
  });
  useEffect(() => () => { if (snapshotRef) snapshotRef.current = null; }, [snapshotRef]);

  const scaleX = vbX + vbW - margin * 0.35 - 20;
  const scaleY = vbY + vbH - margin * 0.5;

  return (
    <figure ref={figRef} className="plat-sheet" style={{ margin: 0, padding: "clamp(12px, 2vw, 20px)" }}>
      {/* Wide screens: the drawing takes the room, the unit controls sit beside it so both stay in view. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
      <div className="min-w-0">
      <svg
        ref={svgRef}
        className="plat"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        onPointerMove={onMove}
        onPointerUp={endGrab}
        onPointerCancel={endGrab}
        role="img"
        aria-label={`Master plan of the lot at ${lotW} by ${lotD} feet with the buildable envelope, existing structures${dadu ? ", and a proposed detached accessory dwelling unit" : ""}.`}
        style={{ fontSize: fs, maxHeight: "80vh", touchAction: active ? "none" : undefined, userSelect: "none" }}
      >
        <defs>
          <pattern id="mp-house" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#17241D" strokeOpacity="0.4" strokeWidth={sw * 0.6} />
          </pattern>
        </defs>

        {adj.map((d, i) => (
          <path key={`a${i}`} d={d} fill="none" stroke="#17241D" strokeOpacity="0.16" strokeWidth={sw * 0.45} />
        ))}
        {streets.map((s, i) =>
          s.paths.map((p, j) => (
            <path key={`s${i}-${j}`} d={path(p, false)} fill="none" stroke="#CFD9D3" strokeWidth={Math.max(9, sw * 14)} strokeLinecap="round" strokeLinejoin="round" />
          ))
        )}
        {/* the lot itself, on paper: hides a street centreline or neighbour outline that the city data runs through it */}
        <path d={path(lotPts)} fill="#FBFBFA" />
        {/* ground contours every 2 ft (index every 10 ft), from lidar elevation */}
        {contours.map((c) => (
          <path
            key={`ct${c.elevation}`}
            d={c.segments.map(([a, b]) => { const p = proj(a[0], a[1]), q = proj(b[0], b[1]); return `M${p.x.toFixed(2)} ${p.y.toFixed(2)} L${q.x.toFixed(2)} ${q.y.toFixed(2)}`; }).join(" ")}
            fill="none"
            stroke="#A88F6E"
            strokeOpacity={c.index ? 0.5 : 0.28}
            strokeWidth={sw * (c.index ? 0.55 : 0.3)}
            pointerEvents="none"
          />
        ))}
        {alleys.map((a, i) => (
          <path key={`al${i}`} d={path(a)} fill="#D9CDB4" fillOpacity="0.75" stroke="#A8957A" strokeWidth={sw * 0.8} />
        ))}
        {drives.map((d, i) => (
          <path key={`d${i}`} d={d} fill="#17241D" fillOpacity="0.08" stroke="none" />
        ))}

        {/* buildable envelope */}
        {envelope.length > 0 && (
          <g className="plat-fill" style={{ ["--d" as string]: "0.9s" }}>
            <path d={path(envelope)} fill="#1E6E50" fillOpacity="0.16" />
            <path d={path(envelope)} fill="none" stroke="#145A40" strokeOpacity="0.7" strokeWidth={sw * 0.6} strokeDasharray={`${sw * 4} ${sw * 3}`} />
          </g>
        )}

        {/* setbacks: hatched strips between the lot lines and the buildable envelope */}
        <defs>
          <pattern id="mp-setback" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#B9573F" strokeOpacity="0.25" strokeWidth={sw * 0.5} />
          </pattern>
        </defs>
        {setbackRing && <path d={setbackRing} fillRule="evenodd" fill="url(#mp-setback)" stroke="#B9573F" strokeOpacity="0.4" strokeWidth={sw * 0.4} />}
        {setbackBands.map((b, i) => (
          <g key={`sb${i}`}>
            <path d={path(b.pts)} fill="url(#mp-setback)" stroke="#B9573F" strokeOpacity="0.4" strokeWidth={sw * 0.4} />
          </g>
        ))}

        {/* lot line */}
        <path
          className="plat-draw"
          pathLength={1}
          style={{ ["--len" as string]: 1, ["--d" as string]: "0s" }}
          d={path(lotPts)}
          fill="none"
          stroke="#17241D"
          strokeWidth={sw * 1.6}
          strokeLinejoin="round"
        />

        {/* existing structures */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.2s" }}>
          {houses.map((h, i) => (
            <path key={i} d={path(h.pts)} fill="url(#mp-house)" stroke="#17241D" strokeWidth={sw * 1.2} />
          ))}
        </g>

        {/* trees with drip lines */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.4s" }}>
          {[...trees].sort((a, b) => a.r - b.r).reverse().map((t, i) => {
            const st = TREE_STYLE[t.size];
            return (
              <g key={i}>
                <circle cx={t.c.x} cy={t.c.y} r={t.r} fill={st.fill} stroke={st.stroke} strokeWidth={sw * st.width} strokeDasharray={st.dash ? `${sw * 2.5} ${sw * 2.5}` : undefined} />
                <circle cx={t.c.x} cy={t.c.y} r={sw * (t.size === "large" ? 2.2 : 1.6)} fill={st.stroke} />
              </g>
            );
          })}
        </g>
        {/* section cut A-A': a thin chain line with small tags; the arrows show which way the section looks */}
        {hasSection && (() => {
          const ux = secB.x - secA.x, uy = secB.y - secA.y, len = Math.hypot(ux, uy) || 1;
          const dx = ux / len, dy = uy / len; // along the cut
          const vx = -dy, vy = dx; // looking direction (perpendicular)
          const r = fs * 0.42;
          const tag = (p: Pt, label: string, out: number) => {
            const c = { x: p.x - dx * r * 1.6 * out, y: p.y - dy * r * 1.6 * out };
            return (
              <g key={label}>
                <path d={`M${c.x + vx * r * 1.05} ${c.y + vy * r * 1.05} L${c.x + vx * r * 1.9 + dx * r * 0.5} ${c.y + vy * r * 1.9 + dy * r * 0.5} L${c.x + vx * r * 1.9 - dx * r * 0.5} ${c.y + vy * r * 1.9 - dy * r * 0.5} Z`} fill="#17241D" fillOpacity="0.55" />
                <circle cx={c.x} cy={c.y} r={r} fill="#fff" stroke="#17241D" strokeOpacity="0.55" strokeWidth={sw * 0.4} />
                <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fs * 0.5, fontWeight: 600, fill: "#17241D", fillOpacity: 0.7 }}>{label}</text>
              </g>
            );
          };
          return (
            <g pointerEvents="none" data-section-cut>
              <line x1={secA.x} y1={secA.y} x2={secB.x} y2={secB.y} stroke="#17241D" strokeOpacity="0.35" strokeWidth={sw * 0.45} strokeDasharray={`${sw * 7} ${sw * 2} ${sw * 1.2} ${sw * 2}`} />
              {tag(secA, "A", 1)}
              {tag(secB, "A′", -1)}
            </g>
          );
        })()}

        {clearSpot && (
          <g pointerEvents="none">
            <path d={path(clearSpot)} fill="none" stroke="#2E5C6E" strokeWidth={sw * 1.2} strokeDasharray={`${sw} ${sw * 1.5}`} />
          </g>
        )}

        {/* 5 ft separation a DADU keeps from the house */}
        {separation && (
          <g pointerEvents="none">
            <path d={path(separation)} fill="none" stroke="#B9573F" strokeOpacity="0.7" strokeWidth={sw} strokeDasharray={`${sw * 2} ${sw * 2}`} />
            {(() => {
              // On the rear side of the house, where the DADU goes; the front side carries the front-yard label.
              const p0 = L((mainHouse!.u0 + mainHouse!.u1) / 2, mainHouse!.v1 + HOUSE_SEPARATION_FT / 2);
              return (
                <text x={p0.x} y={p0.y} dy={fs * 0.22} textAnchor="middle" stroke="#fff" strokeWidth={sw * 2.5} paintOrder="stroke" style={{ fontSize: fs * 0.5, fontWeight: 700, fill: "#9A4632" }}>
                  {`${HOUSE_SEPARATION_FT}' from house (DADU)`}
                </text>
              );
            })()}
          </g>
        )}

        {/* proposed units: drag to move, handles to resize */}
        {units.map((x, idx) => {
          const sb = screenBox(x);
          const c = checks[idx];
          const st = UNIT_STYLE[x.kind];
          const cxu = (sb.x0 + sb.x1) / 2, cyu = (sb.y0 + sb.y1) / 2;
          const on = active === idx;
          return (
            <g
              key={x.kind}
              tabIndex={0}
              role="group"
              aria-label={x.plan ? `${x.plan.name} by ${x.plan.designer}, a pre-approved design, ${Math.round(x.w)} by ${Math.round(x.d)} feet. Drag to move. Arrow keys move it, R rotates it.` : `${st.long}, ${Math.round(x.w)} by ${Math.round(x.d)} feet, ${c.footprint} square feet. Drag to move, drag a handle to resize. Arrow keys move it, Shift with arrows resizes.`}
              onKeyDown={onKey(idx)}
              onFocus={() => setActive(idx)}
              style={{ outline: "none" }}
            >
              <path
                d={path(sb.pts)}
                fill={c.ok ? st.fill : "#F1B9A8"}
                fillOpacity={0.92}
                stroke={c.ok ? "#17241D" : "#B9573F"}
                strokeWidth={sw * (on ? 2.4 : 1.6)}
                style={{ cursor: dragging === "move" && on ? "grabbing" : "grab" }}
                onPointerDown={startGrab(idx, "move")}
                onDoubleClick={x.plan ? rotatePlan : undefined}
              />
              {(() => {
                // Fit the label inside the footprint: measure the chords through its centre, turn the text to run
                // along the long side when the box is tall and narrow, and shrink it (or drop the name) to fit.
                const th = (((x.angle ?? 0) + (swap ? 90 : 0)) * Math.PI) / 180;
                const cs = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
                const across = Math.min(cs > 1e-6 ? x.w / cs : Infinity, sn > 1e-6 ? x.d / sn : Infinity);
                const down = Math.min(sn > 1e-6 ? x.w / sn : Infinity, cs > 1e-6 ? x.d / cs : Infinity);
                const vertical = down > across * 1.3;
                const runW = (vertical ? down : across) * 0.84, runH = (vertical ? across : down) * 0.84;
                const name = x.plan ? x.plan.name.toUpperCase() : st.name;
                const dimsText = `${Math.round(x.w)}' × ${Math.round(x.d)}'`;
                const areaText = `${c.footprint.toLocaleString("en-US")} sf`;
                const need = Math.max(name.length * 0.5 * 0.7, dimsText.length * 0.66 * 0.58, areaText.length * 0.56 * 0.56) * fs;
                let k = Math.min(1, runW / need, runH / (fs * 2.3));
                const showName = k >= 0.55 || runH >= fs * 1.6;
                if (!showName) k = Math.min(1, runW / (dimsText.length * 0.66 * 0.58 * fs), runH / (fs * 1.6));
                const f = fs * Math.max(0.35, k);
                return (
                  <g pointerEvents="none" transform={vertical ? `rotate(-90 ${cxu} ${cyu})` : undefined} style={{ fill: "#17241D" }}>
                    {showName && <text x={cxu} y={cyu - f * 0.55} textAnchor="middle" style={{ fontSize: f * 0.5, fontWeight: 800, letterSpacing: x.plan ? "0.02em" : "0.06em" }}>{name}</text>}
                    <text x={cxu} y={cyu + (showName ? f * 0.2 : f * 0.1)} textAnchor="middle" style={{ fontSize: f * 0.66, fontWeight: 800 }}>{dimsText}</text>
                    <text x={cxu} y={cyu + (showName ? f * 0.92 : f * 0.82)} textAnchor="middle" style={{ fontSize: f * 0.56, fontWeight: 600 }}>{areaText}</text>
                  </g>
                );
              })()}
              {on && x.plan && (() => {
                // A small handle on a stem, out past the street-side edge. Drag it round to turn the footprint freely.
                const ang = ((x.angle ?? 0) * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
                const cu = x.u + x.w / 2, cv = x.v + x.d / 2;
                const at = (r: number) => L(cu + r * sa, cv - r * ca);
                const edge = at(x.d / 2), stem = at(x.d / 2 + fs * 0.9), hp = at(x.d / 2 + fs * 1.5);
                return (
                  <g data-pdf-skip role="slider" aria-label="Turn the footprint" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(x.angle ?? 0)} style={{ cursor: "grab" }} onPointerDown={startGrab(idx, "rotate")} onDoubleClick={rotatePlan}>
                    <line x1={edge.x} y1={edge.y} x2={stem.x} y2={stem.y} stroke="#17241D" strokeWidth={sw * 1.1} />
                    <circle cx={hp.x} cy={hp.y} r={fs * 0.9} fill="transparent" />
                    <circle cx={hp.x} cy={hp.y} r={fs * 0.42} fill="#fff" stroke="#17241D" strokeWidth={sw * 1.4} />
                    <path d={`M ${hp.x - fs * 0.2} ${hp.y} A ${fs * 0.2} ${fs * 0.2} 0 1 1 ${hp.x} ${hp.y + fs * 0.2}`} fill="none" stroke="#17241D" strokeWidth={sw * 1.2} strokeLinecap="round" />
                  </g>
                );
              })()}
              {on && !x.plan && ([
                ["nw", sb.x0, sb.y0, "nwse-resize"],
                ["ne", sb.x1, sb.y0, "nesw-resize"],
                ["sw", sb.x0, sb.y1, "nesw-resize"],
                ["se", sb.x1, sb.y1, "nwse-resize"],
                ["n", cxu, sb.y0, "ns-resize"],
                ["s", cxu, sb.y1, "ns-resize"],
                ["w", sb.x0, cyu, "ew-resize"],
                ["e", sb.x1, cyu, "ew-resize"],
              ] as [Grab, number, number, string][]).map(([h, hx, hy, cur]) => (
                <g key={h} data-pdf-skip onPointerDown={startGrab(idx, h)} style={{ cursor: cur }}>
                  <circle cx={hx} cy={hy} r={fs * 0.9} fill="transparent" />
                  <rect x={hx - fs * 0.32} y={hy - fs * 0.32} width={fs * 0.64} height={fs * 0.64} rx={fs * 0.12} fill="#fff" stroke={c.ok ? "#17241D" : "#B9573F"} strokeWidth={sw * 1.2} />
                </g>
              ))}
            </g>
          );
        })}

        {/* vehicle access route */}
        {access && (
          <g className="plat-fill" style={{ ["--d" as string]: "1.8s" }}>
            <defs>
              <marker id="mp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 Z" fill={accessColor(access.kind)} />
              </marker>
            </defs>
            {access.lane && <path d={path(access.lane)} fill={accessColor(access.kind)} fillOpacity="0.14" stroke={accessColor(access.kind)} strokeOpacity="0.55" strokeWidth={sw * 0.8} strokeDasharray={`${sw * 3} ${sw * 2}`} />}
            <line x1={access.a.x} y1={access.a.y} x2={access.b.x} y2={access.b.y} stroke={accessColor(access.kind)} strokeOpacity="0.9" strokeWidth={sw * 1.4} strokeLinecap="round" markerEnd={access.kind === "blocked" ? undefined : "url(#mp-arrow)"} />
            {access.kind === "blocked" && (
              <g transform={`translate(${mid(access.a, access.b).x} ${mid(access.a, access.b).y})`} stroke="#B9573F" strokeWidth={sw * 2.2} strokeLinecap="round">
                <line x1={-fs * 0.6} y1={-fs * 0.6} x2={fs * 0.6} y2={fs * 0.6} />
                <line x1={-fs * 0.6} y1={fs * 0.6} x2={fs * 0.6} y2={-fs * 0.6} />
              </g>
            )}
            <text x={(access.kind === "alley" ? access.a : mid(access.a, access.b)).x + fs * 0.9} y={(access.kind === "alley" ? access.a : mid(access.a, access.b)).y + fs * 0.3} stroke="#fff" strokeWidth={sw * 3} paintOrder="stroke" style={{ fontSize: fs * 0.6, fontWeight: 700, fill: accessColor(access.kind) }}>
              {access.label}
            </text>
          </g>
        )}

        {/* dimension strings */}
        <g stroke="#3D5A6C" strokeWidth={sw * 0.8} fill="none">
          <line x1={widthDim[0].x} y1={widthDim[0].y} x2={widthDim[1].x} y2={widthDim[1].y} />
          <line x1={depthDim[0].x} y1={depthDim[0].y} x2={depthDim[1].x} y2={depthDim[1].y} />
        </g>
        <text x={wm.x} y={wm.y - sw * 2} textAnchor="middle" style={{ fontSize: fs * 0.85, fontWeight: 600, fill: "#3D5A6C" }}>{`${lotW}'-0"`}</text>
        <text x={dm.x - sw * 2} y={dm.y} textAnchor="middle" transform={`rotate(-90 ${dm.x - sw * 2} ${dm.y})`} style={{ fontSize: fs * 0.85, fontWeight: 600, fill: "#3D5A6C" }}>{`${lotD}'-0"`}</text>

        {/* street names, along the street, nearest the lot; one label per name */}
        {[...new Map(streets.map((s) => [s.name.toUpperCase(), s])).values()]
          .map((s) => ({ s, at: labelAt(s.paths, { x: cx, y: cy }, lotPts) }))
          .filter((x): x is { s: (typeof streets)[number]; at: { p: Pt; deg: number } } => !!x.at)
          .sort((a, b) => Math.hypot(a.at.p.x - cx, a.at.p.y - cy) - Math.hypot(b.at.p.x - cx, b.at.p.y - cy))
          .slice(0, 3)
          .map(({ s, at }, i) => (
            <text key={i} x={at.p.x} y={at.p.y} dy={fs * 0.32} textAnchor="middle" transform={`rotate(${at.deg} ${at.p.x} ${at.p.y})`} stroke="#fff" strokeWidth={sw * 3} paintOrder="stroke" style={{ fontSize: fs * 0.85, fontWeight: 700, fill: "#2F3D35", letterSpacing: "0.02em" }}>
              {s.name}
            </text>
          ))}
        {/* alley labels: along the alley, past the end of the lot so they do not sit on the DADU */}
        {alleys.slice(0, 1).map((pts, i) => {
          const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
          const ax0 = Math.min(...xs), ax1 = Math.max(...xs), ay0 = Math.min(...ys), ay1 = Math.max(...ys);
          const vertical = ay1 - ay0 > ax1 - ax0;
          const c = vertical
            ? { x: (ax0 + ax1) / 2, y: Math.min(ay1, Math.max(ay0, y1 + 16)) }
            : { x: Math.min(ax1, Math.max(ax0, x0 - 16)), y: (ay0 + ay1) / 2 };
          return (
            <text key={`all${i}`} x={c.x} y={c.y} dy={fs * 0.3} textAnchor="middle" transform={vertical ? `rotate(-90 ${c.x} ${c.y})` : undefined} stroke="#fff" strokeWidth={sw * 2.5} paintOrder="stroke" pointerEvents="none" style={{ fontSize: fs * 0.72, fontWeight: 700, fill: "#7A6748", letterSpacing: "0.08em" }}>
              ALLEY
            </text>
          );
        })}
        {/* setback labels */}
        {setbackLabels.map((b, i) => (
          <text key={`sbp${i}`} x={b.at.x} y={b.at.y} dy={fs * 0.2} textAnchor="middle" transform={`rotate(${b.deg} ${b.at.x} ${b.at.y})`} stroke="#fff" strokeWidth={sw * 2.5} paintOrder="stroke" pointerEvents="none" style={{ fontSize: fs * 0.5, fontWeight: 700, fill: "#9A4632" }}>
            {b.label}
          </text>
        ))}
        {setbackBands.map((b, i) => (
          <text key={`sbl${i}`} x={b.at.x} y={b.at.y} dy={fs * 0.25} textAnchor="middle" transform={b.vertical ? `rotate(-90 ${b.at.x} ${b.at.y})` : undefined} stroke="#fff" strokeWidth={sw * 2.5} paintOrder="stroke" pointerEvents="none" style={{ fontSize: fs * 0.55, fontWeight: 700, fill: "#9A4632" }}>
            {b.label}
          </text>
        ))}
        {onAlley && (() => {
          // Just outside the rear lot line, rotated to run along it.
          const p0 = L(lw * 0.22, ld + 2.5);
          return (
            <text x={p0.x} y={p0.y} dy={fs * 0.2} textAnchor="middle" transform={swap ? `rotate(-90 ${p0.x} ${p0.y})` : undefined} stroke="#fff" strokeWidth={sw * 2.5} paintOrder="stroke" pointerEvents="none" style={{ fontSize: fs * 0.5, fontWeight: 700, fill: "#7A6748" }}>
              No rear setback on the alley
            </text>
          );
        })()}

        {/* contour labels: index lines, at the crossing nearest the lot */}
        {contours.filter((c) => c.index).map((c) => {
          const mids = c.segments.map(([a, b]) => { const p = proj(a[0], a[1]), q = proj(b[0], b[1]); return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; });
          const inLot = mids.filter((m) => m.x > x0 && m.x < x1 && m.y > y0 && m.y < y1);
          const pick = (inLot.length ? inLot : mids).reduce((a, m) => (Math.hypot(m.x - cx, m.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? m : a));
          return (
            <text key={`ctl${c.elevation}`} x={pick.x} y={pick.y} dy={fs * 0.2} textAnchor="middle" stroke="#fff" strokeWidth={sw * 2.2} paintOrder="stroke" pointerEvents="none" style={{ fontSize: fs * 0.5, fontWeight: 700, fill: "#7A5A36" }}>
              {`${c.elevation}'`}
            </text>
          );
        })}

        {/* north arrow, turned with the lot when the plan is squared to it */}
        <g transform={`translate(${vbX + vbW - margin * 0.7} ${vbY + margin * 0.75}) rotate(${((-theta * 180) / Math.PI).toFixed(2)})`}>
          <circle r={fs * 1.3} fill="none" stroke="#17241D" strokeWidth={sw} />
          <path d={`M0 ${-fs} L${fs * 0.45} ${fs * 0.6} L0 ${fs * 0.25} L${-fs * 0.45} ${fs * 0.6} Z`} fill="#17241D" />
          <text y={-fs * 1.6} textAnchor="middle" style={{ fontSize: fs * 0.85, fontWeight: 700 }}>N</text>
        </g>

        {/* scale bar, 20 ft */}
        <g transform={`translate(${scaleX} ${scaleY})`}>
          <rect x="0" y="0" width="10" height={sw * 2} fill="#17241D" />
          <rect x="10" y="0" width="10" height={sw * 2} fill="none" stroke="#17241D" strokeWidth={sw * 0.6} />
          <text x="0" y={-sw * 2} style={{ fontSize: fs * 0.7 }}>0</text>
          <text x="20" y={-sw * 2} textAnchor="end" style={{ fontSize: fs * 0.7 }}>20 ft</text>
        </g>
      </svg>

      {hasSection && (
        <LotSection
          profile={sectionProfile}
          pad={SECTION_PAD}
          lotDepth={ld}
          rearSetback={rear}
          onAlley={onAlley}
          buildings={sectionBuildings}
          units={units.map((x) => { const e = extent(x); return { kind: x.kind, s0: e.v + SECTION_PAD, s1: e.v + e.d + SECTION_PAD, stories: x.plan ? x.plan.stories : x.kind === "dadu" ? stories : 1, cut: sectionU >= e.u - 0.01 && sectionU <= e.u + e.w + 0.01 }; })}
          maxHeight={fp?.maxHeight ?? null}
        />
      )}
      </div>

      <div className="min-w-0 xl:sticky xl:top-[186px] xl:max-h-[calc(100vh-200px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-3">
      {units.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 xl:mt-0" aria-live="polite">
          {units.map((x, idx) => {
            const c = checks[idx];
            const st = UNIT_STYLE[x.kind];
            return (
              <div
                key={x.kind}
                className="rounded-xl p-3 transition-shadow"
                style={{ background: "var(--card, #fff)", boxShadow: active === idx ? "0 0 0 2px #145A40, 0 4px 14px -6px rgba(23,36,29,.25)" : "0 1px 2px rgba(23,36,29,.08), 0 4px 14px -6px rgba(23,36,29,.18)" }}
                onClick={() => setActive(idx)}
              >
                {x.plan ? (
                  <PlacedPlanCard plan={x.plan} variants={PREAPPROVED_PLANS.filter((v) => v.family === x.plan!.family)} onVariant={placePlan} fit={planFit} angle={x.angle ?? 0} living={c.living} maxLiving={maxLiving} checks={c.list} onRotate={rotatePlan} onRemove={removePlan} />
                ) : (
                  <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm" style={{ color: "var(--ink)" }}>
                    <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: st.fill, border: "1px solid #17241D" }} />
                    <span className="font-semibold">{st.long}</span>
                  </p>
                  {x.kind === "aadu" && (
                    <button type="button" className="text-xs font-semibold underline-offset-2 hover:underline" style={{ color: "var(--slate)" }} onClick={(e) => { e.stopPropagation(); removeAadu(); }}>Remove</button>
                  )}
                </div>
                <p className="mt-1" style={{ color: "var(--ink)" }}>
                  <span className="pa-display text-2xl tabular-nums">{Math.round(x.w)}&prime; × {Math.round(x.d)}&prime;</span>
                  <span className="ml-2 text-sm tabular-nums" style={{ color: "var(--slate)" }}>{c.footprint.toLocaleString("en-US")} sf footprint</span>
                </p>
                {x.kind === "dadu" && canTwoStory && (
                  <div className="mt-2 flex items-center gap-1 text-xs" role="group" aria-label="Stories">
                    {([1, 2] as const).map((n) => (
                      <button key={n} type="button" aria-pressed={stories === n} onClick={() => setStories(n)} className={`pa-chip ${stories === n ? "pa-chip-active" : ""}`} style={{ minHeight: 30 }}>
                        {n} {n === 1 ? "story" : "stories"}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-sm tabular-nums" style={{ color: c.living > maxLiving ? "var(--red)" : "var(--ink)" }}>
                  Living area <strong>{c.living.toLocaleString("en-US")} sf</strong> of {maxLiving.toLocaleString("en-US")} sf allowed
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {c.list.map((k) => <li key={k.text} style={{ color: k.ok ? "var(--green)" : "var(--red)" }}>{k.text}</li>)}
                </ul>
                  </>
                )}
              </div>
            );
          })}
          {(overCoverage || overAduCap) && (
            <ul className="text-xs" style={{ color: "var(--red)" }}>
              {overCoverage && <li>Together the new footprints ({totalFootprint.toLocaleString("en-US")} sf) are over the {Math.round(coverageLeft!).toLocaleString("en-US")} sf of lot coverage left.</li>}
              {overAduCap && <li>A lot can have 2 ADUs. This one already has {existingAdus}, so you can add {Math.max(0, 2 - existingAdus)} more.</li>}
            </ul>
          )}
          <PlanPicker plans={PREAPPROVED_PLANS} fit={planFit} activeId={planUnit?.plan?.id ?? null} onPick={placePlan} />
          <div className="flex flex-wrap gap-2">
            {!units.some((x) => x.kind === "aadu") && (
              <button type="button" className="pa-btn pa-btn-sm" onClick={addAadu}><Plus size={14} aria-hidden /> Add an attached ADU</button>
            )}
            <Link href={calculatorHref({ sf: totalLiving })} className="pa-btn pa-btn-sm no-underline"><Calculator size={14} aria-hidden /> Estimate return at {totalLiving.toLocaleString("en-US")} sf</Link>
            <button type="button" className="pa-btn pa-btn-sm" onClick={() => { setUnits(initialDadu ? [initialDadu] : []); setStories(canTwoStory ? 2 : 1); setActive(null); }}><RotateCcw size={14} aria-hidden /> Reset</button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--slate)" }}>Select a unit, then drag it to move or drag a handle to resize. Arrow keys move it; Shift with arrows resizes. A detached ADU keeps {HOUSE_SEPARATION_FT} ft from the house; an attached ADU joins it. A sketch to get a feel for the lot, not a design.</p>
        </div>
      )}
      </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-xs" style={{ color: "var(--slate)", borderColor: "var(--hairline)" }}>
        <Key swatch={<i style={{ background: "rgba(30, 110, 80,0.3)", border: "1px dashed #145A40" }} />}>Buildable envelope ({FRONT_SETBACK_FT} ft front, {side} ft side{lotEdges.some((e) => e.onStreet) ? `, ${STREET_SIDE_SETBACK_FT} ft on a street side` : ""}, {rear ? `${rear} ft rear` : "no rear setback on the alley"})</Key>
        <Key swatch={<i style={{ background: "#E6C97E", border: "1px solid #17241D" }} />}>Detached ADU (drag to edit)</Key>
        {units.some((x) => x.kind === "aadu") && <Key swatch={<i style={{ background: "#A9CFC4", border: "1px solid #17241D" }} />}>Attached ADU</Key>}
        {separation && <Key swatch={<i style={{ border: "1px dashed #B9573F" }} />}>{HOUSE_SEPARATION_FT} ft from the house</Key>}
        <Key swatch={<i style={{ background: "repeating-linear-gradient(-45deg,#B9573F55 0 1px,transparent 1px 4px)", border: "1px solid #B9573F88" }} />}>Setback{onAlley ? " (none on the alley)" : ""}</Key>
        <Key swatch={<i style={{ background: "repeating-linear-gradient(45deg,#17241D66 0 1px,transparent 1px 4px)", border: "1px solid #17241D" }} />}>Existing structure</Key>
        <Key swatch={<i style={{ background: "rgba(31,94,59,0.16)", border: "1.5px solid #1F5E3B", borderRadius: "50%" }} />}>Large tree (likely protected)</Key>
        <Key swatch={<i style={{ background: "rgba(63,138,94,0.10)", border: "1px dashed #3F8A5E", borderRadius: "50%" }} />}>Medium tree (removal needs replacement)</Key>
        <Key swatch={<i style={{ border: "1px dashed #8DB89C", borderRadius: "50%" }} />}>Small tree</Key>
        {clearSpot && <Key swatch={<i style={{ border: "1.5px dotted #2E5C6E" }} />}>Open ground clear of trees ({treeStats!.clearSqft.toLocaleString("en-US")} sf)</Key>}
        <Key swatch={<i style={{ background: "#CFD9D3" }} />}>Street</Key>
        <Key swatch={<i style={{ background: "#D9CDB4", border: "1px solid #A8957A" }} />}>Alley</Key>
        <Key swatch={<i style={{ borderTop: "2px solid #145A40", height: 0, marginTop: 5 }} />}>Vehicle access route</Key>
        {hasSection && <Key swatch={<i style={{ borderTop: "1px dashed rgba(23,36,29,.45)", height: 0, marginTop: 5 }} />}>Section line A–A′</Key>}
      </figcaption>
    </figure>
  );
}

function Key({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-flex h-3 w-4 [&>i]:block [&>i]:h-full [&>i]:w-full [&>i]:rounded-[2px]">
        {swatch}
      </span>
      {children}
    </span>
  );
}
