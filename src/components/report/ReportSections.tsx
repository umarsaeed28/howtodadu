"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, Home, MoveHorizontal, MoveVertical, Percent, Ruler, Trees, XCircle } from "lucide-react";
import type { FeasibilityReport } from "../../../packages/schema/src";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";

const fmt = (n: number) => Math.round(n).toLocaleString();
const usd = (n: number) => `$${fmt(n)}`;
const sf = (n: number) => `${fmt(n)} sf`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ── Property facts: six glyph tiles in one row ── */
const FACT_ICONS: [RegExp, React.ComponentType<{ size?: number; "aria-hidden"?: boolean; style?: React.CSSProperties }>][] = [
  [/lot area/i, Ruler],
  [/width/i, MoveHorizontal],
  [/depth/i, MoveVertical],
  [/building/i, Home],
  [/coverage/i, Percent],
  [/canopy|tree/i, Trees],
];

export function FactsStrip({ report }: { report: FeasibilityReport }) {
  return (
    <dl className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {report.property_facts.map((f) => {
        const Icon = FACT_ICONS.find(([re]) => re.test(f.label))?.[1] ?? Ruler;
        const value = f.unit === "%" ? `${Math.round(f.value)}%` : f.unit === "sf" ? sf(f.value) : `${Math.round(f.value)} ${f.unit}`;
        return (
          <div key={f.label} className="pa-inset flex min-w-0 flex-col gap-1 px-3 py-3">
            <Icon size={18} aria-hidden style={{ color: "var(--green)" }} />
            <dd className="pa-display truncate text-lg leading-tight tabular-nums" style={{ color: "var(--ink)" }}>{value}</dd>
            <dt className="truncate text-[11px]" style={{ color: "var(--slate)" }}>{f.label}</dt>
          </div>
        );
      })}
    </dl>
  );
}

/* ── Scenarios: what the lot can hold, each with a glyph ── */
const SCENARIO_NAMES: Record<string, string> = {
  single_dadu: "One backyard cottage",
  two_dadus: "Two backyard cottages",
  aadu_plus_dadu: "Attached unit plus cottage",
  nr_middle_housing: "Middle housing (4 to 6 homes)",
  unit_lot_subdivision: "Unit lot subdivision",
};

/** A tiny plan glyph for each scenario: the main house in grey, the new units in DADU yellow. */
function ScenarioGlyph({ id }: { id: string }) {
  const house = (x: number, y: number, w: number, h: number, fill: string) => <rect x={x} y={y} width={w} height={h} rx={1.5} fill={fill} stroke="#17241D" strokeWidth={1.3} />;
  const main = "#D7DDD9", unit = "#E6C97E";
  return (
    <svg viewBox="0 0 64 44" className="h-11 w-16 shrink-0" aria-hidden>
      <rect x={2} y={2} width={60} height={40} rx={2} fill="rgba(30,110,80,0.08)" stroke="#145A40" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 2" />
      {id === "single_dadu" && (<>{house(8, 16, 24, 20, main)}{house(40, 6, 16, 14, unit)}</>)}
      {id === "two_dadus" && (<>{house(8, 16, 22, 20, main)}{house(38, 4, 18, 12, unit)}{house(38, 24, 18, 12, unit)}</>)}
      {id === "aadu_plus_dadu" && (<>{house(8, 16, 22, 20, main)}{house(30, 20, 10, 16, unit)}{house(46, 6, 12, 12, unit)}</>)}
      {id === "nr_middle_housing" && (<>{house(6, 6, 12, 14, unit)}{house(22, 6, 12, 14, unit)}{house(38, 6, 12, 14, unit)}{house(6, 24, 12, 14, unit)}{house(22, 24, 12, 14, unit)}{house(38, 24, 12, 14, main)}</>)}
      {id === "unit_lot_subdivision" && (<><line x1={32} y1={2} x2={32} y2={42} stroke="#145A40" strokeWidth={1.3} />{house(8, 12, 18, 20, main)}{house(38, 12, 18, 20, unit)}</>)}
    </svg>
  );
}

