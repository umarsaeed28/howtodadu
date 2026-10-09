import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { getInvestAssumptions, getOpportunity } from "@/lib/server/invest";
import { updatedLabel, watchedIds } from "@/lib/server/invest-view";
import { planSite } from "@/lib/dadu-site-plan";
import { daduRules } from "@/components/deal-screening/dadu-rules";
import { PRODUCTS, price } from "@/lib/pricing";
import LotSketch from "@/components/listing/LotSketch";
import UnderwritingPanel from "@/components/invest/UnderwritingPanel";
import AgentContact from "@/components/invest/AgentContact";
import WatchButton from "@/components/invest/WatchButton";
import PhotoGallery from "@/components/invest/PhotoGallery";
import { zillowUrl } from "@/lib/property-image";
import InvestCompliance from "@/components/invest/InvestCompliance";
import { TrackedLink } from "@/components/home/HomeBits";
import { sourceLabel, usd } from "@/components/invest/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const found = await getOpportunity(decodeURIComponent(id)).catch(() => null);
  return { title: found ? `${found.opportunity.street}: DADU investment analysis — Pencil` : "Opportunity — Pencil" };
}

/** One opportunity: the listing, what the lot can hold, the underwriting with every assumption open, and next steps. */
export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [found, { assumptions }, watch] = await Promise.all([getOpportunity(decodeURIComponent(id)), getInvestAssumptions(), watchedIds()]);
  if (!found) notFound();
  const { opportunity: o, feed } = found;
  const plan = planSite({ lotSqft: o.lotSqft, widthFt: o.lotWidth, depthFt: o.lotDepth, alley: o.alley });
  const rules = daduRules("NR", o.lotSqft);
  const facts = [o.beds != null ? `${o.beds} bd` : null, o.baths != null ? `${o.baths} ba` : null, o.sqft ? `${o.sqft.toLocaleString("en-US")} sqft` : null, `${o.lotSqft.toLocaleString("en-US")} sf lot`].filter(Boolean);
  const stories = o.daduSqft >= 500 ? 2 : 1;
  const source = sourceLabel(feed.source);

  return (
    <main className="pencil-app">
      <div className="iv-page">
        <Link href="/search" className="iv-back"><ArrowLeft size={15} aria-hidden /> Back to the map</Link>

        <section className="iv-hero" aria-labelledby="iv-h1">
          <PhotoGallery photos={o.photos?.length ? o.photos : o.photo ? [o.photo] : []} alt={`${o.street}, Seattle`} zillowHref={zillowUrl(`${o.street}, Seattle, WA ${o.zip}`)} />
          <div className="iv-hero-text">
            {(o.topPick || o.newToday || o.pending) && (
              <p className="iv-badges iv-badges--inline">
                {o.topPick && <span className="iv-badge iv-badge--pick"><Star size={11} aria-hidden fill="currentColor" /> Top pick</span>}
                {o.pending && <span className="iv-badge iv-badge--pending">Pending</span>}
                {o.newToday && <span className="iv-badge">New today</span>}
              </p>
            )}
            <p className="pa-display iv-hero-price">{usd(o.price)}</p>
            <p className="iv-hero-facts">{facts.join(" | ")}</p>
            <h1 id="iv-h1" className="iv-hero-addr">{o.street}, Seattle, WA {o.zip}</h1>
            <p className="iv-hero-area">{o.area}</p>
            <p className="iv-attrib">{o.brokerage ? `Listing courtesy of ${o.brokerage}.` : `Listing data: ${source}. The feed does not name the listing brokerage.`} {updatedLabel(feed.generatedAt)}.</p>
            <p className="iv-insight iv-insight--hero">{o.insight}</p>
            <div className="iv-ctas">
              <WatchButton listingId={o.id} signedIn={watch.signedIn} watched={watch.ids.includes(o.id)} />
              <TrackedLink href={`/feasibility?parcel=${o.pin}&tier=instant`} event="feasibility_from_invest" props={{ listing_id: o.id, tier: "instant" }} className="pa-btn pa-btn-primary">
                Get the feasibility report ({price(PRODUCTS.feasibility_instant.amountCents)}) <ArrowRight size={15} aria-hidden />
              </TrackedLink>
              <a href="#iv-agent" className="pa-btn">Talk to an agent</a>
            </div>
            <p className="iv-review">
              Want a second set of eyes? <TrackedLink href={`/feasibility?parcel=${o.pin}&tier=reviewed`} event="feasibility_from_invest" props={{ listing_id: o.id, tier: "reviewed" }}>Have it reviewed and validated by an architectural designer</TrackedLink> ({price(PRODUCTS.feasibility_reviewed.amountCents)}, report included).
            </p>
          </div>
        </section>

        <section className="iv-card" aria-labelledby="iv-build-h">
          <h2 id="iv-build-h" className="iv-h2">What you could build here</h2>
          <div className="iv-build">
            <div className="iv-build-sketch">
              <LotSketch widthFt={o.lotWidth} depthFt={o.lotDepth} lotSqft={o.lotSqft} alley={o.alley} corner={o.corner} layout={plan.layout.kind} daduSqft={o.daduSqft || null} sideClearanceFt={o.sideClearanceFt} street={o.street} />
              <p className="iv-note">Schematic: the largest DADU the lot allows, placed by the layout rules. Not a survey or a design.</p>
            </div>
            <dl className="iv-facts">
              <div><dt>Maximum DADU</dt><dd>{o.daduSqft.toLocaleString("en-US")} sf of floor area</dd></div>
              <div><dt>Stories</dt><dd>{stories === 2 ? "Two stories fit" : "One story"}</dd></div>
              {rules.filter((r) => r.item !== "DADU size").map((r) => <div key={r.item}><dt>{r.item}</dt><dd>{r.value} <span className="iv-ref">{r.ref}</span></dd></div>)}
              <div><dt>Side and rear setbacks</dt><dd>Sides 5 ft on average (3 ft minimum); rear {o.alley ? "0 ft on the alley" : "5 ft for the DADU"} <span className="iv-ref">SMC 23.44.090</span></dd></div>
              <div><dt>Parking</dt><dd>Not required for a DADU <span className="iv-ref">SMC 23.42.022.I</span></dd></div>
              <div><dt>Layout</dt><dd>{plan.layout.label}</dd></div>
            </dl>
          </div>
          <p className="iv-links">
            <Link href={`/feasibility?parcel=${o.pin}`}>Open the full feasibility report</Link>
            <Link href={`/plans?parcel=${o.pin}`}>Browse plans that fit</Link>
          </p>
        </section>

        <section className="iv-card" aria-labelledby="iv-uw-h">
          <h2 id="iv-uw-h" className="iv-h2">The numbers</h2>
          <p className="iv-note">Drag the assumptions to match your plan. The cash required updates as you go.</p>
          <UnderwritingPanel listingId={o.id} price={o.price} daduSqft={o.daduSqft} houseSqft={o.sqft} initial={assumptions} />
        </section>

        <section id="iv-agent" className="iv-card">
          <AgentContact listingId={o.id} street={o.street} />
        </section>

        <InvestCompliance source={source} />
      </div>
    </main>
  );
}
