"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { ArrowLeft, Download, Heart, Loader2, ExternalLink, ShieldAlert, ShieldCheck, CircleHelp } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import type { FeasibilityReport } from "../../../packages/schema/src";
import { toReport } from "@/lib/report/to-report";
import { zillowUrl } from "@/lib/feasibility-verdict";
import FeasPropertyDetails from "@/components/feasibility-pencil/FeasPropertyDetails";
import MasterPlan, { type PlanSnapshot } from "./MasterPlan";
import SiteIntel from "./SiteIntel";
import { COST_PER_SF, COST_LABEL } from "@/lib/config/costs";
import { calculatorHref } from "@/lib/calculator/inputs";
import Link from "next/link";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const sf = (n: number) => `${Math.round(n).toLocaleString()} sf`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const SCENARIO_NAMES: Record<string, string> = {
  single_dadu: "One backyard cottage",
  two_dadus: "Two backyard cottages",
  aadu_plus_dadu: "Attached unit plus cottage",
  nr_middle_housing: "Middle housing (4 to 6 homes)",
  unit_lot_subdivision: "Unit lot subdivision",
};

const VERDICT_STYLE: Record<string, { bg: string; fg: string }> = {
  Feasible: { bg: "var(--green-tint)", fg: "var(--green)" },
  Conditional: { bg: "var(--amber-tint)", fg: "var(--amber)" },
  "Not feasible": { bg: "var(--red-tint)", fg: "var(--red)" },
};

function VerdictChip({ verdict }: { verdict: string | null }) {
  if (!verdict) {
    return (
      <span className="pa-verdict px-2.5 py-1 text-xs" style={{ background: "transparent", color: "var(--slate)", boxShadow: "inset 2px 2px 5px rgba(150, 168, 158,.5), inset -2px -2px 5px rgba(255,255,255,.9)" }}>
        Not scored yet
      </span>
    );
  }
  const s = VERDICT_STYLE[verdict];
  return (
    <span className="pa-verdict px-3 py-1 text-sm" style={{ background: s.bg, color: s.fg }}>
      {verdict}
    </span>
  );
}

