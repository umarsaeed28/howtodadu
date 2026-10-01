import type { FeasibilityData, LotGeometry, SitePlanData } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";

type Pt = { x: number; y: number };
type Side = "N" | "S" | "E" | "W";

const FT_PER_DEG_LAT = 364567;
const MIN_ACCESS_FT = 12; // construction heuristic, mirrors config.min_access_width_ft

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

export default function MasterPlan({
  lot,
  sitePlan,
  feasibility,
  report,
  pin,
}: {
  lot: LotGeometry | null;
  sitePlan: SitePlanData | null | undefined;
  feasibility: FeasibilityData | null;
  report: ADUReport | null;
  pin: string | null;
}) {
  if (!lot || lot.rings.length < 3) {
    return (
      <div className="pa-inset flex aspect-[4/3] items-center justify-center p-6 text-center text-sm" style={{ color: "var(--slate)" }}>
        Parcel geometry is not available for this address, so the master plan cannot be drawn.
      </div>
    );
  }

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
  const side = fp?.sideSetback ?? 5;
  const rear = fp?.rearSetback ?? 5;
  const envelope = rect(side, 0, Math.max(0, lw - 2 * side), Math.max(0, ld - rear));
  let dadu: Pt[] | null = null;
  let daduLabel = "";
  let daduConflict = false;
  let daduV0 = 0;
  if (fp) {
    const dw = Math.min(fp.suggestedWidth, lw - 2 * side);
    const dd = fp.suggestedDepth;
    daduV0 = Math.max(0, ld - rear - dd);
    daduConflict = houseMaxV > 0 && daduV0 < houseMaxV;
    dadu = rect((lw - dw) / 2, daduV0, dw, dd);
    daduLabel = `DADU ${Math.round(dw)}' × ${Math.round(dd)}'`;
  }

  /* ---- access path along the roomier side yard ---- */
  let access: { a: Pt; b: Pt; width: number } | null = null;
  let noSideYard = false;
  if (houseMinU != null && houseMaxU != null && fp) {
    const left = houseMinU;
    const right = lw - houseMaxU;
    const useLeft = left >= right;
    const width = Math.max(0, useLeft ? left : right);
    const u = useLeft ? left / 2 : houseMaxU + right / 2;
    if (width >= 3) access = { a: L(u, 0), b: L(u, daduV0), width };
    else noSideYard = true;
  }

  /* ---- trees ---- */
  const pad = 14;
  const trees = (sitePlan?.trees ?? [])
    .map((t) => ({ c: proj(t.centroid[0], t.centroid[1]), r: t.radiusFt, flag: !!t.inDADUZone }))
    .filter((t) => t.c.x > x0 - pad && t.c.x < x1 + pad && t.c.y > y0 - pad && t.c.y < y1 + pad);

  /* ---- viewBox ---- */
  const margin = 44;
  const vbX = x0 - margin;
  const vbY = y0 - margin;
  const vbW = x1 - x0 + margin * 2;
  const vbH = y1 - y0 + margin * 2;
  const fs = Math.max(vbW, vbH) / 40;
  const sw = Math.max(vbW, vbH) / 300;

  const dimOff = 9;
  const widthDim = [L(0, ld + dimOff), L(lw, ld + dimOff)];
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
        className="plat"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        role="img"
        aria-label={`Master plan of the lot at ${lotW} by ${lotD} feet with the buildable envelope, existing structures${dadu ? ", and a proposed detached accessory dwelling unit" : ""}.`}
        style={{ fontSize: fs, maxHeight: "68vh" }}
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

        {/* proposed DADU */}
        {dadu && (
          <g className="plat-fill" style={{ ["--d" as string]: "1.6s" }}>
            <path d={path(dadu)} fill="#E6C97E" fillOpacity={daduConflict ? 0.55 : 1} stroke="#17241D" strokeWidth={sw * 1.6} strokeDasharray={daduConflict ? `${sw * 3} ${sw * 2}` : undefined} />
            <text x={dadu.reduce((s, q) => s + q.x, 0) / 4} y={dadu.reduce((s, q) => s + q.y, 0) / 4 + fs * 0.35} textAnchor="middle" style={{ fontSize: fs * 0.62, fontWeight: 700 }}>
              {daduLabel}
            </text>
          </g>
        )}

        {/* access path */}
        {access && (
          <g className="plat-fill" style={{ ["--d" as string]: "1.8s" }}>
            <line x1={access.a.x} y1={access.a.y} x2={access.b.x} y2={access.b.y} stroke={access.width < MIN_ACCESS_FT ? "#B9573F" : "#17241D"} strokeWidth={sw * 1.6} strokeDasharray={`${sw * 1.2} ${sw * 3.5}`} strokeLinecap="round" />
            <text x={mid(access.a, access.b).x + fs * 0.6} y={mid(access.a, access.b).y} style={{ fontSize: fs * 0.8, fontWeight: 600 }}>
              {`Access ${access.width.toFixed(1)}'`}
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

        {/* street labels */}
        {streets.slice(0, 3).map((s, i) => {
          const pt = s.paths.flat().reduce((a, q) => (Math.hypot(q.x - cx, q.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? q : a));
          return (
            <text key={i} x={pt.x} y={pt.y + fs * 0.35} textAnchor="middle" style={{ fontSize: fs * 0.8, fontWeight: 600, fill: "#4A5A51" }}>
              {s.name}
            </text>
          );
        })}

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

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-xs" style={{ color: "var(--slate)", borderColor: "var(--hairline)" }}>
        <Key swatch={<i style={{ background: "rgba(30, 110, 80,0.3)", border: "1px dashed #145A40" }} />}>Buildable envelope ({side} ft side, {rear} ft rear)</Key>
        <Key swatch={<i style={{ background: "#E6C97E", border: "1px solid #17241D" }} />}>Proposed DADU</Key>
        <Key swatch={<i style={{ background: "repeating-linear-gradient(45deg,#17241D66 0 1px,transparent 1px 4px)", border: "1px solid #17241D" }} />}>Existing structure</Key>
        <Key swatch={<i style={{ border: "1px dashed #4E9A6B", borderRadius: "50%" }} />}>Tree drip line</Key>
      </figcaption>
      <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>
        Front setback and ECA outlines are not drawn: this data has no geometry for them.
        {daduConflict && " The suggested footprint overlaps the existing house at this depth, so it is shown faded."}
        {access && access.width < MIN_ACCESS_FT && ` Access is under the ${MIN_ACCESS_FT} ft construction heuristic.`}
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
