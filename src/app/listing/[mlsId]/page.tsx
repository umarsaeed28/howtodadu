import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Bath, BedDouble, Calculator, ExternalLink, FlaskConical, Ruler, Trees } from "lucide-react";
import { getListingsProvider, listingsProviderName, type RawListing } from "@/lib/listings";
import { getDetail } from "@/lib/listings/redfin";
import type { ListingDetail } from "@/lib/listings/provider";
import { findLotForListing, libraryAvailable } from "@/lib/server/lot-library-store";
import { COST_LABEL, constructionEstimate } from "@/lib/config/costs";
import { calculatorHref } from "@/lib/calculator/inputs";
import AssessmentCard from "@/components/listing/AssessmentCard";
import { getAduniverseFacts, getParcelValues } from "@/lib/server/aduniverse";
import { planSite } from "@/lib/dadu-site-plan";
import { computeBasis } from "@/lib/investor";
import InvestorSnapshot from "@/components/listing/InvestorSnapshot";
import ListingPhoto from "@/components/listing/ListingPhoto";
import LotSketch from "@/components/listing/LotSketch";
import SaveButton from "@/components/listing/SaveButton";
import { redfinLink } from "@/lib/listings/redfin-link";
import { overrideFor, statusOverrides } from "@/lib/listings/status-overrides";
import { isPending } from "@/lib/listings/status";
import DaduSnapshot from "@/components/listing/DaduSnapshot";
import { siteScoreFor } from "@/lib/server/site-score";
import { MIN_SHOWN_SCORE } from "@/lib/dadu-score";
import { GRADE_STEEP_PCT, GRADE_VERY_STEEP_PCT, gradeNote } from "@/lib/grade";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const street = (a: string) => titleCase(a.split(",")[0]);

async function load(id: string): Promise<{ listing: RawListing; detail: ListingDetail } | null> {
  const listing = await getListingsProvider().getById(id);
  if (!listing) return null;
  let detail: ListingDetail = listing.detail ?? { photos: listing.photos, priceHistory: [], taxHistory: [], schools: [], scores: {} };
  if (listingsProviderName() === "redfin") {
    try {
      detail = await getDetail(listing);
    } catch {
      /* the page still works from the search data */
    }
  }
  return { listing, detail };
}

function riskFlags(i: { hoa?: number; plan: ReturnType<typeof planSite> | null; adu: Awaited<ReturnType<typeof getAduniverseFacts>>; canopyPct: number | null; zoning: string }): { text: string; source: string; level: "stop" | "watch" | "ok" }[] {
  const out: { text: string; source: string; level: "stop" | "watch" | "ok" }[] = [];
  if (i.hoa == null) out.push({ text: "No HOA reported.", source: "Listing feed", level: "ok" });
  else if (i.hoa > 0) out.push({ text: `HOA of ${usd(i.hoa)} per month. A property with an HOA is never a DADU candidate.`, source: "Listing feed", level: "stop" });
  else out.push({ text: "No HOA reported.", source: "Listing feed", level: "ok" });
  if (i.plan && !i.plan.area.pass) out.push({ text: `Lot is under the ${i.plan.area.min.toLocaleString()} sq ft minimum.`, source: "Team guide", level: "stop" });
  if (i.plan?.access.vehicle === false) out.push({ text: "Walk-in access only. Rear units with no car access sell poorly.", source: "Team guide", level: "watch" });
  else if (i.plan?.access.vehicle === "tight") out.push({ text: "Car access is tight. Check clearance beside the house.", source: "Team guide", level: "watch" });
  if (i.plan?.warning) out.push({ text: i.plan.warning, source: "Team guide", level: "watch" });
  const canopy = i.canopyPct == null ? null : Math.round(i.canopyPct <= 1 ? i.canopyPct * 100 : i.canopyPct);
  if (canopy != null && canopy >= 50) out.push({ text: `Tree canopy covers ${canopy}% of the lot. Tree protection can limit where you build.`, source: "ADUniverse", level: "watch" });
  const f = i.adu?.raw;
  if (f?.steepSlopePercent) out.push({ text: "Part of the lot is steep slope, a critical area.", source: "ADUniverse", level: "watch" });
  const eca = [f?.wetlandPercent && "wetland", f?.wildlifePercent && "wildlife habitat", f?.riparianPercent && "riparian corridor", f?.floodProne && "flood-prone", f?.liquefaction && "liquefaction", f?.knownSlide && "known landslide", f?.potentialSlide && "potential landslide", f?.peat && "peat", f?.landfill && "landfill"].filter(Boolean);
  if (eca.length) out.push({ text: `Critical area flags: ${eca.join(", ")}.`, source: "ADUniverse", level: "watch" });
  if (f && (f.totalADU ?? 0) >= 2) out.push({ text: "The lot already has two ADUs, the maximum.", source: "ADUniverse", level: "stop" });
  if (/^(LR|MR|NC|C1|C2|SM|IC|IB|IG|HR|BN|RSL)/i.test(i.zoning)) out.push({ text: `Zoned ${i.zoning}, outside the Neighborhood Residential rules in the knowledge base.`, source: "City GIS", level: "watch" });
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ mlsId: string }> }): Promise<Metadata> {
  const l = await getListingsProvider().getById((await params).mlsId);
  return { title: l ? `${street(l.address)}, ${usd(l.listPrice)} — Pencil` : "Listing — Pencil" };
}