export function ScenariosGrid({ report }: { report: FeasibilityReport }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {report.scenarios.map((sc) => {
        const scored = !!sc.verdict;
        const tone = sc.verdict === "Feasible" ? { bg: "var(--green-tint)", fg: "var(--green-bright)" } : sc.verdict === "Conditional" ? { bg: "var(--amber-tint)", fg: "var(--amber)" } : sc.verdict ? { bg: "var(--red-tint)", fg: "var(--red)" } : { bg: "rgba(23,36,29,.06)", fg: "var(--slate)" };
        return (
          <li key={sc.id} className="pa-inset flex flex-col gap-2 p-3" style={{ opacity: scored ? 1 : 0.75 }}>
            <ScenarioGlyph id={sc.id} />
            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>{SCENARIO_NAMES[sc.id] ?? sc.id}</p>
            <span className="self-start rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: tone.bg, color: tone.fg }}>{sc.verdict ?? "Not scored yet"}</span>
            {(sc.max_buildable_sf || sc.units != null) && (
              <p className="pa-display text-lg tabular-nums" style={{ color: "var(--ink)" }}>
                {sc.max_buildable_sf ? sf(sc.max_buildable_sf.value) : `${sc.units} ${sc.units === 1 ? "home" : "homes"}`}
                {sc.construction_cost_usd && <span className="ml-1 text-xs font-normal" style={{ color: "var(--slate)" }}>· {usd(sc.construction_cost_usd.value)}</span>}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Site constraints: a pass / check / fail grid ── */
const CHECK_TONE = {
  pass: { Icon: CheckCircle2, color: "var(--green)", bg: "var(--green-tint)", word: "Passes" },
  warning: { Icon: AlertTriangle, color: "var(--amber)", bg: "var(--amber-tint)", word: "Check" },
  fail: { Icon: XCircle, color: "var(--red)", bg: "var(--red-tint)", word: "Fails" },
} as const;

export function ConstraintsGrid({ row }: { row: FeasibilityTableRow }) {
  // Only the two checks the rest of the report does not already show: existing ADUs and critical areas.
  const checks = row.report.checks.filter((c) => /adu/i.test(c.label));
  const eca = row.report.eca;
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {checks.map((c) => {
        const t = CHECK_TONE[c.status as keyof typeof CHECK_TONE] ?? CHECK_TONE.warning;
        return (
          <li key={c.label} className="pa-inset flex items-start gap-3 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: t.bg }}>
              <t.Icon size={16} aria-hidden style={{ color: t.color }} />
            </span>
            <span className="min-w-0">
              <span className="sr-only">{t.word}: </span>
              <span className="block text-xs" style={{ color: "var(--slate)" }}>{c.label}</span>
              <span className="pa-display block truncate text-base tabular-nums" style={{ color: "var(--ink)" }}>{c.value}</span>
              <span className="block text-[11px] leading-snug" style={{ color: "var(--slate)" }}>{c.shortNote}</span>
            </span>
          </li>
        );
      })}
      <li className="pa-inset flex items-start gap-3 p-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: eca.hasIssues ? "var(--amber-tint)" : "var(--green-tint)" }}>
          {eca.hasIssues ? <AlertTriangle size={16} aria-hidden style={{ color: "var(--amber)" }} /> : <CheckCircle2 size={16} aria-hidden style={{ color: "var(--green)" }} />}
        </span>
        <span className="min-w-0">
          <span className="block text-xs" style={{ color: "var(--slate)" }}>Critical areas</span>
          <span className="pa-display block text-base" style={{ color: "var(--ink)" }}>{eca.hasIssues ? `${eca.labels.length} flag${eca.labels.length === 1 ? "" : "s"}` : "None"}</span>
          <span className="block text-[11px] leading-snug" style={{ color: "var(--slate)" }}>{eca.hasIssues ? eca.labels.join(", ") : "No steep slope, wetland, slide or flood layers"}</span>
        </span>
      </li>
    </ul>
  );
}

/* ── Risks: severity first ── */
export function RisksList({ report }: { report: FeasibilityReport }) {
  if (report.risks.length === 0)
    return (
      <p className="pa-inset flex items-center gap-2 p-3 text-sm" style={{ color: "var(--green-bright)" }}>
        <CheckCircle2 size={16} aria-hidden /> No risks flagged by the city data.
      </p>
    );
  return (
    <ol className="flex flex-col gap-2">
      {report.risks.map((r) => (
        <li key={r.rank} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: r.hard_prohibition ? "var(--red-tint)" : "var(--amber-tint)" }}>
          <span className="pa-display w-5 shrink-0 text-center text-sm tabular-nums" style={{ color: r.hard_prohibition ? "var(--red)" : "var(--amber)" }}>{r.rank}</span>
          <span className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink)" }}>{r.title}</span>
          <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "rgba(255,255,255,.7)", color: r.hard_prohibition ? "var(--red)" : "var(--amber)" }}>{r.hard_prohibition ? "Blocks the project" : "Watch"}</span>
          {r.citations.length === 0 && <CircleHelp size={14} aria-label="Unverified against the code text" style={{ color: "var(--slate)" }} />}
        </li>
      ))}
    </ol>
  );
}

/* ── Before you buy: code, survey items and sources as chips ── */
export function VerifyStrip({ report }: { report: FeasibilityReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Code</p>
      <ul className="flex flex-wrap gap-2">
        {report.citations.map((c) => (
          <li key={c.section} className="pa-verdict inline-flex items-center gap-1.5 px-2.5 py-1 text-xs" style={{ background: c.status === "verified" ? "var(--green-tint)" : "var(--amber-tint)", color: c.status === "verified" ? "var(--green)" : "var(--amber)" }}>
            {c.section} · {c.status === "verified" ? `verified ${c.effective_from ?? ""}` : "unverified"}
          </li>
        ))}
      </ul>
      <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Needs a survey</p>
      <ul className="flex flex-wrap gap-2">
        {report.survey_required.map((g) => (
          <li key={g} className="pa-verdict px-2.5 py-1 text-xs" style={{ background: "rgba(23,36,29,.06)", color: "var(--ink)" }}>{g}</li>
        ))}
      </ul>
      <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Sources</p>
      <p className="text-xs" style={{ color: "var(--slate)" }}>
        {report.data_pulled.map((d) => `${d.layer} (${day(d.provenance.pulled_at)})`).join(" · ")}. Preliminary estimate, not a permit or legal opinion.
      </p>
    </div>
  );
}
