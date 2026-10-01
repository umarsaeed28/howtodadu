"use client";

import { useState } from "react";

type Span = { s0: number; s1: number };

/**
 * Section A-A' through the lot, street to rear: the ground from lidar elevation, the lot lines, the rear setback,
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
  const vb = { x: -4, y: top, w: length + 8, h: bottom - top };
  const fs = Math.max(3.4, vb.w / 40);
  const sw = vb.w / 600;

  const ground = `M${pts.map((p) => `${p.s.toFixed(1)} ${Y(p.z).toFixed(2)}`).join(" L")}`;
  const earth = `${ground} L${length} ${bottom} L0 ${bottom} Z`;
  const pct = (n: number) => `${Math.abs(n).toFixed(n !== 0 && Math.abs(n) < 1 ? 1 : 0)}%`;
  const slopeWord = (p: number) => (p < 5 ? "nearly level" : p < 15 ? "a moderate slope: expect a stepped foundation or some grading" : p < 40 ? "steep: expect retaining walls and engineering" : "at Seattle's 40% steep-slope critical-area threshold");

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Section A–A′</h4>
        <div className="flex items-center gap-1 text-xs" role="group" aria-label="Vertical scale">
          {([false, true] as const).map((v) => (
            <button key={String(v)} type="button" aria-pressed={exaggerate === v} onClick={() => setExaggerate(v)} className={`pa-chip ${exaggerate === v ? "pa-chip-active" : ""}`} style={{ minHeight: 28 }}>
              {v ? "3× vertical" : "True scale"}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="mt-2 w-full" role="img" aria-label={`Section through the lot. The ground ${fall >= 0 ? "falls" : "rises"} ${Math.abs(fall).toFixed(1)} feet from the front lot line to the rear lot line.`} style={{ fontSize: fs, maxHeight: 260 }}>
        <defs>
          <pattern id="ls-earth" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#9C7A52" strokeOpacity="0.35" strokeWidth={sw * 1.2} />
          </pattern>
        </defs>

        {/* rear setback */}
        {rearSetback > 0 && <rect x={pad + lotDepth - rearSetback} y={top} width={rearSetback} height={Y(rear) - top} fill="#B9573F" fillOpacity="0.08" />}

        <path d={earth} fill="url(#ls-earth)" />
        <path d={earth} fill="#E9DFCF" fillOpacity="0.55" />
        <path d={ground} fill="none" stroke="#6E5233" strokeWidth={sw * 2.2} strokeLinejoin="round" />

        {/* existing buildings where the cut crosses them: the house at an assumed 15 ft, others as footprint only */}
        <defs>
          <pattern id="ls-house" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#17241D" strokeOpacity="0.35" strokeWidth={sw * 1.1} />
          </pattern>
        </defs>
        {existing.map((b) =>
          b.top != null ? (
            <g key={b.key} opacity={b.cut ? 1 : 0.7}>
              <rect x={b.s0} y={Y(b.top)} width={b.s1 - b.s0} height={Y(b.base) - Y(b.top)} fill={b.cut ? "url(#ls-house)" : "#fff"} fillOpacity={b.cut ? 1 : 0.5} stroke="#17241D" strokeWidth={sw * 1.4} strokeDasharray={b.cut ? undefined : `${sw * 4} ${sw * 3}`} />
              <text x={(b.s0 + b.s1) / 2} y={(Y(b.top) + Y(b.base)) / 2} dy={fs * 0.3} textAnchor="middle" stroke="#fff" strokeWidth={sw * 3} paintOrder="stroke" style={{ fontSize: fs * 0.66, fontWeight: 800, fill: "#17241D" }}>
                {`House, ${HOUSE_HEIGHT_FT}' assumed${b.cut ? "" : " (beyond)"}`}
              </text>
            </g>
          ) : (
            <g key={b.key}>
              <rect x={b.s0} y={Y(b.base) - 2.2 * ex} width={b.s1 - b.s0} height={2.2 * ex} fill="#17241D" fillOpacity="0.18" stroke="#17241D" strokeWidth={sw} />
              <text x={(b.s0 + b.s1) / 2} y={Y(b.base) - 2.2 * ex - fs * 0.5} textAnchor="middle" style={{ fontSize: fs * 0.62, fill: "#4A5A51" }}>Existing building</text>
            </g>
          )
        )}

        {/* proposed units at their current place and size; units the line does not cross are drawn dashed, beyond the cut */}
        {[...blocks].sort((a, b) => Number(a.cut) - Number(b.cut)).map((b) => (
          <g key={b.kind} opacity={b.cut ? 1 : 0.8}>
            {b.kind === "dadu" && maxHeight && (
              <g>
                <line x1={b.s0 - 2} x2={b.s1 + 2} y1={Y(b.base + maxHeight)} y2={Y(b.base + maxHeight)} stroke="#145A40" strokeWidth={sw * 1.2} strokeDasharray={`${sw * 5} ${sw * 3}`} />
                <text x={b.s1 + 3} y={Y(b.base + maxHeight)} dy={fs * 0.3} style={{ fontSize: fs * 0.62, fontWeight: 700, fill: "#145A40" }}>{`Height limit ${maxHeight}'`}</text>
              </g>
            )}
            <rect x={b.s0} y={Y(b.top)} width={b.s1 - b.s0} height={Y(b.base) - Y(b.top)} fill={b.kind === "dadu" ? "#E6C97E" : "#A9CFC4"} fillOpacity={b.cut ? 1 : 0.55} stroke="#17241D" strokeWidth={sw * 1.4} strokeDasharray={b.cut ? undefined : `${sw * 4} ${sw * 3}`} />
            <text x={(b.s0 + b.s1) / 2} y={(Y(b.top) + Y(b.base)) / 2} dy={fs * 0.3} textAnchor="middle" stroke="#fff" strokeWidth={sw * 3} paintOrder="stroke" style={{ fontSize: fs * 0.66, fontWeight: 800, fill: "#17241D" }}>
              {(b.kind === "dadu" ? `DADU, ${b.stories} ${b.stories === 1 ? "story" : "stories"}` : "AADU, 1 story") + (b.cut ? "" : " (beyond)")}
            </text>
          </g>
        ))}

        {/* lot lines */}
        {[
          [pad, "Front lot line", front],
          [pad + lotDepth, onAlley ? "Rear lot line (alley)" : "Rear lot line", rear],
        ].map(([s, label, z]) => (
          <g key={label as string}>
            <line x1={s as number} x2={s as number} y1={top + fs} y2={bottom} stroke="#17241D" strokeWidth={sw * 1.2} strokeDasharray={`${sw * 4} ${sw * 3}`} />
            <text x={s as number} y={top + fs * 0.7} textAnchor="middle" style={{ fontSize: fs * 0.62, fontWeight: 700, fill: "#17241D" }}>{label as string}</text>
            <text x={(s as number) + 1.2} y={Y(z as number) - fs * 0.45} style={{ fontSize: fs * 0.6, fontWeight: 700, fill: "#6E5233" }}>{`${(z as number).toFixed(1)}'`}</text>
          </g>
        ))}
        <text x={pad / 2} y={bottom - fs * 0.5} textAnchor="middle" style={{ fontSize: fs * 0.6, fill: "#4A5A51" }}>Street</text>
        {onAlley && <text x={pad + lotDepth + pad / 2} y={bottom - fs * 0.5} textAnchor="middle" style={{ fontSize: fs * 0.6, fill: "#7A6748" }}>Alley</text>}
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
      <p className="mt-1 text-[11px]" style={{ color: "var(--slate)" }}>
        Ground from {source || "lidar elevation"}, sampled along A–A′. Contours on the plan are every 2 ft, labelled every 10 ft. Building heights are not in the city data: the house is drawn at an assumed {HOUSE_HEIGHT_FT} ft, other buildings only where they sit, and unit heights are illustrative ({STORY_FT} ft a story) under the code height limit. Solid outlines are cut by A–A′; dashed ones sit beyond it, projected onto the section. Moves with the DADU.
      </p>
    </div>
  );
}
