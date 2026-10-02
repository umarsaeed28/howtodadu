"use client";

import { REHAB_LABELS, daduEconomics, type RehabLevel } from "@/lib/dadu-value";
import RehabPicker from "@/components/listing/RehabPicker";
import type { ReportListing } from "@/lib/feasibility";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { ArrowLeft, Download, Heart, Loader2, ExternalLink } from "lucide-react";
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
import { ConstraintsGrid, FactsStrip, RisksList, ScenariosGrid, VerifyStrip } from "./ReportSections";
import { COST_PER_SF, constructionEstimate } from "@/lib/config/costs";
import { calculatorHref } from "@/lib/calculator/inputs";
import Link from "next/link";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const sf = (n: number) => `${Math.round(n).toLocaleString()} sf`;


const VERDICT_STYLE: Record<string, { bg: string; fg: string }> = {
  Feasible: { bg: "var(--green-tint)", fg: "var(--green)" },
  Conditional: { bg: "var(--amber-tint)", fg: "var(--amber)" },
  "Not feasible": { bg: "var(--red-tint)", fg: "var(--red)" },
};


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


function Hero({ report, slim, listing, drawnSf, houseSqft }: { report: FeasibilityReport; slim: DashboardPropertySlim; listing: ReportListing | null; drawnSf: number | null; houseSqft: number | null }) {
  const s = report.summary;
  // How much work the existing house needs: its cost per sf of house joins the all-in cost and the return.
  const [rehab, setRehab] = useState<RehabLevel>("none");
  // The cottage the estimate is for: the one drawn on the plan when there is one, else the largest the lot allows.
  const estSf = drawnSf ?? s.max_buildable_sf?.value ?? null;
  const estCost = estSf ? constructionEstimate(estSf) : null;
  const asDrawn = drawnSf != null && s.max_buildable_sf != null && Math.round(drawnSf) !== Math.round(s.max_buildable_sf.value);
  const score = Math.round(s.score.value);
  const v = VERDICT_STYLE[s.verdict];
  const lot = report.property_facts.find((f) => /lot area/i.test(f.label));
  const facts = [
    s.max_buildable_sf ? `${sf(s.max_buildable_sf.value)} DADU` : "No DADU room",
    lot ? `${sf(lot.value)} lot` : null,
    slim.zoning ? `Zoned ${slim.zoning}` : null,
  ].filter((x): x is string => !!x);
  const e = daduEconomics(estSf, undefined, { rehab, houseSqft });
  const roiPct = e ? Math.round(e.roi * 100) : null;
  const money = (n: number) => (n < 0 ? "−" : "") + usd(Math.abs(n));
  // The strip: price when the home is for sale, then what the cottage costs and returns. Numbers lead, one line each.
  const tiles: { label: string; value: string; note?: string; tone?: "green" | "red"; extra?: React.ReactNode }[] = [];
  if (listing)
    tiles.push({
      label: "List price",
      value: usd(listing.price),
      note: [listing.beds != null && `${listing.beds} bd`, listing.baths != null && `${listing.baths} ba`, listing.livingSqft != null && sf(listing.livingSqft), listing.daysOnMarket != null && `${listing.daysOnMarket} days on market`].filter(Boolean).join(" · "),
      extra: (
        <span className="flex flex-wrap items-center gap-2">
          {listing.pending && <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "#FFF4D6", color: "#7A5A12" }}>Pending</span>}
          <Link href={`/listing/${encodeURIComponent(listing.mlsId)}`} className="text-xs font-semibold no-underline" style={{ color: "var(--green)" }}>View the listing</Link>
        </span>
      ),
    });
  tiles.push({
    label: "Build estimate",
    value: estCost ? usd(estCost) : "None",
    note: estSf && estCost ? `${sf(estSf)}${asDrawn ? " as drawn" : ""} × ${usd(COST_PER_SF)} per sf${asDrawn && s.max_buildable_sf ? ` · up to ${sf(s.max_buildable_sf.value)}` : ""}` : "No DADU room",
  });
  if (e) {
    tiles.push({ label: "DADU resale value", value: usd(e.saleValue), note: `${usd(e.salePsf)} per sf · ${usd(e.allInCost)} all in` });
    tiles.push({ label: "Profit", value: money(e.profit), note: e.rehabCost > 0 ? `after ${usd(e.softCosts)} soft costs and rehab` : `after ${usd(e.softCosts)} soft costs`, tone: e.profit >= 0 ? "green" : "red" });
    tiles.push({ label: "ROI", value: `${roiPct}%`, note: "profit over all-in cost", tone: (roiPct ?? 0) >= 0 ? "green" : "red" });
  }
  // Total ARV: the house at break-even (what it cost plus any rehab) plus the DADU's resale value. Its own block, beside
  // the headline, not a tile.
  const arv = listing && e ? { total: listing.price + e.rehabCost + e.saleValue, house: listing.price + e.rehabCost } : null;

  return (
    <section aria-labelledby="rep-sum" id="rep-overview" className="mb-6 scroll-mt-[190px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(44px, 7vw, 64px)" }} aria-label={`DADU score ${score} out of 100`}>
          {score}
          <span className="ml-1 text-2xl font-bold" style={{ color: "var(--slate)" }}>/100</span>
        </p>
        <span className="mb-1.5 inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold" style={{ background: v.bg, color: v.fg }}>{s.verdict}</span>
        <p className="mb-1.5 text-[17px] tabular-nums" style={{ color: "var(--ink)" }}>
          {facts.map((f, i) => (
            <span key={f}>
              {i > 0 && <span className="mx-2" style={{ color: "var(--line-strong)" }} aria-hidden>|</span>}
              <strong className="font-bold">{f.split(" ")[0]}</strong> {f.split(" ").slice(1).join(" ")}
            </span>
          ))}
        </p>
      </div>
      <h2 id="rep-sum" className="mt-3 text-xl font-semibold leading-snug sm:text-2xl" style={{ color: "var(--ink)" }}>
        {s.verdict === "Feasible" ? "This lot can take a backyard cottage." : s.verdict === "Conditional" ? "A backyard cottage could work here, with conditions." : "A backyard cottage will not work on this lot as it stands."}
      </h2>
      <p className="mt-1 max-w-3xl text-base leading-relaxed" style={{ color: "var(--slate)" }}>{s.headline} {slim.neighborhood ? `${slim.neighborhood}. ` : ""}This is the site and code check.</p>
      </div>
      {arv && (
        <div className="shrink-0 md:pl-6 md:text-right" aria-label="Total after-repair value">
          <p className="text-sm font-semibold" style={{ color: "var(--slate)" }}>Total ARV</p>
          <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(32px, 4.5vw, 44px)" }}>{usd(arv.total)}</p>
          <p className="mt-1.5 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
            House {usd(arv.house)} at break-even{e!.rehabCost > 0 ? ` (${REHAB_LABELS[e!.rehab].toLowerCase()} ${usd(e!.rehabCost)})` : ""}
            <br />+ DADU resale {usd(e!.saleValue)}
          </p>
        </div>
      )}
      </div>

      <div className="mt-4"><RehabPicker value={rehab} onChange={setRehab} houseSqft={houseSqft} /></div>
      <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5" aria-label="Price, cost and return">
        {tiles.map((t) => (
          <div key={t.label} className="pa-raised min-w-0 p-3 sm:p-4">
            <dt className="text-xs" style={{ color: "var(--slate)" }}>{t.label}</dt>
            <dd className="pa-display mt-1 truncate text-[22px] leading-tight tabular-nums" style={{ color: t.tone === "green" ? "#145A40" : t.tone === "red" ? "var(--red)" : "var(--ink)" }}>{t.value}</dd>
            {t.note && <dd className="mt-0.5 text-xs leading-snug" style={{ color: "var(--slate)" }}>{t.note}</dd>}
            {t.extra && <dd className="mt-1">{t.extra}</dd>}
          </div>
        ))}
      </dl>
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
  ["rep-cite", "Before you buy"],
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