function Section({ id, title, children, hint }: { id: string; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section aria-labelledby={id} className="pa-raised p-5 sm:p-6">
      <h3 id={id} className="pa-display text-lg" style={{ color: "var(--ink)" }}>
        {title}
      </h3>
      {hint && (
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
          {hint}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="pa-inset px-4 py-3">
      <p className="text-xs font-semibold" style={{ color: "var(--slate)" }}>
        {label}
      </p>
      <p className="pa-display mt-1 text-lg tabular-nums sm:text-xl" style={{ color: "var(--ink)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--slate)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Hero({ report, slim }: { report: FeasibilityReport; slim: DashboardPropertySlim }) {
  const s = report.summary;
  const score = Math.round(s.score.value);
  const r = 46;
  const c = 2 * Math.PI * r;
  const v = VERDICT_STYLE[s.verdict];
  return (
    <section aria-labelledby="rep-sum" className="mb-8 overflow-hidden rounded-[16px] p-6 sm:p-8" style={{ background: "var(--dusk)", boxShadow: "var(--shadow-raised)" }}>
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 max-w-xl">
          <h2 id="rep-sum" className="pa-display text-3xl sm:text-5xl" style={{ color: "var(--ink)" }}>
            {s.verdict === "Feasible" ? "This lot can take a backyard cottage." : s.verdict === "Conditional" ? "A backyard cottage could work here, with conditions." : "A backyard cottage will not work on this lot as it stands."}
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--ink)" }}>{s.headline}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--slate)" }}>{slim.neighborhood}{slim.zoning ? `, zoned ${slim.zoning}` : ""}. This is the site and code check.</p>
        </div>
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label={`Score ${score} out of 100, ${s.verdict}`}>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(23, 36, 29,0.12)" strokeWidth="11" />
            <circle className="animate-gauge-draw" style={{ ["--gauge-circumference" as string]: c }} cx="60" cy="60" r={r} fill="none" stroke={v.fg} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
            <text x="60" y="64" textAnchor="middle" style={{ fontSize: 34, fontWeight: 800, fill: "var(--ink)", fontFamily: "var(--font-display)" }}>{score}</text>
            <text x="60" y="82" textAnchor="middle" style={{ fontSize: 10, fill: "var(--slate)" }}>{s.verdict}</text>
          </svg>
          <dl className="grid gap-3">
            <div>
              <dt className="text-xs font-semibold" style={{ color: "var(--slate)" }}>Max buildable</dt>
              <dd className="pa-display text-2xl tabular-nums" style={{ color: "var(--ink)" }}>{s.max_buildable_sf ? sf(s.max_buildable_sf.value) : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold" style={{ color: "var(--slate)" }}>Build estimate</dt>
              <dd className="pa-display text-2xl tabular-nums" style={{ color: "var(--ink)" }}>{s.construction_cost_usd ? usd(s.construction_cost_usd.value) : "None"}</dd>
              {s.max_buildable_sf && s.construction_cost_usd && (
                <dd className="mt-0.5 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
                  {sf(s.max_buildable_sf.value)} × {usd(COST_PER_SF)} per sf. {COST_LABEL}.
                </dd>
              )}
            </div>
            <div>
              <Link
                href={calculatorHref({ sf: s.max_buildable_sf?.value, address: slim.address })}
                className="pa-btn pa-btn-sm no-underline"
              >
                Estimate your return
              </Link>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function ReportBody({ report, row, snapshotRef }: { report: FeasibilityReport; row: FeasibilityTableRow; snapshotRef: MutableRefObject<(() => PlanSnapshot) | null> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
      {/* Left column scrolls */}
      <div className="order-2 flex flex-col gap-6 lg:order-1">
        <Section id="rep-facts" title="Property facts">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.property_facts.map((f) => (
              <Stat
                key={f.label}
                label={f.label}
                value={f.unit === "%" ? `${Math.round(f.value)}%` : f.unit === "sf" ? sf(f.value) : `${Math.round(f.value)} ${f.unit}`}
                sub={f.provenance ? f.provenance.source_layer : undefined}
              />
            ))}
          </dl>
        </Section>

        <Section id="rep-intel" title="Site intelligence" hint="What the city and county data say about this lot, with the source under each card.">
          <SiteIntel row={row} />
        </Section>

        <Section id="rep-scen" title="Scenarios" hint="Only the single cottage has a score today. The others show what is allowed, not a verdict.">
          <ul className="flex flex-col gap-3">
            {report.scenarios.map((sc) => (
              <li key={sc.id} className="pa-inset flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold" style={{ color: "var(--ink)" }}>
                    {SCENARIO_NAMES[sc.id]}
                  </h4>
                  <VerdictChip verdict={sc.verdict} />
                </div>
                <p className="text-sm" style={{ color: "var(--slate)" }}>
                  {sc.note}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums" style={{ color: "var(--ink)" }}>
                  {sc.units != null && <span>{sc.units} {sc.units === 1 ? "home" : "homes"}</span>}
                  {sc.max_buildable_sf && <span>{sf(sc.max_buildable_sf.value)}</span>}
                  {sc.construction_cost_usd && <span>{usd(sc.construction_cost_usd.value)} construction only</span>}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="rep-constraints" title="Site constraints">
          <ul className="flex flex-col gap-2.5">
            {report.site_constraints.map((c) => (
              <li key={c.label} className="flex gap-3 text-sm">
                <ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--green)" }} />
                <span>
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>{c.label}</span>
                  <span style={{ color: "var(--slate)" }}> {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="rep-risks" title="Ranked risks" hint="Hard prohibitions come first.">
          <ol className="flex flex-col gap-2.5">
            {report.risks.map((r) => (
              <li key={r.rank} className="flex gap-3 text-sm">
                <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: r.hard_prohibition ? "var(--red)" : "var(--amber)" }} />
                <span style={{ color: "var(--ink)" }}>
                  {r.title}
                  {r.hard_prohibition && (
                    <span className="ml-2 font-semibold" style={{ color: "var(--red)" }}>Blocks the project</span>
                  )}
                  {r.citations.length === 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs" style={{ color: "var(--slate)" }}>
                      <CircleHelp size={12} aria-hidden /> unverified
                    </span>
                  )}
                </span>
              </li>
            ))}
            {report.risks.length === 0 && <li className="text-sm" style={{ color: "var(--slate)" }}>No risks flagged.</li>}
          </ol>
        </Section>

        <Section id="rep-cite" title="Code citations" hint="Current Seattle code wins over ADUniverse. Citations stay unverified until they are checked against the code text.">
          <ul className="flex flex-col gap-2 text-sm">
            {report.citations.map((c) => (
              <li key={c.section} className="flex items-center justify-between gap-3">
                <span style={{ color: "var(--ink)" }}>{c.section}</span>
                <span className="pa-verdict px-2.5 py-0.5 text-xs" style={{ background: c.status === "verified" ? "var(--green-tint)" : "var(--amber-tint)", color: c.status === "verified" ? "var(--green)" : "var(--amber)" }}>
                  {c.status === "verified" ? `Verified ${c.effective_from ?? ""}` : "Unverified"}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="rep-plans" title="Plans that fit">
          {report.plans.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--slate)" }}>
              Plan matching is not connected yet. Once it is, pre-approved plans that fit the buildable footprint will list here.
            </p>
          ) : (
            <ul className="text-sm">
              {report.plans.map((p) => (
                <li key={p.plan_id}>{p.name} ({sf(p.footprint_sf)})</li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="rep-survey" title="Survey required" hint="Nothing in public data can settle these.">
          <ul className="list-disc pl-5 text-sm" style={{ color: "var(--slate)" }}>
            {report.survey_required.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </Section>

        <footer className="px-1 text-xs" style={{ color: "var(--slate)" }}>
          <p className="font-semibold" style={{ color: "var(--ink)" }}>Data sources</p>
          <ul className="mt-1 space-y-0.5">
            {report.data_pulled.map((d) => (
              <li key={d.layer}>{d.layer}, queried {day(d.provenance.pulled_at)}</li>
            ))}
          </ul>
          <p className="mt-2">Preliminary estimate. Not a permit or legal opinion. Cost is construction only, estimated at {usd(COST_PER_SF)} per buildable sf.</p>
        </footer>
      </div>

      {/* Right column: summary, then the pinned master plan */}
      <div className="order-1 flex flex-col gap-6 lg:sticky lg:top-24 lg:order-2">
        <MasterPlan
          lot={row.result.lot}
          sitePlan={row.result.sitePlan}
          feasibility={row.result.feasibility}
          report={row.report}
          pin={row.result.parcel?.pin ?? null}
          terrain={row.result.terrain ?? null}
          snapshotRef={snapshotRef}
        />
      </div>
    </div>
  );
}

export default function FeasibilityReportView({
  slim,
  detailRow,
  loading,
  error,
  favorite,
  onToggleFavorite,
  onBack,
}: {
  slim: DashboardPropertySlim;
  detailRow: FeasibilityTableRow | null;
  loading: boolean;
  error: string | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onBack();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  const snapshotRef = useRef<(() => PlanSnapshot) | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  async function downloadPdf() {
    if (!report || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      // Read the plan at click time so the PDF shows the units exactly where the user dragged them.
      const plan = snapshotRef.current?.() ?? null;
      const { buildReportPdf, reportPdfName } = await import("@/lib/report-pdf/build-report-pdf");
      const pdf = await buildReportPdf({ slim, report, plan });
      pdf.save(reportPdfName(slim.streetLine || slim.address));
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Could not make the PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  const { report, adapterError } = useMemo(() => {
    if (!detailRow) return { report: null, adapterError: null };
    try {
      return { report: toReport(detailRow), adapterError: null };
    } catch (e) {
      return { report: null, adapterError: e instanceof Error ? e.message : "Could not build the report." };
    }
  }, [detailRow]);

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" className="pa-btn pa-btn-sm mb-3" onClick={onBack}>
            <ArrowLeft size={15} aria-hidden />
            Back to results
          </button>
          <h2 className="pa-display text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>
            {slim.streetLine}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
            {slim.neighborhood}
            {slim.zoning ? `, zoned ${slim.zoning}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <a href={zillowUrl(slim.address)} target="_blank" rel="noopener noreferrer" className="pa-btn pa-btn-sm no-underline">
            Zillow
            <ExternalLink size={14} aria-hidden />
          </a>
          <button type="button" className="pa-btn pa-btn-sm" onClick={downloadPdf} disabled={!report || pdfBusy} aria-busy={pdfBusy}>
            {pdfBusy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />}
            {pdfBusy ? "Making PDF…" : "Download PDF"}
          </button>
          <button type="button" className="pa-btn pa-btn-sm" aria-pressed={favorite} onClick={onToggleFavorite}>
            <Heart size={15} aria-hidden fill={favorite ? "var(--flag)" : "none"} color={favorite ? "var(--flag)" : "var(--ink)"} />
            {favorite ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {(error || adapterError || pdfError) && (
        <div role="alert" className="pa-inset mb-5 p-4 text-sm" style={{ color: "var(--red)" }}>
          {error ?? adapterError ?? pdfError}
        </div>
      )}

      {loading && !report && (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Building the report">
          <div className="pa-raised h-72 pa-skeleton" />
          <div className="pa-raised h-72 pa-skeleton" />
        </div>
      )}

      {report && <Hero report={report} slim={slim} />}
      {report && detailRow && <ReportBody report={report} row={detailRow} snapshotRef={snapshotRef} />}

      <div className="mt-6">
        <Section id="rep-all" title="All property data">
          <div className="-mx-5 sm:-mx-6">
            <FeasPropertyDetails slim={slim} detailRow={detailRow} loading={loading} error={error} />
          </div>
        </Section>
      </div>
    </div>
  );
}
