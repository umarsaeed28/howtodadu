import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Bath, BedDouble, Calculator, ExternalLink, FlaskConical, Ruler, Trees } from "lucide-react";
import { getListingsProvider, listingsProviderName, type RawListing } from "@/lib/listings";
import { getDetail } from "@/lib/listings/redfin";
import type { ListingDetail } from "@/lib/listings/provider";
import { findLotForListing, libraryAvailable } from "@/lib/server/lot-library-store";
import { COST_LABEL, COST_PER_SF, constructionEstimate } from "@/lib/config/costs";
import { calculatorHref } from "@/lib/calculator/inputs";
import AssessmentCard from "@/components/listing/AssessmentCard";
import { getAduniverseFacts, getParcelValues } from "@/lib/server/aduniverse";
import { planSite } from "@/lib/dadu-site-plan";
import { computeBasis } from "@/lib/investor";
import InvestorSnapshot from "@/components/listing/InvestorSnapshot";
import ListingPhoto from "@/components/listing/ListingPhoto";

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

const GRADES = [
  { label: "Marginal", note: "Score under 70: a DADU fits, but the site is hard.", color: "#8A8574" },
  { label: "Fair", note: "Score 70 to 81: tight access, a narrow lot or a smaller DADU.", color: "#9A6F12" },
  { label: "Good", note: "Score 82 to 92.", color: "#2E7D55" },
  { label: "Top pick", note: "Score 93 and up: alley or corner access, a layout that fits and a full-size DADU.", color: "#145A40" },
];
const gradeOf = (tier: number) => GRADES[Math.min(Math.max(tier, 0), 3)];

