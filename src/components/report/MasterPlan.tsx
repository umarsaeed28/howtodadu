"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Calculator, Plus, RotateCcw } from "lucide-react";
import type { FeasibilityData, LotGeometry, SitePlanData } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { calculatorHref } from "@/lib/calculator/inputs";

type Pt = { x: number; y: number };
type Side = "N" | "S" | "E" | "W";

const FT_PER_DEG_LAT = 364567;
const MIN_ACCESS_FT = 12; // construction heuristic, mirrors config.min_access_width_ft
const DRIVEWAY_FT = 10; // a driveway needs 10 ft (dadu-score)
const BLOCKED_BELOW_FT = 8; // roofline gap under 8 ft: no vehicle access (dadu-score)

/** Angle in degrees of the street segment nearest a point, kept upright for text. */
function labelAt(paths: Pt[][], target: Pt): { p: Pt; deg: number } | null {
  let best: { p: Pt; deg: number; d: number } | null = null;
  for (const pth of paths)
    for (let i = 0; i < pth.length - 1; i++) {
      const a = pth[i], b = pth[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / len2));
      const p = { x: a.x + t * dx, y: a.y + t * dy };
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

const path = (pts: Pt[], close = true) =>
  pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(" ") + (close ? " Z" : "");

type PlanProps = {
  lot: LotGeometry | null;
  sitePlan: SitePlanData | null | undefined;
  feasibility: FeasibilityData | null;
  report: ADUReport | null;
  pin: string | null;
};

/** DADU in lot-local feet: u across the street frontage, v from the street toward the rear. */
type Box = { u: number; v: number; w: number; d: number };
type Grab = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type Unit = Box & { kind: "dadu" | "aadu" };
const MIN_SIDE_FT = 10;
/** A detached ADU keeps 5 ft from the house (team rule). An attached ADU joins the house, so it does not. */
const HOUSE_SEPARATION_FT = 5;
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

function PlanSheet({ lot, sitePlan, feasibility, report, pin }: PlanProps & { lot: LotGeometry }) {
  /* ---- projection: lng/lat to feet, north up ---- */
  const lat0 = lot.rings.reduce((s, r) => s + r[1], 0) / lot.rings.length;
  const lng0 = lot.rings.reduce((s, r) => s + r[0], 0) / lot.rings.length;
  const ftLng = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const proj = (lng: number, lat: number): Pt => ({ x: (lng - lng0) * ftLng, y: -(lat - lat0) * FT_PER_DEG_LAT });
  const ring = (rs: number[][]) => rs.map((r) => proj(r[0], r[1]));

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

  /* ---- existing structures on this lot ---- */
  const houses = (sitePlan?.buildings ?? [])
    .map((b) => ({ pts: ring(b.rings), pin: b.pin ?? null }))
    .filter((b) => {
      if (pin && b.pin && b.pin === pin) return true;
      const c = { x: b.pts.reduce((s, q) => s + q.x, 0) / b.pts.length, y: b.pts.reduce((s, q) => s + q.y, 0) / b.pts.length };
      return pointInPoly(c, lotPts);
    });
  const hLocal = houses.flatMap((h) => h.pts.map(toLocal));
  const houseMinU = hLocal.length ? Math.min(...hLocal.map((q) => q.u)) : null;
  const houseMaxU = hLocal.length ? Math.max(...hLocal.map((q) => q.u)) : null;
  const houseMaxV = hLocal.length ? Math.max(...hLocal.map((q) => q.v)) : 0;

  /* ---- setbacks, envelope, DADU ---- */
  const fp = report?.daduFootprint ?? null;
  const onAlley = !!feasibility?.hasAlley;
  const side = fp?.sideSetback ?? 5;
  const rear = onAlley ? 0 : fp?.rearSetback ?? 5; // a rear line on an alley needs no setback
  const envelope = rect(side, 0, Math.max(0, lw - 2 * side), Math.max(0, ld - rear));
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

  const initialDadu: Unit | null = fp
    ? (() => {
        const w = Math.max(MIN_SIDE_FT, Math.min(fp.suggestedWidth, lw - 2 * side));
        const d = Math.max(MIN_SIDE_FT, Math.min(fp.suggestedDepth, ld - rear));
        return { kind: "dadu", u: (lw - w) / 2, v: Math.max(0, ld - rear - d), w, d };
      })()
    : null;
  const [units, setUnits] = useState<Unit[]>(initialDadu ? [initialDadu] : []);
  const [stories, setStories] = useState<1 | 2>(canTwoStory ? 2 : 1);
  const [active, setActive] = useState<number | null>(null);
  const [dragging, setDragging] = useState<Grab | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const grab = useRef<{ idx: number; mode: Grab; start: { u: number; v: number }; box: Unit } | null>(null);

  /** Keep a unit inside the lot behind the setbacks, at least 10 ft a side, snapped to whole feet. */
  const clampBox = useCallback(
    (b: Unit): Unit => {
      const maxW = Math.max(MIN_SIDE_FT, lw - 2 * side);
      const maxD = Math.max(MIN_SIDE_FT, ld - rear);
      const w = Math.round(Math.min(maxW, Math.max(MIN_SIDE_FT, b.w)));
      const d = Math.round(Math.min(maxD, Math.max(MIN_SIDE_FT, b.d)));
      const u = Math.round(Math.min(lw - side - w, Math.max(side, b.u)) * 2) / 2;
      const v = Math.round(Math.min(ld - rear - d, Math.max(0, b.v)) * 2) / 2;
      return { ...b, u, v, w, d };
    },
    [lw, ld, side, rear]
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
    const others = [...bldgBoxes.slice(1), ...units.map((x) => ({ u0: x.u, u1: x.u + x.w, v0: x.v, v1: x.v + x.d }))];
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


  /** Rule checks per unit. A DADU keeps 5 ft from the house; an attached ADU must join it. */
  const checks = units.map((x) => {
    const footprint = Math.round(x.w * x.d);
    const living = x.kind === "dadu" ? footprint * stories : footprint;
    const hitsBuilding = bldgBoxes.some((b) => overlaps(x, b));
    const houseGap = mainHouse ? gap(x, mainHouse) : null;
    const list: { ok: boolean; text: string }[] = [{ ok: true, text: "Inside the lot setbacks" }];
    if (hitsBuilding) list.push({ ok: false, text: "Overlaps an existing building" });
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
  const daduUnit = daduIdx >= 0 ? units[daduIdx] : null;
  const dadu: Pt[] | null = daduUnit ? rect(daduUnit.u, daduUnit.v, daduUnit.w, daduUnit.d) : null;
  const daduV0 = daduUnit?.v ?? 0;
  const daduConflict = daduIdx >= 0 && !checks[daduIdx].ok;

  /* ---- vehicle access: alley, corner, or the roomier side yard (same rule as the score) ---- */
  type AccessKind = "alley" | "corner" | "side" | "tight" | "blocked";
  let access: { a: Pt; b: Pt; width: number | null; kind: AccessKind; label: string } | null = null;
  let noSideYard = false;
  const isCorner = (feasibility?.lotType ?? "").toLowerCase().includes("corner");
  if (feasibility?.hasAlley) {
    // From the alley to the DADU's back edge, so the arrow does not cover its label.
    const um = daduUnit ? daduUnit.u + daduUnit.w / 2 : lw / 2;
    access = { a: L(um, ld + 7), b: L(um, daduUnit ? daduUnit.v + daduUnit.d + 0.5 : ld * 0.8), width: null, kind: "alley", label: "Alley access" };
  } else if (houseMinU != null && houseMaxU != null) {
    const left = houseMinU;
    const right = lw - houseMaxU;
    const useLeft = left >= right;
    const drawn = Math.max(0, useLeft ? left : right);
    const width = feasibility?.sideClearanceFt ?? drawn; // the measured value the score uses
    const u = useLeft ? left / 2 : houseMaxU + right / 2;
    const kind: AccessKind = width >= DRIVEWAY_FT ? "side" : width >= BLOCKED_BELOW_FT ? "tight" : "blocked";
    const label = kind === "side" ? `Driveway ${width.toFixed(1)}'` : kind === "tight" ? `${width.toFixed(1)}': confirm` : `No car access: ${width.toFixed(1)}'`;
    if (drawn >= 1.5) access = { a: L(u, -6), b: L(u, Math.max(daduV0, houseMaxV)), width, kind: isCorner && kind === "blocked" ? "corner" : kind, label: isCorner && kind === "blocked" ? "Corner: use the side street" : label };
    else noSideYard = true;
  }
  const accessColor = (k: AccessKind) => (k === "blocked" ? "#B9573F" : k === "tight" ? "#B8862B" : "#145A40");

  /* ---- alleys near the lot ---- */
  const alleys = (sitePlan?.alleys ?? []).map((r) => ring(r));

  /* ---- trees ---- */
  const pad = 14;
  const trees = (sitePlan?.trees ?? [])
    .map((t) => ({ c: proj(t.centroid[0], t.centroid[1]), r: t.radiusFt, flag: !!t.inDADUZone }))
    .filter((t) => t.c.x > x0 - pad && t.c.x < x1 + pad && t.c.y > y0 - pad && t.c.y < y1 + pad);

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
    if (g.mode === "move") {
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
    const mv = k[e.key];
    if (!mv) return;
    e.preventDefault();
    if (e.shiftKey) {
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
  const screenBox = (x: Box) => {
    const pts = rect(x.u, x.v, x.w, x.d);
    return { pts, x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)) };
  };
  /** The 5 ft separation a DADU keeps from the house, drawn as a dashed ring. */
  const separation = mainHouse && daduUnit ? rect(mainHouse.u0 - HOUSE_SEPARATION_FT, mainHouse.v0 - HOUSE_SEPARATION_FT, mainHouse.u1 - mainHouse.u0 + 2 * HOUSE_SEPARATION_FT, mainHouse.v1 - mainHouse.v0 + 2 * HOUSE_SEPARATION_FT) : null;

  /* ---- setback bands: the strip between each lot line and the envelope ---- */
  const setbackBands: { pts: Pt[]; label: string; at: Pt; vertical: boolean }[] = [];
  if (side > 0) {
    setbackBands.push({ pts: rect(0, 0, side, ld), label: `${side}' side setback`, at: L(side / 2, ld * 0.62), vertical: !swap });
    setbackBands.push({ pts: rect(lw - side, 0, side, ld), label: `${side}' side setback`, at: L(lw - side / 2, ld * 0.62), vertical: !swap });
  }
  if (rear > 0) setbackBands.push({ pts: rect(side, ld - rear, Math.max(0, lw - 2 * side), rear), label: `${rear}' rear setback`, at: L(lw / 2, ld - rear / 2), vertical: swap });

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

  const scaleX = vbX + vbW - margin * 0.35 - 20;
  const scaleY = vbY + vbH - margin * 0.5;

  return (
    <figure className="plat-sheet" style={{ margin: 0, padding: "clamp(12px, 2vw, 20px)" }}>
      <svg
        ref={svgRef}
        className="plat"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        onPointerMove={onMove}
        onPointerUp={endGrab}
        onPointerCancel={endGrab}
        role="img"
        aria-label={`Master plan of the lot at ${lotW} by ${lotD} feet with the buildable envelope, existing structures${dadu ? ", and a proposed detached accessory dwelling unit" : ""}.`}
        style={{ fontSize: fs, maxHeight: "68vh", touchAction: active ? "none" : undefined, userSelect: "none" }}
      >
        <defs>
          <pattern id="mp-house" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#17241D" strokeOpacity="0.4" strokeWidth={sw * 0.6} />
          </pattern>
        </defs>

        {adj.map((d, i) => (
          <path key={`a${i}`} d={d} fill="none" stroke="#17241D" strokeOpacity="0.22" strokeWidth={sw * 0.8} />
        ))}
        {streets.map((s, i) =>
          s.paths.map((p, j) => (
            <path key={`s${i}-${j}`} d={path(p, false)} fill="none" stroke="#CFD9D3" strokeWidth={Math.max(9, sw * 14)} strokeLinecap="round" strokeLinejoin="round" />
          ))
        )}
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
            <path d={path(envelope)} fill="none" stroke="#145A40" strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`} />
          </g>
        )}

        {/* setbacks: hatched strips between the lot lines and the buildable envelope */}
        <defs>
          <pattern id="mp-setback" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#B9573F" strokeOpacity="0.35" strokeWidth={sw * 0.8} />
          </pattern>
        </defs>
        {setbackBands.map((b, i) => (
          <g key={`sb${i}`}>
            <path d={path(b.pts)} fill="url(#mp-setback)" stroke="#B9573F" strokeOpacity="0.5" strokeWidth={sw * 0.6} />
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
          strokeWidth={sw * 2.2}
          strokeLinejoin="round"
        />

        {/* existing structures */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.2s" }}>
          {houses.map((h, i) => (
            <path key={i} d={path(h.pts)} fill="url(#mp-house)" stroke="#17241D" strokeWidth={sw * 1.4} />
          ))}
        </g>

        {/* trees with drip lines */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.4s" }}>
          {trees.map((t, i) => (
            <g key={i}>
              <circle cx={t.c.x} cy={t.c.y} r={t.r} fill="none" stroke={t.flag ? "#B9573F" : "#4E9A6B"} strokeWidth={sw} strokeDasharray={`${sw * 2.5} ${sw * 2.5}`} />
              <circle cx={t.c.x} cy={t.c.y} r={sw * 1.6} fill={t.flag ? "#B9573F" : "#4E9A6B"} />
            </g>
          ))}
        </g>

        {/* 5 ft separation a DADU keeps from the house */}
        {separation && (
          <g pointerEvents="none">
            <path d={path(separation)} fill="none" stroke="#B9573F" strokeOpacity="0.7" strokeWidth={sw} strokeDasharray={`${sw * 2} ${sw * 2}`} />
            {(() => {
              const p0 = L((mainHouse!.u0 + mainHouse!.u1) / 2, mainHouse!.v0 - HOUSE_SEPARATION_FT / 2);
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
              aria-label={`${st.long}, ${Math.round(x.w)} by ${Math.round(x.d)} feet, ${c.footprint} square feet. Drag to move, drag a handle to resize. Arrow keys move it, Shift with arrows resizes.`}
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
              />
              <text x={cxu} y={cyu - fs * 0.55} textAnchor="middle" pointerEvents="none" style={{ fontSize: fs * 0.5, fontWeight: 800, fill: "#17241D", letterSpacing: "0.06em" }}>{st.name}</text>
              <text x={cxu} y={cyu + fs * 0.2} textAnchor="middle" pointerEvents="none" style={{ fontSize: fs * 0.66, fontWeight: 800, fill: "#17241D" }}>{`${Math.round(x.w)}' × ${Math.round(x.d)}'`}</text>
              <text x={cxu} y={cyu + fs * 0.92} textAnchor="middle" pointerEvents="none" style={{ fontSize: fs * 0.56, fontWeight: 600, fill: "#17241D" }}>{`${c.footprint.toLocaleString("en-US")} sf`}</text>
              {on && ([
                ["nw", sb.x0, sb.y0, "nwse-resize"],
                ["ne", sb.x1, sb.y0, "nesw-resize"],
                ["sw", sb.x0, sb.y1, "nesw-resize"],
                ["se", sb.x1, sb.y1, "nwse-resize"],
                ["n", cxu, sb.y0, "ns-resize"],
                ["s", cxu, sb.y1, "ns-resize"],
                ["w", sb.x0, cyu, "ew-resize"],
                ["e", sb.x1, cyu, "ew-resize"],
              ] as [Grab, number, number, string][]).map(([h, hx, hy, cur]) => (
                <g key={h} onPointerDown={startGrab(idx, h)} style={{ cursor: cur }}>
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
              <marker id="mp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 Z" fill={accessColor(access.kind)} />
              </marker>
            </defs>
            <line x1={access.a.x} y1={access.a.y} x2={access.b.x} y2={access.b.y} stroke={accessColor(access.kind)} strokeWidth={sw * 2.2} strokeDasharray={access.kind === "blocked" ? `${sw * 2} ${sw * 2}` : undefined} strokeLinecap="round" markerEnd={access.kind === "blocked" ? undefined : "url(#mp-arrow)"} />
            {access.kind === "blocked" && (
              <g transform={`translate(${mid(access.a, access.b).x} ${mid(access.a, access.b).y})`} stroke="#B9573F" strokeWidth={sw * 2.2} strokeLinecap="round">
                <line x1={-fs * 0.6} y1={-fs * 0.6} x2={fs * 0.6} y2={fs * 0.6} />
                <line x1={-fs * 0.6} y1={fs * 0.6} x2={fs * 0.6} y2={-fs * 0.6} />
              </g>
            )}
            <text x={(access.kind === "alley" ? access.a : mid(access.a, access.b)).x + fs * 0.9} y={(access.kind === "alley" ? access.a : mid(access.a, access.b)).y + fs * 0.3} stroke="#fff" strokeWidth={sw * 3} paintOrder="stroke" style={{ fontSize: fs * 0.8, fontWeight: 700, fill: accessColor(access.kind) }}>
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
          .map((s) => ({ s, at: labelAt(s.paths, { x: cx, y: cy }) }))
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

        {/* north arrow (north is up) */}
        <g transform={`translate(${vbX + vbW - margin * 0.7} ${vbY + margin * 0.75})`}>
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

      {units.length > 0 && (
        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
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
              </div>
            );
          })}
          {(overCoverage || overAduCap) && (
            <ul className="text-xs" style={{ color: "var(--red)" }}>
              {overCoverage && <li>Together the new footprints ({totalFootprint.toLocaleString("en-US")} sf) are over the {Math.round(coverageLeft!).toLocaleString("en-US")} sf of lot coverage left.</li>}
              {overAduCap && <li>A lot can have 2 ADUs. This one already has {existingAdus}, so you can add {Math.max(0, 2 - existingAdus)} more.</li>}
            </ul>
          )}
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

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-xs" style={{ color: "var(--slate)", borderColor: "var(--hairline)" }}>
        <Key swatch={<i style={{ background: "rgba(30, 110, 80,0.3)", border: "1px dashed #145A40" }} />}>Buildable envelope ({side} ft side, {rear ? `${rear} ft rear` : "no rear setback on the alley"})</Key>
        <Key swatch={<i style={{ background: "#E6C97E", border: "1px solid #17241D" }} />}>Detached ADU (drag to edit)</Key>
        {units.some((x) => x.kind === "aadu") && <Key swatch={<i style={{ background: "#A9CFC4", border: "1px solid #17241D" }} />}>Attached ADU</Key>}
        {separation && <Key swatch={<i style={{ border: "1px dashed #B9573F" }} />}>{HOUSE_SEPARATION_FT} ft from the house</Key>}
        <Key swatch={<i style={{ background: "repeating-linear-gradient(-45deg,#B9573F55 0 1px,transparent 1px 4px)", border: "1px solid #B9573F88" }} />}>Setback{onAlley ? " (none on the alley)" : ""}</Key>
        <Key swatch={<i style={{ background: "repeating-linear-gradient(45deg,#17241D66 0 1px,transparent 1px 4px)", border: "1px solid #17241D" }} />}>Existing structure</Key>
        <Key swatch={<i style={{ border: "1px dashed #4E9A6B", borderRadius: "50%" }} />}>Tree drip line</Key>
        <Key swatch={<i style={{ background: "#CFD9D3" }} />}>Street</Key>
        <Key swatch={<i style={{ background: "#D9CDB4", border: "1px solid #A8957A" }} />}>Alley</Key>
        <Key swatch={<i style={{ borderTop: "2px solid #145A40", height: 0, marginTop: 5 }} />}>Vehicle access route</Key>
      </figcaption>
      <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>
        Front setback and ECA outlines are not drawn: this data has no geometry for them.
        {daduConflict && " The DADU breaks a rule where it sits now (see the checks below). Drag it clear."}
        {access?.kind === "alley" && " Cars and construction reach the back from the alley."}
        {access?.kind === "side" && access.width != null && access.width < MIN_ACCESS_FT && ` The side yard fits a ${DRIVEWAY_FT} ft driveway but is under the ${MIN_ACCESS_FT} ft construction heuristic.`}
        {access?.kind === "tight" && ` The roofline leaves about ${access.width?.toFixed(1)} ft beside the house. Below the eaves it may fit a ${DRIVEWAY_FT} ft driveway; confirm on site.`}
        {access?.kind === "blocked" && ` No vehicle access to the rear: the house leaves only ${access.width?.toFixed(1)} ft beside it and there is no alley. A driveway needs ${DRIVEWAY_FT} ft.`}
        {access?.kind === "corner" && " The side yards are too narrow, but the corner lot's second street can serve the back."}
        {noSideYard && " The house leaves no usable side yard for an access path, so none is drawn."}
        {!streets.length && " No street geometry returned, so the street side is assumed south."}
      </p>
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
