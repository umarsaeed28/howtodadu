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
import ReportEmailGate from "./ReportEmailGate";
import { hasReportAccess } from "@/lib/report-access";
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
    <section aria-labelledby={`${id}-h`} id={id} className="pa-raised scroll-mt-[190px] p-5 sm:p-6">
      <h3 id={`${id}-h`} className="pa-display text-xl" style={{ color: "var(--ink)" }}>
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
  const v = VERDICT_STYLE[s.verdict];
  const lot = report.property_facts.find((f) => /lot area/i.test(f.label));
  const facts = [
    s.max_buildable_sf ? `${sf(s.max_buildable_sf.value)} DADU` : "No DADU room",
    lot ? `${sf(lot.value)} lot` : null,
    slim.zoning ? `Zoned ${slim.zoning}` : null,
  ].filter((x): x is string => !!x);
  return (
    <section aria-labelledby="rep-sum" id="rep-overview" className="mb-6 grid scroll-mt-[190px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(44px, 7vw, 64px)" }} aria-label={`DADU score ${score} out of 100`}>
            {score}
            <span className="ml-1 text-2xl font-bold" style={{ color: "var(--slate)" }}>/100</span>
          </p>
          <span className="mb-1.5 inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold" style={{ background: v.bg, color: v.fg }}>{s.verdict}</span>
        </div>
        <p className="mt-3 text-[17px] tabular-nums" style={{ color: "var(--ink)" }}>
          {facts.map((f, i) => (
            <span key={f}>
              {i > 0 && <span className="mx-2" style={{ color: "var(--line-strong)" }} aria-hidden>|</span>}
              <strong className="font-bold">{f.split(" ")[0]}</strong> {f.split(" ").slice(1).join(" ")}
            </span>
          ))}
        </p>
        <h2 id="rep-sum" className="mt-4 text-xl font-semibold leading-snug sm:text-2xl" style={{ color: "var(--ink)" }}>
          {s.verdict === "Feasible" ? "This lot can take a backyard cottage." : s.verdict === "Conditional" ? "A backyard cottage could work here, with conditions." : "A backyard cottage will not work on this lot as it stands."}
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed" style={{ color: "var(--slate)" }}>{s.headline} {slim.neighborhood ? `${slim.neighborhood}. ` : ""}This is the site and code check.</p>
      </div>
      <aside className="pa-raised p-5" aria-label="Build estimate">
        <p className="text-sm font-semibold" style={{ color: "var(--slate)" }}>Build estimate</p>
        <p className="pa-display mt-1 text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{s.construction_cost_usd ? usd(s.construction_cost_usd.value) : "None"}</p>
        {s.max_buildable_sf && s.construction_cost_usd && (
          <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
            {sf(s.max_buildable_sf.value)} × {usd(COST_PER_SF)} per sf. {COST_LABEL}.
          </p>
        )}
        <Link href={calculatorHref({ sf: s.max_buildable_sf?.value, address: slim.address })} className="pa-btn pa-btn-primary mt-4 w-full no-underline" style={{ minHeight: 44 }}>
          Estimate your return
        </Link>
        <a href="#rep-plan" className="pa-btn mt-2 w-full no-underline" style={{ minHeight: 44 }}>
          Open the master plan
        </a>
      </aside>
    </section>
  );
}

const SECTION_TABS = [
  ["rep-overview", "Overview"],
  ["rep-plan", "Master plan"],
  ["rep-facts", "Facts"],
  ["rep-intel", "Site intelligence"],
  ["rep-scen", "Scenarios"],
  ["rep-risks", "Risks"],
  ["rep-cite", "Code"],
  ["rep-all", "All data"],
] as const;

/** Sticky in-page tabs, like the section bar on a home listing page. */
function SectionTabs() {
  return (
    <nav aria-label="Report sections" className="z-20 -mx-4 mb-6 border-b px-4 sm:-mx-6 sm:px-6 md:sticky md:top-[133px]" style={{ background: "var(--paper)", borderColor: "var(--hairline)" }}>
      <ul className="pa-scroll flex gap-1 overflow-x-auto py-1">
        {SECTION_TABS.map(([id, label]) => (
          <li key={id} className="shrink-0">
            <a href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline transition-colors hover:bg-[var(--green-tint)]" style={{ color: "var(--ink)" }}>{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ReportBody({ report, row, snapshotRef }: { report: FeasibilityReport; row: FeasibilityTableRow; snapshotRef: MutableRefObject<(() => PlanSnapshot) | null> }) {
  return (
    <div className="flex flex-col gap-6">
      {/* The master plan breaks out of the page column to (nearly) the full screen width, so there is room to work. */}
      <div id="rep-plan" className="mx-[calc((100%_-_min(100vw_-_2rem,1680px))/2)] w-[min(100vw_-_2rem,1680px)] max-w-none scroll-mt-[190px]">
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

      <div className="flex flex-col gap-6">
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
  // Email wall: the report renders blurred until this browser has given an email once.
  // Read after mount so the server render and the first client render agree.
  const [unlocked, setUnlocked] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  useEffect(() => {
    setUnlocked(hasReportAccess());
    setAccessChecked(true);
  }, []);
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
          <button type="button" className="pa-btn pa-btn-sm" onClick={downloadPdf} disabled={!report || pdfBusy || !unlocked} aria-busy={pdfBusy} title={unlocked ? undefined : "Enter your email to download the PDF"}>
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

      <div className="relative">
      <div
        inert={!unlocked}
        aria-hidden={!unlocked || undefined}
        className={unlocked ? (justUnlocked ? "report-reveal" : undefined) : "pointer-events-none max-h-[1500px] select-none overflow-hidden"}
        style={unlocked ? undefined : { filter: "blur(9px)", WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent)", maskImage: "linear-gradient(to bottom, #000 55%, transparent)" }}
      >
      {loading && !report && (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Building the report">
          <div className="pa-raised h-72 pa-skeleton" />
          <div className="pa-raised h-72 pa-skeleton" />
        </div>
      )}

      {report && <Hero report={report} slim={slim} />}
      {report && detailRow && <SectionTabs />}
      {report && detailRow && <ReportBody report={report} row={detailRow} snapshotRef={snapshotRef} />}

      <div className="mt-6">
        <Section id="rep-all" title="All property data">
          <div className="-mx-5 sm:-mx-6">
            <FeasPropertyDetails slim={slim} detailRow={detailRow} loading={loading} error={error} />
          </div>
        </Section>
      </div>
      </div>

      {!unlocked && accessChecked && (
        <div className="absolute inset-0 flex items-start justify-center px-2 pt-10 sm:pt-16">
          <div className="sticky top-28 flex w-full justify-center">
            <ReportEmailGate address={slim.streetLine || slim.address} onUnlock={() => { setUnlocked(true); setJustUnlocked(true); }} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
