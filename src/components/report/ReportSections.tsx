"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import type { FeasibilityReport } from "../../../packages/schema/src";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { GRADE_STEEP_PCT, GRADE_VERY_STEEP_PCT } from "@/lib/grade";


/* ── Site constraints: a pass / check / fail grid ── */
const CHECK_TONE = {
  pass: { Icon: CheckCircle2, color: "var(--green)", bg: "var(--green-tint)", word: "Passes" },
  warning: { Icon: AlertTriangle, color: "var(--amber)", bg: "var(--amber-tint)", word: "Check" },
  fail: { Icon: XCircle, color: "var(--red)", bg: "var(--red-tint)", word: "Fails" },
} as const;

export function ConstraintsGrid({ row }: { row: FeasibilityTableRow }) {
  // Two checks the rest of the report does not already show: existing ADUs, and how steep the DADU site is.
  const checks = row.report.checks.filter((c) => /adu/i.test(c.label));
  const g = row.result.feasibility?.gradeStats ?? null;
  const gradeStatus: keyof typeof CHECK_TONE = !g ? "warning" : g.slopePct >= GRADE_VERY_STEEP_PCT ? "fail" : g.slopePct >= GRADE_STEEP_PCT ? "warning" : "pass";
  const gt = CHECK_TONE[gradeStatus];
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: gt.bg }}>
          <gt.Icon size={16} aria-hidden style={{ color: gt.color }} />
        </span>
        <span className="min-w-0">
          <span className="sr-only">{gt.word}: </span>
          <span className="block text-xs" style={{ color: "var(--slate)" }}>Steep grade at the DADU site</span>
          <span className="pa-display block text-base tabular-nums" style={{ color: "var(--ink)" }}>{g ? `${g.slopePct}% slope` : "Not measured"}</span>
          <span className="block text-[11px] leading-snug" style={{ color: "var(--slate)" }}>
            {g ? `${g.riseFt} ft of rise across the site. ${g.slopePct >= GRADE_VERY_STEEP_PCT ? "Very steep: retaining walls, a stepped foundation and heavy excavation." : g.slopePct >= GRADE_STEEP_PCT ? "Steep: expect a stepped foundation and retaining walls." : g.slopePct >= 5 ? "A moderate slope: some grading or a stepped foundation." : "Close to flat."}` : "No lidar sample for this site."}
          </span>
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