function riskFlags(i: { hoa?: number; plan: ReturnType<typeof planSite> | null; adu: Awaited<ReturnType<typeof getAduniverseFacts>>; canopyPct: number | null; zoning: string }): { text: string; source: string; level: "stop" | "watch" | "ok" }[] {
  const out: { text: string; source: string; level: "stop" | "watch" | "ok" }[] = [];
  if (i.hoa == null) out.push({ text: "HOA not reported. An HOA rules a property out, so confirm there is none.", source: "Listing feed", level: "watch" });
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
  const grade = gradeOf(lot?.tier ?? 0);
  const fullAddress = l.address;

  return (
    <div className="pencil-app">
      <article className="mx-auto max-w-[1180px] px-4 pb-16 pt-5 md:px-6">
        <Link href={`/?zip=${l.zip}`} className="pa-btn pa-btn-sm no-underline">
          <ArrowLeft size={14} aria-hidden /> Back to the map
        </Link>

        {/* Gallery: one large photo and four small, like a listing portal. Falls back to the lot from above. */}
        <div className="mt-4 grid gap-2 overflow-hidden rounded-2xl md:h-[440px] md:grid-cols-4 md:grid-rows-2">
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

        <nav aria-label="Listing sections" className="sticky top-[var(--nav-h,64px)] z-20 -mx-4 mt-4 border-b px-4 md:-mx-6 md:px-6" style={{ background: "var(--paper)", borderColor: "var(--hairline)" }}>
          <ul className="pa-scroll flex gap-1 overflow-x-auto py-1">
            {([["overview", "Overview"], ...(lot ? [["dadu-h", "DADU potential"]] : []), ...(plan && lot ? [["plan-h", "Site plan"]] : []), ["inv-h", "Investor view"], ["facts-h", "Home facts"], ...(d.priceHistory.length ? [["ph-h", "Price history"]] : []), ...(d.schools.length ? [["sch-h", "Schools"]] : [])] as [string, string][]).map(([id, label]) => (
              <li key={id} className="shrink-0"><a href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline hover:bg-[var(--green-tint)]" style={{ color: "var(--ink)" }}>{label}</a></li>
            ))}
          </ul>
        </nav>

        <div id="overview" className="mt-6 grid scroll-mt-32 gap-8 lg:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-8">
            <header>
              {isTest && (
                <p className="mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
                  <FlaskConical size={13} aria-hidden /> Sample data, not a live listing
                </p>
              )}
              {/* Price first, then the facts line, then the address: the order a home buyer scans in. */}
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="pa-display leading-none tabular-nums" style={{ color: "var(--ink)", fontSize: "clamp(36px, 5vw, 48px)" }}>{usd(l.listPrice)}</p>
                <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--green)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--green)" }} aria-hidden />
                  {titleCase(l.status.replace(/_/g, " "))}{l.daysOnMarket != null ? ` · ${l.daysOnMarket} ${l.daysOnMarket === 1 ? "day" : "days"} on market` : ""}
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
              {lot && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: "var(--green-tint)", color: "var(--green-bright)" }}>
                  <span className="pa-display flex h-7 w-7 items-center justify-center rounded-full text-xs text-white" style={{ background: grade.color }}>{lot.score}</span>
                  {grade.label} DADU lot{sf ? ` · up to ${sf.toLocaleString()} sf cottage` : ""}
                </p>
              )}
            </header>

            {lot && (
              <section aria-labelledby="dadu-h">
                <h2 id="dadu-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>DADU potential</h2>
                <div className="pa-raised mt-3 grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className="pa-display flex h-20 w-20 items-center justify-center rounded-full text-3xl tabular-nums" style={{ background: "var(--card)", boxShadow: "var(--shadow-pop)", color: grade.color }} aria-label={`Site score ${lot.score} out of 100`}>
                    {lot.score}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: grade.color }}>
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: grade.color }} /> {grade.label}: this property can have a DADU
                    </p>
                    <p className="mt-2 text-sm" style={{ color: "var(--slate)" }}>Largest DADU this lot allows</p>
                    <p className="pa-display text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{sf ? `${sf.toLocaleString()} sf` : "n/a"}</p>
                    {sf > 0 && <p className="mt-1 text-sm tabular-nums" style={{ color: "var(--slate)" }}>About {usd(constructionEstimate(sf))} to build at {usd(COST_PER_SF)} per sf. {COST_LABEL}.</p>}
                    <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      {lot.corner && <span className="rounded-md px-2.5 py-1" style={{ background: "rgba(23,36,29,.08)" }}>Corner lot</span>}
                      {lot.alley && <span className="rounded-md px-2.5 py-1" style={{ background: "rgba(46,92,110,.12)", color: "#2E5C6E" }}>Alley</span>}
                      <span className="rounded-md px-2.5 py-1" style={{ background: "rgba(23,36,29,.08)" }}>{lot.adusNearby} ADUs nearby</span>
                    </p>
                    <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>{grade.note}</p>
                  </div>
                </div>
                {adu && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>What ADUniverse shows for this lot</h3>
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
                      {adu.lines.map((line) => (
                        <li key={line} className="flex gap-2"><span aria-hidden style={{ color: "var(--green)" }}>•</span><span>{line}</span></li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>Source: the city of Seattle&apos;s ADUniverse feasibility layer, {adu.vintage} data. It can be out of date, so confirm with the city before you design.</p>
                  </div>
                )}
              </section>
            )}

            {plan && lot && (
              <section aria-labelledby="plan-h">
                <h2 id="plan-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>Site plan and layout</h2>
                <dl className="mt-3 grid grid-cols-1 gap-x-10 text-sm sm:grid-cols-2">
                  {([
                    ["Lot area", `${plan.area.sqft.toLocaleString()} sf, ${plan.area.pass ? "meets" : "under"} the ${plan.area.min.toLocaleString()} sf minimum`],
                    ["Lot shape", plan.dimensions.known ? `${plan.dimensions.widthFt} ft wide by ${plan.dimensions.depthFt} ft deep` : "Not known"],
                    ["Alley", plan.alley === "yes" ? "Yes" : plan.alley === "no" ? "No" : "Unknown"],
                    ["Best layout", plan.layout.label],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b py-2.5" style={{ borderColor: "var(--hairline)" }}>
                      <dt style={{ color: "var(--slate)" }}>{k}</dt><dd className="text-right font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 max-w-[68ch] text-base leading-relaxed" style={{ color: "var(--ink)" }}>{plan.layout.why}</p>
                {plan.warning && <p className="mt-3 max-w-[68ch] rounded-lg px-3 py-2 text-sm" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>{plan.warning}</p>}
                <h3 className="mt-5 text-sm font-semibold" style={{ color: "var(--ink)" }}>Access</h3>
                <p className="mt-1 max-w-[68ch] text-sm leading-relaxed" style={{ color: "var(--ink)" }}>{plan.access.summary}</p>
                <h3 className="mt-5 text-sm font-semibold" style={{ color: "var(--ink)" }}>Livability and resale</h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
                  <li><strong>Sunlight and sightlines.</strong> {plan.livability.sunlight}</li>
                  <li><strong>Vehicle and parking.</strong> {plan.livability.vehicle}</li>
                  <li><strong>Yard space.</strong> {plan.livability.yard}</li>
                  <li><strong>Marketability: {plan.marketability.rating}.</strong> {plan.marketability.why}</li>
                  <li><strong>Height.</strong> {plan.height}</li>
                </ul>
                <h3 className="mt-5 text-sm font-semibold" style={{ color: "var(--ink)" }}>Before you buy</h3>
                <ol className="mt-2 list-decimal pl-5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>{plan.nextSteps.map((n) => <li key={n}>{n}</li>)}</ol>
                <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>Source: the team&apos;s Seattle DADU guide, applied to the city&apos;s lot size, shape and alley data. Screening rules, not Seattle Municipal Code.</p>
              </section>
            )}

            <section aria-labelledby="inv-h">
              <h2 id="inv-h" className="pa-display scroll-mt-[130px] text-xl" style={{ color: "var(--ink)" }}>Investor view</h2>
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
                  ["HOA", l.hoaMonthly == null ? "Not reported" : l.hoaMonthly > 0 ? `${usd(l.hoaMonthly)} per month` : "None"],
                ] as [string, string | null][]).filter(([, v]) => v != null).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b py-2.5" style={{ borderColor: "var(--hairline)" }}>
                    <dt style={{ color: "var(--slate)" }}>{k}</dt><dd className="text-right font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                  </div>
                ))}
              </dl>
              {basis.landSharePct != null && basis.landSharePct >= 70 && <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>Land is {basis.landSharePct}% of the assessed value, so the house adds little to the assessment. That can point to a teardown or heavy remodel.</p>}

              <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--ink)" }}>What the DADU costs</h3>
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
              <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>{COST_LABEL}. No soft costs, permits, financing or site work. Add them in the full underwriting.</p>

              <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--ink)" }}>What it could earn</h3>
              <div className="mt-2"><InvestorSnapshot price={l.listPrice} daduSqft={lot?.daduSqft ?? 0} buildCost={basis.buildCost} address={fullAddress} /></div>

              {risks.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--ink)" }}>Risks and flags</h3>
                  <ul className="mt-2 flex flex-col gap-2 text-sm">
                    {risks.map((r, i) => (
                      <li key={i} className="flex gap-2.5" style={{ color: "var(--ink)" }}>
                        <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: r.level === "stop" ? "var(--red)" : r.level === "watch" ? "#D9A441" : "var(--green)" }} />
                        <span><span className="sr-only">{r.level === "stop" ? "Deal breaker: " : r.level === "watch" ? "Check: " : "Clear: "}</span>{r.text} <span className="text-xs" style={{ color: "var(--slate)" }}>({r.source})</span></span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-5 text-xs" style={{ color: "var(--slate)" }}>Not available yet: rent comps, sale comps and past DADU sale prices. They need the live listings feed. Until then, the rent above is yours to set.</p>
            </section>

            <AssessmentCard mlsId={l.mlsId} />

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
                  ["HOA", l.hoaMonthly == null ? "Not reported" : l.hoaMonthly > 0 ? `${usd(l.hoaMonthly)} per month` : "None"],
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
                {l.listingUrl && <a href={l.listingUrl} target="_blank" rel="noopener noreferrer" className="pa-btn w-full no-underline">View on Redfin <ExternalLink size={14} aria-hidden /></a>}
              </div>
              {(d.agent || d.brokerage) && <p className="mt-4 text-xs" style={{ color: "var(--slate)" }}>Listed by {[d.agent, d.brokerage].filter(Boolean).join(", ")}</p>}
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
