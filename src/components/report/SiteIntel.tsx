import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { toPercent } from "@/lib/report/to-report";

const fmt = (n: number) => Math.round(n).toLocaleString();
const usd = (n: number) => `$${fmt(n)}`;

function Card({ title, source, children, className = "" }: { title: string; source: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`pa-inset flex flex-col gap-3 p-4 ${className}`}>
      <div>
        <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</h4>
        <p className="text-[11px]" style={{ color: "var(--slate)" }}>{source}</p>
      </div>
      {children}
    </div>
  );
}

function Bar({ value, max = 100, color = "var(--flag)", marker }: { value: number; max?: number; color?: string; marker?: number }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative h-2.5 w-full rounded-full" style={{ background: "rgba(23, 36, 29,0.1)" }}>
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
      {marker != null && (
        <span aria-hidden className="absolute top-[-3px] h-[16px] w-[2px]" style={{ left: `${(marker / max) * 100}%`, background: "var(--ink)" }} />
      )}
    </div>
  );
}

/* ── Score ring + weighted factors ── */
export function ScoreFactors({ row }: { row: FeasibilityTableRow }) {
  const ss = row.siteScore;
  const score = ss.score;
  const r = 44;
  const c = 2 * Math.PI * r;
  const tone = score >= 70 ? "var(--green)" : score >= 55 ? "var(--amber)" : "var(--red)";
  const failed = ss.gates.filter((g) => g.status === "fail");
  const unknown = ss.gates.filter((g) => g.status === "unknown");
  return (
    <Card title="What drives the score" source="Rules baseline from the Seattle DADU guide: access, layout, size, site, trees" className="sm:col-span-2">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center">
          <svg viewBox="0 0 110 110" className="h-32 w-32" role="img" aria-label={ss.eligible ? `Score ${score} out of 100, ${ss.grade}` : "Not eligible for a DADU"}>
            <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(23, 36, 29,0.1)" strokeWidth="9" />
            <circle cx="55" cy="55" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 55 55)" />
            <text x="55" y="58" textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: "var(--ink)", fontFamily: "var(--font-display)" }}>{ss.eligible ? score : "—"}</text>
            <text x="55" y="74" textAnchor="middle" style={{ fontSize: 9, fill: "var(--slate)" }}>out of 100</text>
          </svg>
          <p className="text-sm font-semibold" style={{ color: tone }}>{ss.grade}</p>
        </div>
        <div className="w-full">
          {failed.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--red)" }}>
              {failed.map((g) => <li key={g.key}><strong>{g.label}:</strong> {g.note}</li>)}
            </ul>
          ) : (
            <ul className="grid w-full gap-3">
              {ss.factors.map((f) => (
                <li key={f.key}>
                  <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--ink)" }}>
                    <span>{f.name} <span style={{ color: "var(--slate)" }}>({f.weight}%)</span></span>
                    <span className="tabular-nums">{Math.round(f.score)}</span>
                  </div>
                  <Bar value={f.score} color={f.score >= 70 ? "var(--green)" : f.score >= 40 ? "var(--amber)" : "var(--red)"} />
                  <p className="mt-1 text-[11px]" style={{ color: "var(--slate)" }}>{f.note}</p>
                </li>
              ))}
            </ul>
          )}
          {unknown.length > 0 && (
            <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>To confirm: {unknown.map((g) => g.note).join(" ")}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Lot character glyph + facts ── */
export function LotCharacter({ row }: { row: FeasibilityTableRow }) {
  const f = row.result.feasibility;
  const type = (f?.lotType ?? "").toLowerCase();
  const corner = type.includes("corner");
  const landlocked = type.includes("land");
  const alley = !!f?.hasAlley;
  const ratio = f?.boundRatio;
  return (
    <Card title="Lot character" source="Parcel geometry and street network">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 90 80" className="h-20 w-24 shrink-0" aria-hidden>
          <rect x="22" y="12" width="46" height="52" fill="rgba(30, 110, 80,0.14)" stroke="var(--ink)" strokeWidth="2" />
          <line x1="14" y1="70" x2="76" y2="70" stroke="#92B8A2" strokeWidth="6" strokeLinecap="round" />
          {corner && <line x1="76" y1="6" x2="76" y2="70" stroke="#92B8A2" strokeWidth="6" strokeLinecap="round" />}
          {alley && <line x1="14" y1="6" x2="76" y2="6" stroke="#C3D6CB" strokeWidth="4" strokeDasharray="4 3" />}
        </svg>
        <div className="text-sm" style={{ color: "var(--ink)" }}>
          <p className="font-semibold">{landlocked ? "Landlocked" : corner ? "Corner lot" : f?.lotType ? "Interior lot" : "Lot type unknown"}</p>
          <p style={{ color: "var(--slate)" }}>{alley ? "Alley access at the rear" : "No alley"}</p>
          {f?.lotWidth && f?.lotDepth && <p className="tabular-nums">{Math.round(f.lotWidth)} × {Math.round(f.lotDepth)} ft</p>}
        </div>
      </div>
      {ratio != null && <p className="text-xs" style={{ color: "var(--slate)" }}>{ratio >= 0.9 ? "Regular" : "Irregular"} shape · fills {Math.round(ratio * 100)}% of its box</p>}
    </Card>
  );
}

/* ── Lot coverage ── */
export function Coverage({ row }: { row: FeasibilityTableRow }) {
  const c = row.report.coverage;
  if (!c) return null;
  return (
    <Card title="Lot coverage" source="Building outlines against Seattle coverage limit">
      <Bar value={c.currentPercent} max={Math.max(c.maxPercent * 1.4, 1)} marker={c.maxPercent} />
      <div className="flex justify-between text-xs tabular-nums" style={{ color: "var(--slate)" }}>
        <span>Used {fmt(c.usedSqft)} sf ({Math.round(c.currentPercent)}%)</span>
        <span>Limit {fmt(c.maxSqft)} sf</span>
      </div>
      <p className="text-sm" style={{ color: "var(--ink)" }}>
        <span className="pa-display text-xl tabular-nums">{fmt(c.availableSqft)} sf</span> <span style={{ color: "var(--slate)" }}>left to build on</span>
      </p>
    </Card>
  );
}

/* ── Height profile ── */
export function HeightProfile({ row }: { row: FeasibilityTableRow }) {
  const h = row.report.height;
  if (!h) return null;
  const k = 4;
  const gy = 104;
  const wall = gy - h.base * k;
  const ridge = gy - h.total * k;
  return (
    <Card title="Height limit" source={`Set by lot width (${Math.round(h.lotWidth)} ft)`}>
      <svg viewBox="0 0 220 116" className="w-full" role="img" aria-label={`Wall height ${h.base} feet, ridge ${h.total} feet`}>
        <line x1="6" y1={gy} x2="214" y2={gy} stroke="var(--ink)" strokeWidth="1.5" />
        <rect x="70" y={wall} width="80" height={h.base * k} fill="#E6C97E" stroke="var(--ink)" strokeWidth="1.5" />
        <path d={`M66 ${wall} L110 ${ridge} L154 ${wall} Z`} fill="rgba(30, 110, 80,0.25)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="166" y1={wall} x2="212" y2={wall} stroke="#145A40" strokeDasharray="3 3" />
        <line x1="166" y1={ridge} x2="212" y2={ridge} stroke="#145A40" strokeDasharray="3 3" />
        <text x="168" y={wall - 3} style={{ fontSize: 9, fontWeight: 600, fill: "#3D5A6C" }}>Wall {h.base}&apos;</text>
        <text x="168" y={ridge - 3} style={{ fontSize: 9, fontWeight: 600, fill: "#3D5A6C" }}>Ridge {h.total}&apos;</text>
      </svg>
    </Card>
  );
}

/* ── ECA ── */
export function EcaPanel({ row }: { row: FeasibilityTableRow }) {
  const f = row.result.feasibility;
  if (!f) return null;
  const pcts = [
    ["Steep slope", toPercent(f.steepSlopePercent)],
    ["Wetland", toPercent(f.wetlandPercent)],
    ["Wildlife habitat", toPercent(f.wildlifePercent)],
    ["Riparian corridor", toPercent(f.riparianPercent)],
  ] as const;
  const flags = [
    ["Flood prone", f.floodProne],
    ["Liquefaction", f.liquefaction],
    ["Known slide", f.knownSlide],
    ["Potential slide", f.potentialSlide],
    ["Peat settlement", f.peat],
    ["Landfill", f.landfill],
  ] as const;
  const hits = flags.filter(([, v]) => v);
  const withPct = pcts.filter(([, v]) => v != null && v > 0);
  const clear = hits.length === 0 && withPct.length === 0 && !f.shoreline;
  return (
    <Card title="Environmentally critical areas" source="Seattle ECA layers, percent of lot affected">
      {clear ? (
        <p className="text-sm" style={{ color: "var(--green)" }}>No critical areas found on this lot.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {withPct.map(([label, v]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--ink)" }}>
                <span>{label}</span><span className="tabular-nums">{Math.round(v!)}% of lot</span>
              </div>
              <Bar value={v!} color="var(--red)" />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {hits.map(([label]) => (
              <span key={label} className="pa-verdict px-2.5 py-1 text-xs" style={{ background: "var(--red-tint)", color: "var(--red)" }}>{label}</span>
            ))}
            {f.shoreline && <span className="pa-verdict px-2.5 py-1 text-xs" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>Shoreline: {f.shoreline}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Tree canopy ── */
export function Canopy({ row }: { row: FeasibilityTableRow }) {
  const ts = row.result.feasibility?.treeStats;
  if (ts) {
    const tight = ts.clearSqft < 300;
    return (
      <Card title="Trees" source="2021 LiDAR tree crowns, one by one">
        <Bar value={ts.canopyPct} max={60} color={ts.canopyPct > 25 || tight ? "var(--amber)" : "var(--green)"} marker={25} />
        <div className="grid grid-cols-4 gap-2 text-center">
          {([[ts.large, "large", "#2F6B49"], [ts.medium, "medium", "#4F9068"], [ts.small, "small", "#9CC2A8"], [ts.canopyPct, "% canopy", "var(--ink)"]] as [number, string, string][]).map(([n, label, color]) => (
            <div key={label} className="rounded-lg py-2" style={{ background: "rgba(23,36,29,.04)" }}>
              <p className="pa-display text-xl tabular-nums" style={{ color }}>{n}</p>
              <p className="text-[11px]" style={{ color: "var(--slate)" }}>{label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm" style={{ color: tight ? "var(--amber)" : "var(--ink)" }}>
          {tight ? "No 15 × 20 ft spot clears the medium and large trees" : <><span className="font-semibold tabular-nums">{ts.clearSqft.toLocaleString("en-US")} sf</span> open behind the house, clear of medium and large trees</>}
          {tight && ts.clearSqftIfMediumRemoved >= 300 ? `; removing medium trees opens ~${ts.clearSqftIfMediumRemoved.toLocaleString("en-US")} sf` : ""}.
        </p>
        <p className="text-[11px]" style={{ color: "var(--slate)" }}>Large ≈ protected (24 in trunk+). Sizes from crown and height; an arborist confirms.</p>
      </Card>
    );
  }
  const v = toPercent(row.result.feasibility?.treeCanopyPercent);
  if (v == null) return null;
  const trees = row.result.sitePlan?.trees ?? [];
  const flagged = trees.filter((t) => t.inDADUZone).length;
  return (
    <Card title="Tree canopy" source="Seattle canopy data and LiDAR tree crowns">
      <Bar value={v} max={60} color={v > 25 ? "var(--amber)" : "var(--green)"} marker={25} />
      <p className="text-sm" style={{ color: "var(--ink)" }}>
        <span className="font-semibold tabular-nums">{Math.round(v)}%</span> canopy
        <span style={{ color: "var(--slate)" }}> (marker at 25%, where tree review gets heavier)</span>
      </p>
      {trees.length > 0 && (
        <p className="text-xs" style={{ color: "var(--slate)" }}>
          {trees.length} mapped {trees.length === 1 ? "tree" : "trees"}{flagged > 0 ? `, ${flagged} in the building zone` : ""}. Species and trunk size need a survey.
        </p>
      )}
    </Card>
  );
}

/* ── Nearby ADUs: market signal ── */
export function NearbyAdus({ row }: { row: FeasibilityTableRow }) {
  const f = row.result.feasibility;
  if (!f || (f.nearbyDADU == null && f.nearbyAADU == null)) return null;
  const max = 1320;
  const marks = [
    { label: "Nearest attached ADU", d: f.nearestAADUDist, color: "var(--flag)" },
    { label: "Nearest backyard cottage", d: f.nearestDADUDist, color: "#B9573F" },
  ].filter((m) => m.d != null);
  return (
    <Card title="Nearby ADUs" source="Permitted ADUs within 1,320 ft (quarter mile)">
      <div className="flex gap-6 text-sm" style={{ color: "var(--ink)" }}>
        <p><span className="pa-display text-2xl tabular-nums">{f.nearbyDADU ?? 0}</span> backyard cottages</p>
        <p><span className="pa-display text-2xl tabular-nums">{f.nearbyAADU ?? 0}</span> attached units</p>
      </div>
      <div className="relative mt-1 h-10">
        <div className="absolute left-0 right-0 top-4 h-[2px]" style={{ background: "rgba(23, 36, 29,0.25)" }} />
        {marks.map((m) => (
          <span key={m.label} className="absolute top-2.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${Math.min(100, (m.d! / max) * 100)}%` }} title={`${m.label}: ${fmt(m.d!)} ft`}>
            <span className="h-3 w-3 rounded-full" style={{ background: m.color, boxShadow: "0 0 0 2px var(--bg)" }} />
          </span>
        ))}
        <span className="absolute left-0 top-7 text-[10px]" style={{ color: "var(--slate)" }}>This lot</span>
        <span className="absolute right-0 top-7 text-[10px]" style={{ color: "var(--slate)" }}>1,320 ft</span>
      </div>
      <ul className="text-xs" style={{ color: "var(--slate)" }}>
        {marks.map((m) => (
          <li key={m.label} className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: m.color }} />
            {m.label}: {fmt(m.d!)} ft
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── Existing home and value ── */
export function HomeAndValue({ row }: { row: FeasibilityTableRow }) {
  const p = row.result.parcel;
  const f = row.result.feasibility;
  if (!p) return null;
  const land = p.landValue ?? 0;
  const imp = p.improvementValue ?? 0;
  const total = land + imp;
  const ratio = land > 0 ? imp / land : null;
  const rows: [string, string][] = [];
  if (p.yearBuilt) rows.push(["Year built", p.yearBuilt]);
  if (f?.totalBuildingSqft) rows.push(["Building area", `${fmt(f.totalBuildingSqft)} sf`]);
  if (f?.basementSqft) rows.push(["Basement", `${fmt(f.basementSqft)} sf${f.daylightBasement ? `, ${f.daylightBasement}` : ""}`]);
  if (f?.detachedGarageCount) rows.push(["Detached garage", `${f.detachedGarageCount} (${fmt(f.detachedGarageSqft ?? 0)} sf)`]);
  if (p.existingUse) rows.push(["Current use", p.existingUse]);
  if (p.platName) rows.push(["Plat", p.platName]);
  return (
    <Card title="Existing home and value" source="King County assessor via Seattle parcel data">
      {total > 0 && (
        <div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full" role="img" aria-label={`Land ${usd(land)}, improvements ${usd(imp)}`}>
            <span style={{ width: `${(land / total) * 100}%`, background: "var(--flag)" }} />
            <span style={{ width: `${(imp / total) * 100}%`, background: "#E6C97E" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs tabular-nums" style={{ color: "var(--slate)" }}>
            <span>Land {usd(land)}</span><span>Home {usd(imp)}</span>
          </div>
          {ratio != null && (
            <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
              {ratio < 0.6 ? "Low home value against land: a teardown or add-on candidate." : "The home carries most of the value, so plan around keeping it."}
            </p>
          )}
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt style={{ color: "var(--slate)" }}>{k}</dt>
            <dd className="text-right tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function SiteIntel({ row }: { row: FeasibilityTableRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ScoreFactors row={row} />
      <LotCharacter row={row} />
      <Coverage row={row} />
      <Canopy row={row} />
      <EcaPanel row={row} />
      <NearbyAdus row={row} />
      <HomeAndValue row={row} />
    </div>
  );
}