/** 30-year fixed, 20% down. A rough monthly figure, labelled as such on the page. */
function monthly(price: number, hoa = 0): { pi: number; tax: number; total: number } {
  const loan = price * 0.8;
  const r = 0.0625 / 12;
  const n = 360;
  const pi = (loan * r) / (1 - Math.pow(1 + r, -n));
  const tax = (price * 0.0092) / 12;
  return { pi, tax, total: pi + tax + hoa };
}

export default async function ListingPage({ params }: { params: Promise<{ mlsId: string }> }) {
  const { mlsId } = await params;
  const data = await load(mlsId);
  if (!data) notFound();
  const { listing: l, detail: d } = data;
  const lot = libraryAvailable() ? findLotForListing(l.address, l.lat, l.lng) : null;
  const [adu, values] = lot ? await Promise.all([getAduniverseFacts(lot.pin), getParcelValues(lot.pin)]) : [null, null];
  const plan = lot ? planSite({ lotSqft: lot.lotSqft, widthFt: adu?.raw.lotWidth ?? null, depthFt: adu?.raw.lotDepth ?? null, alley: lot.alley }) : null;
  const basis = computeBasis({ price: l.listPrice, livingSqft: l.livingSqft, lotSqft: l.lotSqft || lot?.lotSqft, daduSqft: lot?.daduSqft, landAv: values?.landAv, bldgAv: values?.bldgAv });
  const risks = riskFlags({ hoa: l.hoaMonthly, plan, adu, canopyPct: lot?.canopyPct ?? null, zoning: lot?.zoning ?? "" });
  if (!lot) risks.push({ text: "This address is not in the city lot library: it is not an eligible single-family lot, or the DADU engine found no room.", source: "City GIS", level: "watch" });
  const isTest = listingsProviderName() === "fixture";
  const photos = d.photos.length ? d.photos : l.photos;
  const e = 0.0009;
  const aerial = `/api/aerial?bbox=${[l.lng - e, l.lat - e, l.lng + e, l.lat + e].map((v) => v.toFixed(6)).join(",")}&size=1200,800&style=satellite`;
  const pay = monthly(l.listPrice, l.hoaMonthly ?? 0);
  const sf = lot?.daduSqft ? Math.round(lot.daduSqft) : 0;
  const fullAddress = l.address;
  const site = siteScoreFor(l, lot, adu);
  // Pending: from our status list (data/listing-status.json) or the source. Null when the listing is active.
  const override = overrideFor(statusOverrides(), l.address, l.zip);
  const pendingNote = override ? override.note : isPending(l.status) ? "" : null;
  const widthFt = lot?.lotWidth ?? adu?.raw.lotWidth ?? null;
  const depthFt = lot?.lotDepth ?? adu?.raw.lotDepth ?? null;

  // Pencil only shows homes at or above MIN_SHOWN_SCORE. An old link to a lower one gets a short note, not the full page.
  const shownScore = site?.eligible ? site.score : 0;
  if (shownScore < MIN_SHOWN_SCORE) {
    return (
      <div className="pencil-app">
        <article className="mx-auto max-w-[640px] px-4 pb-16 pt-10 md:px-6">
          <h1 className="pa-display text-2xl" style={{ color: "var(--ink)" }}>{street(l.address)} is below the bar</h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink)" }}>
            {site?.eligible
              ? `Its lot scores ${site.score} out of 100 for a DADU. Pencil shows homes that score ${MIN_SHOWN_SCORE} or more.`
              : site
                ? `A screening rule rules this lot out for a DADU: ${site.gates.find((g) => g.status === "fail")?.note ?? "it fails a screening check."}`
                : "This address is not in the city lot library, so it is not an eligible single-family lot with room for a DADU."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/?zip=${l.zip}`} className="pa-btn pa-btn-primary no-underline"><ArrowLeft size={14} aria-hidden /> See homes that score {MIN_SHOWN_SCORE}+ nearby</Link>
            <Link href={`/feasibility?address=${encodeURIComponent(l.address)}`} className="pa-btn no-underline">Check the lot anyway</Link>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="pencil-app">
      <article className="mx-auto max-w-[1180px] px-4 pb-16 pt-5 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/?zip=${l.zip}`} className="pa-btn pa-btn-sm no-underline">
            <ArrowLeft size={14} aria-hidden /> Back to the map
          </Link>
          <SaveButton item={{ mlsId: l.mlsId, address: street(l.address), price: l.listPrice, photo: photos[0] ?? null, score: site!.score }} />
        </div>

        {/* Gallery: one large photo and four small, like a listing portal. Falls back to the lot from above. */}
        <div className="mt-4 grid gap-2 overflow-hidden rounded-2xl md:h-[360px] md:grid-cols-4 md:grid-rows-2">
          <div className={`relative md:row-span-2 ${photos.length > 1 ? "md:col-span-2" : "md:col-span-4"}`} style={{ background: "var(--green-tint)" }}>
            <ListingPhoto src={photos[0] ?? aerial} fallback={aerial} alt={photos[0] ? `Front of ${street(l.address)}` : `Aerial view of the lot at ${street(l.address)}`} className="h-64 w-full object-cover md:h-full" />
            {!photos[0] && <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>Aerial view, no listing photos yet</span>}
          </div>
          {photos.slice(1, 5).map((p, i) => (
            <div key={p} className="relative hidden md:block">
              <ListingPhoto src={p} alt={`${street(l.address)}, photo ${i + 2}`} className="h-full w-full object-cover" loading="lazy" />
              {i === 3 && photos.length > 5 && <span className="absolute bottom-3 right-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold">+{photos.length - 5} photos</span>}
            </div>
          ))}
        </div>

        {photos[0]?.includes("kingcounty.gov") || photos[0]?.includes("blue.kingcounty.com") ? (
          <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>House photos from the King County Assessor&apos;s public property record. They can be a few years old.</p>
        ) : null}
        <nav aria-label="Listing sections" className="sticky top-[var(--nav-h,64px)] z-20 -mx-4 mt-4 border-b px-4 md:-mx-6 md:px-6" style={{ background: "var(--paper)", borderColor: "var(--hairline)" }}>
          <ul className="pa-scroll flex gap-1 overflow-x-auto py-1">
            {([["overview", "Overview"], ...(lot ? [["dadu-h", "DADU potential"]] : []), ["ai-h", "AI review"], ["inv-h", "Investor view"], ["facts-h", "Home facts"], ...(d.priceHistory.length ? [["ph-h", "Price history"]] : []), ...(d.schools.length ? [["sch-h", "Schools"]] : [])] as [string, string][]).map(([id, label]) => (
              <li key={id} className="shrink-0"><a href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline hover:bg-[var(--green-tint)]" style={{ color: "var(--ink)" }}>{label}</a></li>
            ))}
          </ul>
        </nav>

        <div id="overview" className="mt-6 grid scroll-mt-32 gap-8 lg:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-8">
            <header>
              {pendingNote != null && (
                <p className="mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#FFF4D6", color: "#7A5A12" }}>
                  Pending{pendingNote ? `: ${pendingNote}` : ""}
                </p>
              )}
              {isTest && (
                <p className="mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
                  <FlaskConical size={13} aria-hidden /> Sample data, not a live listing
                </p>
              )}
              {/* Price first, then the facts line, then the address: the order a home buyer scans in. */}
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(36px, 5vw, 48px)" }}>{usd(l.listPrice)}</p>
                <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: pendingNote != null ? "#7A5A12" : "var(--green)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: pendingNote != null ? "#D9A441" : "var(--green)" }} aria-hidden />
                  {pendingNote != null ? "Pending" : titleCase(l.status.replace(/_/g, " "))}{l.daysOnMarket != null ? ` · ${l.daysOnMarket} ${l.daysOnMarket === 1 ? "day" : "days"} on market` : ""}
                </p>
              </div>
              <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg tabular-nums" style={{ color: "var(--ink)" }}>
                {[
                  l.beds != null ? <><BedDouble size={17} aria-hidden /><strong>{l.beds}</strong> bd</> : null,
                  l.baths != null ? <><Bath size={17} aria-hidden /><strong>{l.baths}</strong> ba</> : null,
                  l.livingSqft != null ? <><Ruler size={17} aria-hidden /><strong>{l.livingSqft.toLocaleString()}</strong> sqft</> : null,
                  l.lotSqft > 0 ? <><Trees size={17} aria-hidden /><strong>{l.lotSqft.toLocaleString()}</strong> sqft lot</> : null,
                ].filter(Boolean).map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="mr-1.5" style={{ color: "var(--line-strong)" }} aria-hidden>|</span>}
                    {item}
                  </li>
                ))}
              </ul>
              <h1 className="mt-3 text-xl font-semibold md:text-2xl" style={{ color: "var(--ink)" }}>{street(l.address)}, <span className="font-normal" style={{ color: "var(--slate)" }}>{l.address.split(",").slice(1).join(",").trim()}</span></h1>
            </header>

            {lot && site && (
              <section aria-labelledby="dadu-h">
                <h2 id="dadu-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>DADU potential</h2>
                <div className="pa-raised mt-3 grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
                  <LotSketch widthFt={widthFt} depthFt={depthFt} lotSqft={lot.lotSqft} alley={lot.alley} corner={lot.corner} layout={plan?.layout.kind ?? "single_rear"} daduSqft={sf || null} sideClearanceFt={lot.sideClearanceFt} street={titleCase(l.address.split(",")[0].replace(/^\d+[A-Z]?\s+/i, ""))} />
                  <DaduSnapshot site={site} daduSqft={sf} buildCost={sf ? constructionEstimate(sf) : null} layoutLabel={plan?.layout.kind === "none" ? null : plan?.layout.label ?? null} />
                </div>
                {lot.grade && lot.grade.slopePct >= GRADE_STEEP_PCT && (
                  <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: lot.grade.slopePct >= GRADE_VERY_STEEP_PCT ? "var(--red-tint)" : "var(--amber-tint)", color: "var(--ink)" }}>
                    <strong>{lot.grade.slopePct >= GRADE_VERY_STEEP_PCT ? "Very steep site." : "Steep site."}</strong> {gradeNote(lot.grade)}
                  </p>
                )}
                {plan?.warning && <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>{plan.warning}</p>}
                {plan && (
                  <details className="pa-more mt-3 text-sm">
                    <summary className="cursor-pointer font-semibold" style={{ color: "var(--green)" }}>Layout, access and resale notes</summary>
                    <div className="mt-3 flex max-w-[68ch] flex-col gap-3" style={{ color: "var(--ink)" }}>
                      <p className="leading-relaxed">{plan.layout.why}</p>
                      <p className="leading-relaxed"><strong>Access.</strong> {plan.access.summary}</p>
                      <ul className="flex flex-col gap-1.5">
                        <li><strong>Sunlight and sightlines.</strong> {plan.livability.sunlight}</li>
                        <li><strong>Vehicle and parking.</strong> {plan.livability.vehicle}</li>
                        <li><strong>Yard space.</strong> {plan.livability.yard}</li>
                        <li><strong>Marketability: {plan.marketability.rating}.</strong> {plan.marketability.why}</li>
                        <li><strong>Height.</strong> {plan.height}</li>
                      </ul>
                      <div>
                        <p className="font-semibold">Before you buy</p>
                        <ol className="mt-1 list-decimal pl-5 leading-relaxed">{plan.nextSteps.map((n) => <li key={n}>{n}</li>)}</ol>
                      </div>
                      {adu && (
                        <div>
                          <p className="font-semibold">What ADUniverse shows for this lot</p>
                          <ul className="mt-1 list-disc pl-5">{adu.lines.map((line) => <li key={line}>{line}</li>)}</ul>
                        </div>
                      )}
                      <p className="text-xs" style={{ color: "var(--slate)" }}>Sources: the team&apos;s Seattle DADU guide applied to city lot data, and the city&apos;s ADUniverse layer{adu ? ` (${adu.vintage})` : ""}. Screening rules, not Seattle Municipal Code.</p>
                    </div>
                  </details>
                )}
              </section>
            )}

            <AssessmentCard mlsId={l.mlsId} />

            <section aria-labelledby="inv-h">
              <h2 id="inv-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>Investor view</h2>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  ["Price plus DADU", lot?.daduSqft ? usd(basis.allIn) : null, lot?.daduSqft ? `${usd(l.listPrice)} + ${usd(basis.buildCost)} build` : "No DADU size found"],
                  ["Per sf, house plus DADU", basis.allInPerTotalSf ? usd(basis.allInPerTotalSf) : null, basis.pricePerSf ? `${usd(basis.pricePerSf)} for the house alone` : ""],
                  ["Land share of value", basis.landSharePct != null ? `${basis.landSharePct}%` : null, basis.landSharePct != null && basis.landSharePct >= 70 ? "High: the house adds little" : "Of the assessed value"],
                  ["Price to assessed", basis.priceToAssessed ? `${basis.priceToAssessed.toFixed(2)}x` : null, values?.landAv != null && values?.bldgAv != null ? `Assessed ${usd(values.landAv + values.bldgAv)}` : "King County assessor"],
                ] as [string, string | null, string][]).filter(([, v]) => v != null).map(([k, v, note]) => (
                  <div key={k} className="pa-raised p-4">
                    <dt className="text-xs" style={{ color: "var(--slate)" }}>{k}</dt>
                    <dd className="pa-display mt-1 text-xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                    {note && <dd className="mt-0.5 text-xs" style={{ color: "var(--slate)" }}>{note}</dd>}
                  </div>
                ))}
              </dl>

              <div className="mt-4"><InvestorSnapshot price={l.listPrice} daduSqft={lot?.daduSqft ?? 0} buildCost={basis.buildCost} address={fullAddress} /></div>

              {risks.some((r) => r.level !== "ok") && (
                <ul className="mt-4 flex flex-col gap-2 text-sm" aria-label="Risks and flags">
                  {risks.filter((r) => r.level !== "ok").map((r, i) => (
                    <li key={i} className="flex gap-2.5 rounded-lg px-3 py-2" style={{ background: r.level === "stop" ? "var(--red-tint)" : "var(--amber-tint)", color: "var(--ink)" }}>
                      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: r.level === "stop" ? "var(--red)" : "#D9A441" }} />
                      <span><span className="sr-only">{r.level === "stop" ? "Deal breaker: " : "Check: "}</span>{r.text} <span className="text-xs" style={{ color: "var(--slate)" }}>({r.source})</span></span>
                    </li>
                  ))}
                </ul>
              )}

              <details className="pa-more mt-3 text-sm">
                <summary className="cursor-pointer font-semibold" style={{ color: "var(--green)" }}>All the numbers</summary>
                <h3 className="mt-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>What you pay</h3>
              <dl className="mt-1 grid grid-cols-1 gap-x-10 text-sm sm:grid-cols-2">
                {([
                  ["List price", usd(l.listPrice)],
                  ["Price per sq ft of house", basis.pricePerSf ? usd(basis.pricePerSf) : null],
                  ["Price per sq ft of lot", basis.pricePerLotSf ? usd(basis.pricePerLotSf) : null],
                  ["Assessed land value", values?.landAv != null ? usd(values.landAv) : null],
                  ["Assessed building value", values?.bldgAv != null ? usd(values.bldgAv) : null],
                  ["Land share of assessed value", basis.landSharePct != null ? `${basis.landSharePct}%` : null],
                  ["Price to assessed value", basis.priceToAssessed ? `${basis.priceToAssessed.toFixed(2)}x` : null],
                  ["Days on market", l.daysOnMarket != null ? String(l.daysOnMarket) : null],
                  ["HOA", l.hoaMonthly == null ? "None reported" : l.hoaMonthly > 0 ? `${usd(l.hoaMonthly)} per month` : "None"],
                ] as [string, string | null][]).filter(([, v]) => v != null).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b py-2.5" style={{ borderColor: "var(--hairline)" }}>
                    <dt style={{ color: "var(--slate)" }}>{k}</dt><dd className="text-right font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                  </div>
                ))}
              </dl>
                <h3 className="mt-5 text-sm font-semibold" style={{ color: "var(--ink)" }}>What the DADU costs</h3>
              {lot?.daduSqft ? (
                <dl className="mt-1 grid grid-cols-1 gap-x-10 text-sm sm:grid-cols-2">
                  {([
                    ["Largest DADU the lot allows", `${Math.round(lot.daduSqft).toLocaleString()} sf`],
                    ["Build estimate", `${usd(basis.buildCost)} (${usd(basis.buildCostPerSf)} per sf)`],
                    ["Price plus DADU build", usd(basis.allIn)],
                    ["Per sq ft, house plus DADU", basis.allInPerTotalSf ? usd(basis.allInPerTotalSf) : null],
                  ] as [string, string | null][]).filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b py-2.5" style={{ borderColor: "var(--hairline)" }}>
                      <dt style={{ color: "var(--slate)" }}>{k}</dt><dd className="text-right font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>The engine found no DADU size for this lot, so there is no build estimate.</p>}
                <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>{COST_LABEL}. No soft costs, permits, financing or site work. Rent comps, sale comps and past DADU sales need the live listings feed.</p>
              </details>
            </section>

            {d.description && (
              <section aria-labelledby="desc-h">
                <h2 id="desc-h" className="pa-display text-xl" style={{ color: "var(--ink)" }}>About this home</h2>
                <p className="mt-3 max-w-[68ch] text-base leading-relaxed" style={{ color: "var(--ink)" }}>{d.description}</p>
              </section>
            )}

            <section aria-labelledby="facts-h">
              <h2 id="facts-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>Home facts</h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-10 gap-y-0 text-sm sm:grid-cols-2">
                {([
                  ["Type", d.propertyType ?? l.propertyType],
                  ["Year built", l.yearBuilt],
                  ["Living area", l.livingSqft ? `${l.livingSqft.toLocaleString()} sf` : null],
                  ["Lot size", l.lotSqft ? `${l.lotSqft.toLocaleString()} sf` : null],
                  ["Price per sf", l.livingSqft ? usd(l.listPrice / l.livingSqft) : null],
                  ["HOA", l.hoaMonthly == null ? "None reported" : l.hoaMonthly > 0 ? `${usd(l.hoaMonthly)} per month` : "None"],
                  ["Zoning", lot?.zoning],
                  ["Parking", d.garage],
                  ["Redfin estimate", d.estimate ? usd(d.estimate) : null],
                ] as [string, string | number | null | undefined][]).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b py-2.5" style={{ borderColor: "var(--hairline)" }}>
                    <dt style={{ color: "var(--slate)" }}>{k}</dt>
                    <dd className="text-right font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {d.priceHistory.length > 0 && (
              <section aria-labelledby="ph-h">
                <h2 id="ph-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>Price history</h2>
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-left" style={{ color: "var(--slate)" }}><th className="py-2 font-medium">Date</th><th className="font-medium">Event</th><th className="text-right font-medium">Price</th></tr></thead>
                  <tbody>
                    {d.priceHistory.map((h, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--hairline)" }}>
                        <td className="py-2.5 tabular-nums">{h.date}</td><td>{h.event}</td><td className="text-right font-semibold tabular-nums">{h.price ? usd(h.price) : "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {d.taxHistory.length > 0 && (
              <section aria-labelledby="tax-h">
                <h2 id="tax-h" className="pa-display text-xl" style={{ color: "var(--ink)" }}>Property taxes</h2>
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-left" style={{ color: "var(--slate)" }}><th className="py-2 font-medium">Year</th><th className="text-right font-medium">Tax paid</th><th className="text-right font-medium">Assessed value</th></tr></thead>
                  <tbody>
                    {d.taxHistory.slice(0, 5).map((t) => (
                      <tr key={t.year} className="border-t" style={{ borderColor: "var(--hairline)" }}>
                        <td className="py-2.5 tabular-nums">{t.year}</td><td className="text-right tabular-nums">{t.tax ? usd(t.tax) : "n/a"}</td><td className="text-right tabular-nums">{t.assessed ? usd(t.assessed) : "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {(d.scores.walk != null || d.scores.transit != null || d.scores.bike != null) && (
              <section aria-labelledby="sc-h">
                <h2 id="sc-h" className="pa-display text-xl" style={{ color: "var(--ink)" }}>Getting around</h2>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {([["Walk", d.scores.walk], ["Transit", d.scores.transit], ["Bike", d.scores.bike]] as const).filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k} className="pa-raised p-4">
                      <p className="pa-display text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</p>
                      <p className="text-sm" style={{ color: "var(--slate)" }}>{k} score</p>
                      <div className="mt-2 h-1.5 rounded-full" style={{ background: "var(--green-tint)" }}><div className="h-full rounded-full" style={{ width: `${v}%`, background: "var(--green)" }} /></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {d.schools.length > 0 && (
              <section aria-labelledby="sch-h">
                <h2 id="sch-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>Nearby schools</h2>
                <ul className="mt-3 flex flex-col">
                  {d.schools.slice(0, 5).map((s) => (
                    <li key={s.name} className="flex items-center gap-4 border-t py-3" style={{ borderColor: "var(--hairline)" }}>
                      <span className="pa-display flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg tabular-nums" style={{ background: "var(--green-tint)", color: "#145A40" }} aria-label={s.rating ? `Rated ${s.rating} out of 10` : "Not rated"}>{s.rating ?? "–"}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{s.name}</span><span className="text-xs" style={{ color: "var(--slate)" }}>{[s.level, s.distance].filter(Boolean).join(", ")}</span></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sticky side card */}
          <aside className="lg:sticky lg:top-[132px] lg:self-start" aria-label="Costs and actions">
            <div className="pa-raised p-5">
              <p className="text-sm" style={{ color: "var(--slate)" }}>Estimated monthly</p>
              <p className="pa-display text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{usd(pay.total)}</p>
              <dl className="mt-3 text-sm tabular-nums">
                {[["Principal and interest", pay.pi], ["Property tax", pay.tax], ...(l.hoaMonthly ? [["HOA", l.hoaMonthly] as [string, number]] : [])].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-t py-2" style={{ borderColor: "var(--hairline)" }}><dt style={{ color: "var(--slate)" }}>{k}</dt><dd className="font-semibold">{usd(Number(v))}</dd></div>
                ))}
              </dl>
              <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>20% down, 30-year fixed at 6.25%, tax at 0.92% of price. A rough guide, not a quote.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href={`/feasibility?address=${encodeURIComponent(fullAddress)}`} className="pa-btn pa-btn-primary w-full no-underline">Open the full report <ArrowRight size={15} aria-hidden /></Link>
                <Link href={calculatorHref({ sf, address: fullAddress })} className="pa-btn w-full no-underline"><Calculator size={15} aria-hidden /> Estimate your return</Link>
                {(() => {
                  const rf = redfinLink(l.address, l.listingUrl);
                  return <a href={rf.href} target="_blank" rel="noopener noreferrer" className="pa-btn w-full no-underline">{rf.direct ? "View on Redfin" : "Find on Redfin"} <ExternalLink size={14} aria-hidden /></a>;
                })()}
              </div>
              {(d.agent || d.brokerage) && <p className="mt-4 text-xs" style={{ color: "var(--slate)" }}>Listed by {[d.agent, d.brokerage].filter(Boolean).join(", ")}</p>}
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
