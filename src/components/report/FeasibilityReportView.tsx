"use client";

import { REHAB_LABELS, daduEconomics, type RehabLevel } from "@/lib/dadu-value";
import RehabPicker from "@/components/listing/RehabPicker";
import type { ReportListing } from "@/lib/feasibility";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { ArrowLeft, Download, Heart, Loader2, ExternalLink } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import type { FeasibilityReport } from "../../../packages/schema/src";
import { toReport } from "@/lib/report/to-report";
import { zillowUrl } from "@/lib/feasibility-verdict";
import FeasPropertyDetails from "@/components/feasibility-pencil/FeasPropertyDetails";
import MasterPlan, { type DaduState, type PlanSnapshot } from "./MasterPlan";
import ReportPaywall from "./ReportPaywall";
import { LimitsStrip, PurchaseBanner, ReportNextSteps, ReportTeaser } from "./ReportJourney";
import { hasFeasibilityAccess } from "@/lib/report-access";
import { prettyAddress, saveParcel } from "@/lib/parcel-context";
import { isProductKind, type ProductKind } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import SiteIntel from "./SiteIntel";
import { ConstraintsGrid, RisksList } from "./ReportSections";
import { StudyAnalysis, StudyConclusion, StudyTable, StudyUtilities } from "./StudySections";
import { buildStudy, type Study } from "@/lib/report/study";
import { loadPlan, savePlan, type DrawnSummary, type SavedPlan } from "@/lib/saved-plan";
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
  // Your estimate of the front house's after-repair value. Empty means break-even: what it costs plus the rehab.
  const [houseArvText, setHouseArvText] = useState("");
  const houseArvInput = Number(houseArvText.replace(/[^0-9.]/g, "")) || null;
  // The DADU the estimate is for: the one drawn on the plan when there is one, else the largest the lot allows.
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
  // Total ARV: the house at break-even (what it cost plus any rehab) or the user's own figure, plus the DADU's resale
  // value. Shown as its own block beside the headline; the deal profit and ROI tiles use it too.
  // The house's basis: its list price when for sale, else the county's assessed value (land + building), so every lot
  // gets a Total ARV, not only listed ones. Break-even is that basis plus any rehab.
  const assessed = slim.assessedValueNum != null && slim.assessedValueNum > 0 ? slim.assessedValueNum : null;
  const basis = listing ? { value: listing.price, kind: "list" as const } : assessed != null ? { value: assessed, kind: "assessed" as const } : null;
  const breakEven = basis && e ? basis.value + e.rehabCost : null;
  const houseArv = houseArvInput ?? breakEven;
  const arv = e && houseArv != null ? { total: houseArv + e.saleValue, house: houseArv, own: houseArvInput != null } : null;
  const money = (n: number) => (n < 0 ? "−" : "") + usd(Math.abs(n));
  // The strip: price when the home is for sale, then what the DADU costs and returns. Numbers lead, one line each.
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
    if (arv && listing) {
      // The whole deal: what it all sells for, less everything paid (the house, its rehab, the DADU and soft costs).
      const cashIn = listing.price + e.rehabCost + e.buildCost + e.softCosts;
      const profit = arv.total - cashIn;
      const pct = Math.round((profit / cashIn) * 100);
      tiles.push({ label: "Deal profit", value: money(profit), note: `${usd(arv.total)} ARV − ${usd(cashIn)} in (house${e.rehabCost > 0 ? ", rehab" : ""}, build, soft costs)`, tone: profit >= 0 ? "green" : "red" });
      tiles.push({ label: "Deal ROI", value: `${pct}%`, note: "profit over everything paid", tone: pct >= 0 ? "green" : "red" });
    } else {
      tiles.push({ label: "Profit", value: money(e.profit), note: e.rehabCost > 0 ? `after ${usd(e.softCosts)} soft costs and rehab` : `after ${usd(e.softCosts)} soft costs`, tone: e.profit >= 0 ? "green" : "red" });
      tiles.push({ label: "ROI", value: `${roiPct}%`, note: "profit over all-in cost", tone: (roiPct ?? 0) >= 0 ? "green" : "red" });
    }
  }

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
        {s.verdict === "Feasible" ? "This lot can take a DADU." : s.verdict === "Conditional" ? "A DADU could work here, with conditions." : "A DADU will not work on this lot as it stands."}
      </h2>
      <p className="mt-1 max-w-3xl text-base leading-relaxed" style={{ color: "var(--slate)" }}>{s.headline} {slim.neighborhood ? `${slim.neighborhood}. ` : ""}This is the site and code check.</p>
      </div>
      {arv && (
        <div className="shrink-0 md:pl-6 md:text-right" aria-label="Total after-repair value">
          <p className="text-sm font-semibold" style={{ color: "var(--slate)" }}>Total ARV</p>
          <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(32px, 4.5vw, 44px)" }}>{usd(arv.total)}</p>
          <p className="mt-1.5 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
            House {usd(arv.house)}{arv.own ? " (your ARV)" : ` ${basis?.kind === "assessed" ? "at county assessed value" : "at break-even"}${e!.rehabCost > 0 ? ` (${basis?.kind === "assessed" ? "+ " : ""}${REHAB_LABELS[e!.rehab].toLowerCase()} ${usd(e!.rehabCost)})` : ""}`}
            <br />+ DADU resale {usd(e!.saleValue)}
          </p>
        </div>
      )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <RehabPicker value={rehab} onChange={setRehab} houseSqft={houseSqft} />
        {basis && (
          <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>
            Front house ARV
            <span className="pa-inset flex items-center gap-1 px-2.5" style={{ minHeight: 32 }}>
              <span style={{ color: "var(--slate)" }}>$</span>
              <input
                type="text"
                inputMode="numeric"
                value={houseArvText}
                onChange={(ev) => setHouseArvText(ev.target.value)}
                placeholder={breakEven != null ? Math.round(breakEven).toLocaleString("en-US") : ""}
                className="w-28 bg-transparent text-sm font-semibold tabular-nums outline-none"
                style={{ color: "var(--ink)", boxShadow: "none" }}
                aria-label="Front house after-repair value, dollars. Leave empty for break-even."
              />
            </span>
            {houseArvInput != null && (
              <button type="button" className="text-xs font-semibold" style={{ color: "var(--green)" }} onClick={() => setHouseArvText("")}>Reset</button>
            )}
          </label>
        )}
      </div>
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
  ["rep-property", "Property"],
  ["rep-zoning", "Zoning"],
  ["rep-standards", "Standards"],
  ["rep-coverage", "Coverage and FAR"],
  ["rep-dadu", "DADU rules"],
  ["rep-intel", "Site conditions"],
  ["rep-risks", "Risks"],
  ["rep-conclusion", "Conclusion"],
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

/**
 * The report below the hero, in the order of an architect's DADU feasibility study: the master plan
 * (drawn by the visitor), property information, jurisdiction, development standards, lot coverage and FAR, DADU
 * rules, site conditions, overhead utilities, risks and the conclusion.
 */
function ReportBody({ report, row, study, snapshotRef, onDaduChange, onDaduState, initialPlan, onPlanChange }: { report: FeasibilityReport; row: FeasibilityTableRow; study: Study; snapshotRef: MutableRefObject<(() => PlanSnapshot) | null>; onDaduChange: (sf: number | null) => void; onDaduState: (s: DaduState | null) => void; initialPlan: SavedPlan | null; onPlanChange: (p: SavedPlan) => void }) {
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
          onDaduState={onDaduState}
          initialPlan={initialPlan}
          onPlanChange={onPlanChange}
        />
      </div>

      <div className="flex flex-col gap-6">
        <Section id="rep-property" title="Property information">
          <StudyTable rows={study.property} head={["Item", "Description"]} />
        </Section>

        <Section id="rep-zoning" title="Jurisdiction and zoning" hint="Governed by the Seattle Municipal Code and reviewed by SDCI.">
          <StudyTable rows={study.jurisdiction} head={["Item", "Description"]} />
        </Section>

        <Section id="rep-standards" title="Development standards" hint="The rules this report applies to the lot.">
          <StudyTable rows={study.standards} head={["Item", "Requirement", "Basis"]} withRef />
        </Section>

        <div id="rep-coverage" className="grid scroll-mt-[190px] gap-6 lg:grid-cols-2">
          {study.coverage && (
            <Section id="rep-coverage-lot" title="Lot coverage analysis">
              <StudyAnalysis block={study.coverage} />
            </Section>
          )}
          {study.far && (
            <Section id="rep-far" title="FAR analysis">
              <StudyAnalysis block={study.far} />
            </Section>
          )}
        </div>

        <Section id="rep-dadu" title="DADU regulations">
          <StudyTable rows={study.dadu} head={["Item", "Requirement", "Basis"]} withRef />
        </Section>

        <Section id="rep-intel" title="Site conditions" hint="What the city and county data say about this lot, with the source under each card.">
          <SiteIntel row={row} />
          <div className="mt-6">
            <ConstraintsGrid row={row} />
          </div>
        </Section>

        <Section id="rep-utilities" title="Overhead utilities">
          <StudyUtilities study={study} />
        </Section>

        <Section id="rep-risks" title="Ranked risks" hint="Hard prohibitions come first.">
          <RisksList report={report} />
        </Section>

        <Section id="rep-conclusion" title="Conclusion">
          <StudyConclusion study={study} />
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
  // The free teaser is open to everyone; the full report opens after either paid tier ($200 or $600).
  // Read after mount so the server render and the first client render agree.
  const gateAddress = slim.streetLine || slim.address;
  const pin = slim.pin;
  const [paid, setPaid] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [purchase, setPurchase] = useState<{ kind: string; dueDate: string | null; email: string } | null>(null);
  const [defaultTier, setDefaultTier] = useState<ProductKind | undefined>(undefined);
  useEffect(() => {
    setPaid(hasFeasibilityAccess(pin, gateAddress));
    const t = new URLSearchParams(window.location.search).get("tier");
    const tier = t === "reviewed" ? "feasibility_reviewed" : t === "instant" ? "feasibility_instant" : t;
    if (isProductKind(tier)) setDefaultTier(tier);
    if (pin) saveParcel({ pin, address: slim.address });
    setAccessChecked(true);
  }, [pin, gateAddress, slim.address]);
  const unlocked = paid;
  const eligible = !!detailRow && detailRow.siteScore.eligible && (detailRow.daduScore ?? 0) > 0;
  useEffect(() => {
    if (accessChecked && !paid && detailRow) track("teaser_viewed", { eligible });
  }, [accessChecked, paid, detailRow, eligible]);
  // The DADU as drawn on the plan: the build estimate and return follow it (the largest allowed size until it is drawn).
  const [drawnSf, setDrawnSf] = useState<number | null>(null);
  // The drawing itself, saved per parcel in this browser: it reopens with the lot, goes into the PDF and the study,
  // and is what Start my project carries into the project.
  const [drawn, setDrawn] = useState<DrawnSummary | null>(null);
  const [initialPlan] = useState<SavedPlan | null>(() => (typeof window === "undefined" ? null : loadPlan(slim.pin)?.plan ?? null));
  const drawnRef = useRef<DrawnSummary | null>(null);
  const onDaduState = useCallback((st: DaduState | null) => {
    const d = st ? { living: st.living, footprint: st.footprint, w: st.w, d: st.d, stories: st.stories } : null;
    drawnRef.current = d;
    setDrawn(d);
  }, []);
  const onPlanChange = useCallback((plan: SavedPlan) => savePlan(slim.pin, plan, drawnRef.current), [slim.pin]);
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
      const pdf = await buildReportPdf({ slim, report, plan, study });
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

  const study = useMemo<Study | null>(() => {
    if (!detailRow || !report) return null;
    const p = detailRow.result.parcel;
    const verdict = report.summary.verdict;
    return buildStudy({ address: `${prettyAddress(slim.streetLine || slim.address)}, Seattle, WA${p?.zip ? ` ${p.zip}` : ""}`, pin: p?.pin ?? null, zoning: p?.zoning ?? slim.zoning, neighborhood: slim.neighborhood, urbanVillage: p?.urbanVillage ?? null, lotSqft: p?.lotSqft ?? slim.lotSizeSqft, yearBuilt: p?.yearBuilt ?? null, feasibility: detailRow.result.feasibility, adu: detailRow.report, verdict, drawn });
  }, [detailRow, report, slim, drawn]);

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
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a href={zillowUrl(slim.address)} target="_blank" rel="noopener noreferrer" className="pa-btn pa-btn-sm no-underline">
            Zillow
            <ExternalLink size={14} aria-hidden />
          </a>
          <button type="button" className="pa-btn pa-btn-sm" onClick={downloadPdf} disabled={!report || pdfBusy || !unlocked} aria-busy={pdfBusy} title={unlocked ? undefined : "Unlock the full report to download the PDF"}>
            {pdfBusy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />}
            {pdfBusy ? "Making PDF…" : "Download PDF"}
          </button>
          <button type="button" className="pa-btn pa-btn-sm" aria-pressed={favorite} onClick={onToggleFavorite}>
            <Heart size={15} aria-hidden fill={favorite ? "var(--flag)" : "none"} color={favorite ? "var(--flag)" : "var(--ink)"} />
            {favorite ? "Saved" : "Save"}
          </button>
          {report && (
            <Link href={calculatorHref({ sf: drawnSf ?? report.summary.max_buildable_sf?.value, address: slim.address, price: detailRow?.result.listing?.price, houseSqft: detailRow?.result.listing?.livingSqft ?? detailRow?.result.feasibility?.totalBuildingSqft })} className="pa-btn pa-btn-primary pa-btn-sm no-underline">
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

      {accessChecked && !unlocked && detailRow && <ReportTeaser eligible={eligible} lotSqft={slim.lotSizeSqft} zoning={slim.zoning} />}
      {unlocked && purchase && <PurchaseBanner kind={purchase.kind} dueDate={purchase.dueDate} email={purchase.email} />}

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
      {report && detailRow && <div className="mb-6"><LimitsStrip adu={detailRow.report} zoning={slim.zoning} lotSqft={slim.lotSizeSqft} buildingSqft={detailRow.result.feasibility?.totalBuildingSqft ?? null} /></div>}
      {report && detailRow && <SectionTabs />}
      {report && detailRow && study && <ReportBody report={report} row={detailRow} study={study} snapshotRef={snapshotRef} onDaduChange={setDrawnSf} onDaduState={onDaduState} initialPlan={initialPlan} onPlanChange={onPlanChange} />}

      <div className="mt-6">
        <Section id="rep-all" title="All property data">
          <div className="-mx-5 sm:-mx-6">
            <FeasPropertyDetails slim={slim} detailRow={detailRow} loading={loading} error={error} />
          </div>
        </Section>
      </div>
      </div>

      {!unlocked && accessChecked && (
        <div className="absolute inset-0 flex items-start justify-center px-2 pt-8 sm:pt-14">
          <div className="sticky top-28 flex w-full flex-col items-center">
            <p className="rt-overlay">Your full buildable envelope is ready.</p>
            <ReportPaywall
              pin={pin}
              address={gateAddress}
              defaultTier={defaultTier}
              onUnlock={(r, email) => {
                setPaid(true);
                setJustUnlocked(true);
                setPurchase({ kind: r.kind, dueDate: r.dueDate, email });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </div>
      )}
      </div>
      {report && <ReportNextSteps pin={pin} address={slim.address} />}
    </div>
  );
}
