"use client";

import { GRADE_STEEP_PCT, GRADE_VERY_STEEP_PCT } from "@/lib/grade";
import { useState } from "react";

type Span = { s0: number; s1: number };

/**
 * Section through the lot, street to rear: the ground from lidar elevation, the lot lines, the rear setback,
 * existing buildings where the cut crosses them, and the proposed units at their current size and place.
 * Distances run along the cut in feet; heights are elevations in feet.
 */
export default function LotSection({
  profile,
  pad,
  lotDepth,
  rearSetback,
  onAlley,
  buildings,
  units,
  maxHeight,
  source,
}: {
  profile: { s: number; z: number | null }[];
  pad: number;
  lotDepth: number;
  rearSetback: number;
  onAlley: boolean;
  /** `cut`: the section line crosses it. Otherwise it is drawn dashed, as seen beyond the cut. */
  buildings: (Span & { main: boolean; key: number; cut: boolean })[];
  units: (Span & { kind: "dadu" | "aadu"; stories: 1 | 2; cut: boolean })[];
  maxHeight: number | null;
  source: string;
}) {
  const [exaggerate, setExaggerate] = useState(false);
  const pts = profile.filter((p): p is { s: number; z: number } => p.z != null);
  if (pts.length < 2) return null;

  const zAt = (s: number) => {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.s - s) < Math.abs(best.s - s)) best = p;
    return best.z;
  };
  const zIn = (a: number, b: number) => pts.filter((p) => p.s >= a && p.s <= b).map((p) => p.z);
  const front = zAt(pad), rear = zAt(pad + lotDepth);
  const fall = front - rear;
  const length = profile[profile.length - 1].s;

  const STORY_FT = 10;
  /** The city data has no building heights; the house is drawn at an assumed 15 ft. */
  const HOUSE_HEIGHT_FT = 15;
  const existing = buildings.map((b) => {
    const under = zIn(b.s0, b.s1);
    const base = under.length ? under.reduce((a, c) => a + c, 0) / under.length : zAt((b.s0 + b.s1) / 2);
    return { ...b, base, top: b.main ? base + HOUSE_HEIGHT_FT : null };
  });
  const blocks = units.map((u) => {
    const under = zIn(u.s0, u.s1);
    const lo = Math.min(...under), hi = Math.max(...under);
    const base = under.reduce((a, b) => a + b, 0) / under.length;
    // An attached ADU is an addition to the house: drawn one story, under the house's assumed height.
    const h = u.kind === "dadu" ? Math.min(maxHeight ?? 99, u.stories * STORY_FT + 4) : Math.min(HOUSE_HEIGHT_FT, STORY_FT + 2);
    return { ...u, base, top: base + h, change: hi - lo, slopePct: ((hi - lo) / Math.max(1, u.s1 - u.s0)) * 100 };
  });
  const dadu = blocks.find((b) => b.kind === "dadu") ?? null;

  const ex = exaggerate ? 3 : 1;
  const zMin = Math.min(...pts.map((p) => p.z));
  const zTop = Math.max(...pts.map((p) => p.z), ...blocks.map((b) => (b.kind === "dadu" && maxHeight ? b.base + maxHeight : b.top)), ...existing.map((b) => b.top ?? b.base));
  const Y = (z: number) => -(z - zMin) * ex;
  const top = Y(zTop) - 13;
  const bottom = Y(zMin) + 7;
  const fs = Math.max(3.4, (length + 8) / 40);
  // A strip under the drawing carries the title and the scale bar, as on a drawing sheet.
  const sheet = bottom + fs * 2;
  const vb = { x: -4, y: top, w: length + 8, h: sheet - top };
  const sw = vb.w / 600;

  const ground = `M${pts.map((p) => `${p.s.toFixed(1)} ${Y(p.z).toFixed(2)}`).join(" L")}`;
  const earth = `${ground} L${length} ${bottom} L0 ${bottom} Z`;
  const pct = (n: number) => `${Math.abs(n).toFixed(n !== 0 && Math.abs(n) < 1 ? 1 : 0)}%`;
  const slopeWord = (p: number) => (p < 5 ? "nearly level" : p < 15 ? "a moderate slope: expect a stepped foundation or some grading" : p < 40 ? "steep: expect retaining walls and engineering" : "at Seattle's 40% steep-slope critical-area threshold");

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Section A–A′ through the lot</h4>
        <div className="flex items-center gap-1 text-xs" role="group" aria-label="Vertical scale">
          {([false, true] as const).map((v) => (
            <button key={String(v)} type="button" aria-pressed={exaggerate === v} onClick={() => setExaggerate(v)} className={`pa-chip ${exaggerate === v ? "pa-chip-active" : ""}`} style={{ minHeight: 28 }}>
              {v ? "3× vertical" : "True scale"}
            </button>
          ))}
        </div>
      </div>
      <svg data-pdf-section viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="mt-2 w-full" role="img" aria-label={`Section A–A′ through the lot. The ground ${fall >= 0 ? "falls" : "rises"} ${Math.abs(fall).toFixed(1)} feet from the front lot line to the rear lot line.`} style={{ fontSize: fs, maxHeight: 280 }}>
        <defs>
          {/* earth: fine diagonal hatch under the cut ground line */}
          <pattern id="ls-earth" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="2.4" stroke="#8C7A62" strokeOpacity="0.35" strokeWidth={sw * 0.6} />
          </pattern>
          {/* concrete: stipple, for foundations */}
          <pattern id="ls-concrete" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
            <circle cx="0.4" cy="0.5" r={sw * 0.9} fill="#17241D" fillOpacity="0.45" />
            <circle cx="1.2" cy="1.2" r={sw * 0.6} fill="#17241D" fillOpacity="0.35" />
          </pattern>
        </defs>

        {/* rear setback, as a faint band */}
        {rearSetback > 0 && <rect x={pad + lotDepth - rearSetback} y={top + fs} width={rearSetback} height={Y(rear) - top - fs} fill="#B9573F" fillOpacity="0.05" />}

        {/* lot lines: fine chain lines with small PL tags (annotation weight) */}
        {[
          [pad, front, "PL front"],
          [pad + lotDepth, rear, onAlley ? "PL rear (alley)" : "PL rear"],
        ].map(([sx, z, label]) => (
          <g key={label as string}>
            <line x1={sx as number} x2={sx as number} y1={top + fs * 1.1} y2={bottom} stroke="#17241D" strokeOpacity="0.45" strokeWidth={sw * 0.5} strokeDasharray={`${sw * 9} ${sw * 2.5} ${sw * 1.5} ${sw * 2.5}`} />
            <text x={sx as number} y={top + fs * 0.75} textAnchor="middle" style={{ fontSize: fs * 0.5, fontWeight: 600, letterSpacing: "0.04em", fill: "#17241D", fillOpacity: 0.6 }}>{label as string}</text>
            <text x={(sx as number) + 1} y={Y(z as number) - fs * 0.35} style={{ fontSize: fs * 0.5, fill: "#6E5233" }}>{`+${(z as number).toFixed(1)}'`}</text>
          </g>
        ))}

        {/* existing buildings: cut ones get poché walls, a slab and a gable roof at the assumed height; others a thin outline */}
        {existing.map((b) => {
          const w = b.s1 - b.s0;
          if (b.top == null)
            return <rect key={b.key} x={b.s0} y={Y(b.base) - 2.2 * ex} width={w} height={2.2 * ex} fill="none" stroke="#17241D" strokeOpacity="0.5" strokeWidth={sw * 0.6} />;
          const eave = b.base + 10;
          const ridge = b.top;
          if (!b.cut)
            return (
              <path key={b.key} d={`M${b.s0} ${Y(b.base)} V${Y(eave)} L${b.s0 + w / 2} ${Y(ridge)} L${b.s1} ${Y(eave)} V${Y(b.base)}`} fill="none" stroke="#17241D" strokeOpacity="0.45" strokeWidth={sw * 0.6} strokeDasharray={`${sw * 4} ${sw * 2.5}`} />
            );
          const wt = Math.min(0.9, w / 12);
          return (
            <g key={b.key}>
              <path d={`M${b.s0} ${Y(b.base)} V${Y(eave)} L${b.s0 + w / 2} ${Y(ridge)} L${b.s1} ${Y(eave)} V${Y(b.base)} Z`} fill="#fff" />
              <rect x={b.s0} y={Y(eave)} width={wt} height={Y(b.base) - Y(eave)} fill="#17241D" />
              <rect x={b.s1 - wt} y={Y(eave)} width={wt} height={Y(b.base) - Y(eave)} fill="#17241D" />
              <rect x={b.s0} y={Y(b.base) - wt * 0.7 * ex} width={w} height={wt * 0.7 * ex} fill="#17241D" />
              <path d={`M${b.s0 - 0.8} ${Y(eave)} L${b.s0 + w / 2} ${Y(ridge)} L${b.s1 + 0.8} ${Y(eave)}`} fill="none" stroke="#17241D" strokeWidth={sw * 2.2} strokeLinejoin="miter" />
              <text x={(b.s0 + b.s1) / 2} y={(Y(eave) + Y(b.base)) / 2} dy={fs * 0.25} textAnchor="middle" style={{ fontSize: fs * 0.55, fill: "#17241D", fillOpacity: 0.75 }}>
                {`House (${HOUSE_HEIGHT_FT}' assumed)`}
              </text>
            </g>
          );
        })}

        {/* proposed units. The DADU floor sits at the high side of its ground, so on a slope the foundation shows as a
            concrete mass under it: the cost of the slope, drawn. */}
        {[...blocks].sort((a, b) => Number(a.cut) - Number(b.cut)).map((b) => {
          const w = b.s1 - b.s0;
          const under = pts.filter((p) => p.s >= b.s0 && p.s <= b.s1);
          const floor = b.kind === "dadu" && under.length ? Math.max(...under.map((p) => p.z)) : b.base;
          const stories = b.kind === "dadu" ? b.stories : 1;
          const eave = floor + stories * STORY_FT;
          const ridge = Math.max(eave + 1, Math.min(b.top + (floor - b.base), b.kind === "dadu" && maxHeight ? (b.base + maxHeight) : Infinity));
          const roof = `M${b.s0 - 0.8} ${Y(eave)} L${b.s0 + w / 2} ${Y(ridge)} L${b.s1 + 0.8} ${Y(eave)}`;
          const footing = under.length ? `M${b.s0} ${Y(floor)} ${under.map((p) => `L${p.s.toFixed(2)} ${Y(p.z).toFixed(2)}`).join(" ")} L${b.s1} ${Y(floor)} Z` : "";
          if (!b.cut)
            return (
              <path key={b.kind} d={`M${b.s0} ${Y(floor)} V${Y(eave)} L${b.s0 + w / 2} ${Y(ridge)} L${b.s1} ${Y(eave)} V${Y(floor)} Z`} fill="none" stroke="#17241D" strokeOpacity="0.5" strokeWidth={sw * 0.7} strokeDasharray={`${sw * 4} ${sw * 2.5}`} />
            );
          const wt = Math.min(0.9, w / 12);
          return (
            <g key={b.kind}>
              {b.kind === "dadu" && maxHeight && (
                <g>
                  <line x1={b.s0 - 3} x2={b.s1 + 3} y1={Y(b.base + maxHeight)} y2={Y(b.base + maxHeight)} stroke="#145A40" strokeOpacity="0.6" strokeWidth={sw * 0.5} strokeDasharray={`${sw * 5} ${sw * 3}`} />
                  <text x={b.s1 + 3.6} y={Y(b.base + maxHeight)} dy={fs * 0.2} style={{ fontSize: fs * 0.5, fill: "#145A40", fillOpacity: 0.85 }}>{`Height limit ${maxHeight}'`}</text>
                </g>
              )}
              <path d={`M${b.s0} ${Y(floor)} V${Y(eave)} L${b.s0 + w / 2} ${Y(ridge)} L${b.s1} ${Y(eave)} V${Y(floor)} Z`} fill={b.kind === "dadu" ? "#F4E7C2" : "#DCEBE6"} />
              {footing && <path d={footing} fill="url(#ls-concrete)" stroke="#17241D" strokeWidth={sw * 1.4} strokeLinejoin="round" />}
              <rect x={b.s0} y={Y(eave)} width={wt} height={Y(floor) - Y(eave)} fill="#17241D" />
              <rect x={b.s1 - wt} y={Y(eave)} width={wt} height={Y(floor) - Y(eave)} fill="#17241D" />
              {Array.from({ length: stories }, (_, k) => (
                <rect key={k} x={b.s0} y={Y(floor + k * STORY_FT) - wt * 0.7 * ex} width={w} height={wt * 0.7 * ex} fill="#17241D" />
              ))}
              <path d={roof} fill="none" stroke="#17241D" strokeWidth={sw * 2.2} strokeLinejoin="miter" />
              <text x={(b.s0 + b.s1) / 2} y={Y(floor + STORY_FT / 2)} dy={fs * 0.25} textAnchor="middle" style={{ fontSize: fs * 0.55, fontWeight: 600, fill: "#17241D" }}>
                {b.kind === "dadu" ? `DADU, ${b.stories} ${b.stories === 1 ? "story" : "stories"}` : "AADU"}
              </text>
            </g>
          );
        })}

        {/* ground: earth hatch, then the cut ground line, the heaviest line in the drawing */}
        <path d={earth} fill="#F3EEE6" />
        <path d={earth} fill="url(#ls-earth)" />
        <path d={ground} fill="none" stroke="#1E1A14" strokeWidth={sw * 2.6} strokeLinejoin="round" strokeLinecap="round" />

        <text x={pad / 2} y={bottom - fs * 0.45} textAnchor="middle" style={{ fontSize: fs * 0.5, fill: "#4A5A51" }}>Street</text>
        {onAlley && <text x={pad + lotDepth + pad / 2} y={bottom - fs * 0.45} textAnchor="middle" style={{ fontSize: fs * 0.5, fill: "#7A6748" }}>Alley</text>}

        {/* title tag and, at true scale, a scale bar */}
        <g transform={`translate(${vb.x + 2} ${bottom + fs * 1.05})`}>
          <circle r={fs * 0.55} cx={fs * 0.55} cy={0} fill="none" stroke="#17241D" strokeOpacity="0.6" strokeWidth={sw * 0.5} />
          <text x={fs * 0.55} y={0} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fs * 0.5, fontWeight: 600, fill: "#17241D" }}>A</text>
          <text x={fs * 1.45} y={0} dominantBaseline="central" style={{ fontSize: fs * 0.55, fontWeight: 600, letterSpacing: "0.03em", fill: "#17241D" }}>Section A–A′</text>
        </g>
        {!exaggerate && (
          <g transform={`translate(${vb.x + vb.w - 26} ${bottom + fs * 1.1})`}>
            {[0, 1].map((k) => <rect key={k} x={k * 10} y={0} width={10} height={sw * 3} fill={k ? "#fff" : "#17241D"} stroke="#17241D" strokeWidth={sw * 0.5} />)}
            {[0, 10, 20].map((v) => <text key={v} x={v} y={-sw * 3} textAnchor="middle" style={{ fontSize: fs * 0.45, fill: "#17241D" }}>{v === 20 ? "20 ft" : v}</text>)}
          </g>
        )}
      </svg>

      <ul className="mt-2 flex flex-col gap-1 text-sm" style={{ color: "var(--ink)" }}>
        <li>
          The ground {Math.abs(fall) < 0.5 ? "is about level" : fall > 0 ? "falls" : "rises"}
          {Math.abs(fall) >= 0.5 && <strong className="tabular-nums"> {Math.abs(fall).toFixed(1)} ft</strong>} from the front lot line to the rear
          {Math.abs(fall) >= 0.5 && <span className="tabular-nums" style={{ color: "var(--slate)" }}> ({pct((fall / lotDepth) * 100)} average)</span>}.
        </li>
        {dadu && (
          <li>
            Under the DADU the grade changes <strong className="tabular-nums">{dadu.change.toFixed(1)} ft</strong>
            <span className="tabular-nums" style={{ color: "var(--slate)" }}> ({pct(dadu.slopePct)} across its depth)</span>: {slopeWord(dadu.slopePct)}.
          </li>
        )}
      </ul>
      {dadu && Math.abs(dadu.slopePct) >= GRADE_STEEP_PCT && (
        <p role="note" className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: Math.abs(dadu.slopePct) >= GRADE_VERY_STEEP_PCT ? "var(--red-tint)" : "var(--amber-tint)", color: "var(--ink)" }}>
          <strong>{Math.abs(dadu.slopePct) >= GRADE_VERY_STEEP_PCT ? "Very steep site." : "Steep site."}</strong>{" "}
          {Math.abs(dadu.slopePct) >= GRADE_VERY_STEEP_PCT
            ? "Building here means retaining walls, a stepped foundation and heavy excavation. Costs rise sharply and a geotechnical report is likely. The score treats this lot as Marginal."
            : "Expect a stepped foundation and retaining walls, which add real cost. The score holds this lot to Fair at best."}
        </p>
      )}
      <p className="mt-1 text-[11px]" style={{ color: "var(--slate)" }}>
        Ground from {source || "lidar elevation"}, sampled along the section. Contours on the plan are every 2 ft, labelled every 10 ft. Building heights are not in the city data: the house is drawn at an assumed {HOUSE_HEIGHT_FT} ft, other buildings only where they sit, and unit heights are illustrative ({STORY_FT} ft a story) under the code height limit. Heavy lines and solid walls are cut by section line A–A′ on the plan; thin dashed outlines sit beyond it. The DADU floor is set at the high side of its ground, so on a slope the stippled foundation shows what the slope adds. Moves with the DADU.
      </p>
    </div>
  );
}