function ReportBody({ report, row, snapshotRef, onDaduChange }: { report: FeasibilityReport; row: FeasibilityTableRow; snapshotRef: MutableRefObject<(() => PlanSnapshot) | null>; onDaduChange: (sf: number | null) => void }) {
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
          onDaduChange={onDaduChange}
        />
      </div>

      <div className="flex flex-col gap-6">
        <Section id="rep-facts" title="Property facts">
          <FactsStrip report={report} />
        </Section>

        <Section id="rep-intel" title="Site intelligence" hint="What the city and county data say about this lot, with the source under each card.">
          <SiteIntel row={row} />
        </Section>

        <Section id="rep-scen" title="Scenarios" hint="Only the single cottage has a score today. The others show what the lot allows.">
          <ScenariosGrid report={report} />
        </Section>

        <Section id="rep-constraints" title="Site checks">
          <ConstraintsGrid row={row} />
        </Section>

        <Section id="rep-risks" title="Ranked risks" hint="Hard prohibitions come first.">
          <RisksList report={report} />
        </Section>

        <Section id="rep-cite" title="Before you buy">
          <VerifyStrip report={report} />
        </Section>
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
  // The DADU as drawn on the plan: the build estimate and return follow it (the largest allowed size until it is drawn).
  const [drawnSf, setDrawnSf] = useState<number | null>(null);
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
          {report && (
            <Link href={calculatorHref({ sf: drawnSf ?? report.summary.max_buildable_sf?.value, address: slim.address })} className="pa-btn pa-btn-primary pa-btn-sm no-underline">
              Estimate your return
            </Link>
          )}
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

      {report && <Hero report={report} slim={slim} listing={detailRow?.result.listing ?? null} drawnSf={drawnSf} houseSqft={detailRow?.result.listing?.livingSqft ?? detailRow?.result.feasibility?.totalBuildingSqft ?? null} />}
      {report && detailRow && <SectionTabs />}
      {report && detailRow && <ReportBody report={report} row={detailRow} snapshotRef={snapshotRef} onDaduChange={setDrawnSf} />}

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
