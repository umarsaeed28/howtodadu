"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import MasterPlan, { type PlanSnapshot } from "@/components/report/MasterPlan";
import { fetchFeasibility, type FeasibilityResult } from "@/lib/feasibility";
import { buildDashboardPropertySlim } from "@/lib/dashboard-normalize";
import { deriveReport, type FeasibilitySummary } from "@/lib/portal/feasibility-summary";
import { startPermitPackage } from "@/app/portal/actions";
import { PERMIT_PACKAGE, usd } from "@/lib/portal/types";
import { ActionButton } from "./ActionForm";

const sf = (n: number | null) => (n == null ? "n/a" : `${Math.round(n).toLocaleString()} sf`);
const ft = (n: number | null) => (n == null ? "n/a" : `${Math.round(n)} ft`);
const VERDICT: Record<string, { bg: string; fg: string }> = {
  Feasible: { bg: "var(--green-tint)", fg: "var(--green)" },
  Conditional: { bg: "var(--amber-tint)", fg: "var(--amber)" },
  "Not feasible": { bg: "var(--red-tint)", fg: "var(--red)" },
};

/**
 * Stage 2, free. The saved summary renders at once; the site plan comes from the engine (the buyer's own lot,
 * through /api/portal/feasibility) so it can be dragged and printed. Ends with the one CTA: start the permit package.
 */
export default function FeasibilityStage({ projectId, address, summary, canStart, paid }: { projectId: string; address: string; summary: FeasibilitySummary; canStart: boolean; paid: boolean }) {
  const [data, setData] = useState<FeasibilityResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const snapshotRef = useRef<(() => PlanSnapshot) | null>(null);

  useEffect(() => {
    let live = true;
    fetchFeasibility(address, "/api/portal/feasibility")
      .then((d) => live && setData(d))
      .catch((e: unknown) => live && setPlanError(e instanceof Error ? e.message : "The site plan could not be drawn."));
    return () => {
      live = false;
    };
  }, [address]);

  const derived = data ? deriveReport(data) : null;

  async function downloadPdf() {
    if (!data || !derived || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { buildReportPdf, reportPdfName } = await import("@/lib/report-pdf/build-report-pdf");
      const pdf = await buildReportPdf({ slim: buildDashboardPropertySlim(data, derived.adu), report: derived.report, plan: snapshotRef.current?.() ?? null });
      pdf.save(reportPdfName(address));
    } finally {
      setPdfBusy(false);
    }
  }

  const v = VERDICT[summary.verdict] ?? VERDICT.Conditional;
  const metrics: [string, string][] = [
    ["Buildable area", sf(summary.buildableAreaSf)],
    ["Max DADU size", sf(summary.maxDaduSf)],
    ["Rear / side setbacks", summary.rearSetbackFt == null ? "n/a" : `${summary.rearSetbackFt} / ${summary.sideSetbackFt ?? 5} ft`],
    ["Height limit", ft(summary.heightFt)],
    ["Parking", summary.parking],
    ["Lot coverage", summary.coveragePct == null ? "n/a" : `${summary.coveragePct}% of ${summary.maxCoveragePct}% allowed`],
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="pa-raised p-5 sm:p-6" aria-labelledby="feas-h">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(40px, 7vw, 56px)" }} aria-label={`DADU score ${summary.score} out of 100`}>
            {summary.score}<span className="ml-1 text-xl font-bold" style={{ color: "var(--slate)" }}>/100</span>
          </p>
          <span className="mb-1 rounded-lg px-2.5 py-1 text-sm font-bold" style={{ background: v.bg, color: v.fg }}>{summary.verdict}</span>
        </div>
        <h2 id="feas-h" className="mt-2 text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}>{summary.headline}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
          {summary.lotSqft ? `${sf(summary.lotSqft)} lot` : ""}{summary.zoning ? ` · zoned ${summary.zoning}` : ""} · Seattle city and county data, read {new Date().getFullYear()}.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map(([k, val]) => (
            <div key={k} className="pa-inset min-w-0 px-3 py-3">
              <dd className="truncate text-base font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{val}</dd>
              <dt className="text-[11px]" style={{ color: "var(--slate)" }}>{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="pa-raised overflow-hidden" aria-label="Site plan">
        {data && derived ? (
          <MasterPlan lot={data.lot} sitePlan={data.sitePlan} feasibility={data.feasibility} report={derived.adu} pin={data.parcel?.pin ?? null} terrain={data.terrain ?? null} snapshotRef={snapshotRef} initialPlan={summary.drawn?.plan ?? null} />
        ) : (
          <div className="flex h-72 items-center justify-center text-sm" style={{ color: "var(--slate)" }}>
            {planError ?? (<span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Drawing the site plan…</span>)}
          </div>
        )}
      </section>

      <section className="pa-raised p-5 sm:p-6" aria-labelledby="econ-h">
        <h3 id="econ-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>Rough cost and rent</h3>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {([
            ["Build cost", summary.costUsd == null ? "n/a" : `$${Math.round(summary.costUsd).toLocaleString()}`, "all in, rough"],
            ["Rent", summary.rentMonthly == null ? "n/a" : `$${summary.rentMonthly.toLocaleString()}/mo`, "typical Seattle DADU"],
            ["Resale value", summary.saleValueUsd == null ? "n/a" : `$${summary.saleValueUsd.toLocaleString()}`, "if sold with the house"],
          ] as const).map(([k, val, note]) => (
            <div key={k} className="pa-inset min-w-0 px-3 py-3">
              <dd className="pa-display truncate text-lg tabular-nums" style={{ color: "var(--ink)" }}>{val}</dd>
              <dt className="text-[11px]" style={{ color: "var(--slate)" }}>{k} · {note}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="pa-btn pa-btn-sm" onClick={downloadPdf} disabled={!data || pdfBusy} aria-busy={pdfBusy}>
            {pdfBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />} PDF summary
          </button>
          <Link href="/portal/reports" className="pa-btn pa-btn-sm no-underline">Your reports</Link>
        </div>
      </section>

      {canStart && !paid && (
        <section className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--ink)", color: "#fff" }} aria-labelledby="cta-h">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,.7)" }}>Next step</p>
          <h3 id="cta-h" className="pa-display mt-1 text-2xl">Start my permit package</h3>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,.8)" }}>
            {usd(PERMIT_PACKAGE.feeCents)} fixed fee · {PERMIT_PACKAGE.timeline}. Design options, permit drawings, submittal and corrections, all managed by Pencil.
          </p>
          <div className="mt-4">
            <ActionButton action={() => startPermitPackage(projectId)} className="pa-btn pa-btn-primary" >
              Start my permit package <ArrowRight size={15} aria-hidden />
            </ActionButton>
          </div>
        </section>
      )}
    </div>
  );
}
