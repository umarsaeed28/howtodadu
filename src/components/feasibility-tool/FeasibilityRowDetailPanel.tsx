"use client";

import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import {
  buildFeasibilityOverviewGroups,
  listingSearchUrl,
  parcelViewerUrl,
} from "@/lib/feasibility-ui-rows";
import { buildRiskLines, buildWhyBullets } from "@/lib/feasibility-table-model";
import { FavoriteStarButton } from "./FavoriteStarButton";
import { ADUniversePropertyInfo } from "@/components/deal-screening/ADUniversePropertyInfo";
import { daduScoreClass } from "@/lib/metric-health";
import { AnalysisFeedbackBar } from "@/components/analysis-feedback/AnalysisFeedbackBar";

interface FeasibilityRowDetailPanelProps {
  row: FeasibilityTableRow;
}

export function FeasibilityRowDetailPanel({ row }: FeasibilityRowDetailPanelProps) {
  const groups = buildFeasibilityOverviewGroups(row.result, row.report);
  const why = buildWhyBullets(row.report, row.signals);
  const risks = buildRiskLines(row.signals, row.report);
  const pin = row.result.parcel?.pin;
  const parcelUrl = parcelViewerUrl(pin);
  const listUrl = listingSearchUrl(row.address);

  const verdictTone =
    row.verdict === "strong"
      ? "text-emerald-800 bg-emerald-50 ring-emerald-600/15"
      : row.verdict === "medium"
        ? "text-amber-900 bg-amber-50 ring-amber-600/15"
        : "text-zinc-800 bg-zinc-100 ring-zinc-400/20";

  return (
    <div className="border-t border-zinc-200/80 bg-zinc-50/50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Section 1: Verdict */}
        <section aria-labelledby={`verdict-${row.id}`}>
          <h3 id={`verdict-${row.id}`} className="sr-only">
            DADU verdict
          </h3>
          <div className={`inline-flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ring-1 ${verdictTone}`}>
            <span className="text-sm font-semibold">{row.verdictLabel}</span>
            <span className="text-sm text-zinc-700">
              Score{" "}
              <strong className={`font-semibold tabular-nums ${daduScoreClass(row.daduScore)}`}>
                {row.daduScore}
              </strong>{" "}
              / 100
            </span>
            <span className="text-sm text-zinc-600" title="Model-reported confidence">
              Confidence: <strong className="font-medium text-zinc-900">{row.report.confidenceLabel}</strong>
              <span className="tabular-nums"> ({Math.round(row.report.confidence)}%)</span>
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700">{row.summarySentence}</p>
        </section>

        <AnalysisFeedbackBar row={row} />

        {/* ADUniverse-style narrative (matches city Hub feasibility page structure) */}
        <ADUniversePropertyInfo result={row.result} report={row.report} />

        {/* Section 2: Overview tables */}
        <section aria-labelledby={`overview-${row.id}`}>
          <h3 id={`overview-${row.id}`} className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Site facts (tables)
          </h3>
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.id}>
                <p className="mb-2 text-sm font-medium text-zinc-900">{g.title}</p>
                <div className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white">
                  <table className="w-full text-sm">
                    <tbody>
                      {g.rows.map((r) => (
                        <tr
                          key={r.label}
                          className="border-b border-zinc-100 last:border-0 [&>td]:py-2.5 [&>td]:align-top"
                        >
                          <td className="w-[40%] max-w-[200px] pl-3 pr-2 text-zinc-500 sm:w-1/3">{r.label}</td>
                          <td
                            className={
                              r.valueTone === "good"
                                ? "-my-0.5 rounded-md bg-emerald-50/95 px-3 py-1.5 font-semibold text-emerald-950 ring-1 ring-emerald-200/90"
                                : r.valueTone === "caution"
                                  ? "-my-0.5 rounded-md bg-amber-50/95 px-3 py-1.5 font-semibold text-amber-950 ring-1 ring-amber-200/90"
                                  : r.valueTone === "severe"
                                    ? "-my-0.5 rounded-md bg-red-50/95 px-3 py-1.5 font-semibold text-red-950 ring-1 ring-red-200/90"
                                    : r.highlightValue
                                      ? "-my-0.5 rounded-md bg-teal-50/95 px-3 py-1.5 font-semibold text-teal-950 ring-1 ring-teal-200/90"
                                      : "pr-3 font-medium text-zinc-900"
                            }
                          >
                            {r.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Why */}
        <section aria-labelledby={`why-${row.id}`}>
          <h3 id={`why-${row.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Why this score
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            {why.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        {/* Section 4: Risks */}
        <section aria-labelledby={`risks-${row.id}`}>
          <h3 id={`risks-${row.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Risks to verify
          </h3>
          <ul className="space-y-1.5 text-sm text-zinc-700">
            {risks.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-amber-600" aria-hidden>
                  ·
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 5: Actions */}
        <section aria-labelledby={`actions-${row.id}`} className="flex flex-wrap items-center gap-3">
          <h3 id={`actions-${row.id}`} className="sr-only">
            Actions
          </h3>
          <a
            href={listUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center rounded-lg bg-[var(--feasibility-accent,#0d9488)] px-4 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
          >
            View listings
          </a>
          {parcelUrl ? (
            <a
              href={parcelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:border-[var(--feasibility-accent,#0d9488)] hover:text-[var(--feasibility-accent,#0d9488)]"
            >
              Assessor parcel
            </a>
          ) : null}
          <div className="inline-flex items-center gap-1">
            <span className="text-sm text-zinc-600">Favorite</span>
            <FavoriteStarButton address={row.address} />
          </div>
        </section>
      </div>
    </div>
  );
}
