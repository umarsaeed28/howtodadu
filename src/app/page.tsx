import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, HardHat, PencilRuler, Search } from "lucide-react";
import { Section, Container, Heading, Lede } from "@/components/ui";
import { AddressForm, Term, TrackedLink } from "@/components/home/HomeBits";
import Faq, { type FaqItem } from "@/components/home/Faq";
import ProjectTimeline from "@/components/home/ProjectTimeline";
import InvestTeaser from "@/components/home/InvestTeaser";
import CaseStudyFeature from "@/components/home/CaseStudyFeature";
import rendering from "../../public/home/dadu-rendering.webp";
import { CONSTRUCTION_PER_SQFT, PRODUCTS, price, type ProductKind } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pencil — Seattle acquisition and design-build for DADUs and middle housing",
  description:
    "Pencil is a Seattle acquisition and design-build firm for DADUs and middle housing. We find the property, design what it can hold, get it permitted and build it.",
};

/*
 * Copy is the product brief's, verbatim. Design follows Pencil's brand (pencil-design) with impeccable and
 * ui-ux-pro-max rules: one primary action per section, the popular tier highlighted, real prices, no stat strips.
 *
 * PLACEHOLDER: the hero image slot asks for an isometric Seattle craftsman with a modern 2-story DADU at the rear
 * and alley access. The current rendering (front access) fills the slot until that image exists: replace
 * public/home/dadu-rendering.webp (same name) or HERO_IMAGE below, and update its alt text.
 */
const HERO_IMAGE = { src: rendering, alt: "A Seattle craftsman house with a modern two-story DADU at the rear of the lot." };

const PRICE_HREF: Record<ProductKind, string> = {
  feasibility_instant: "/feasibility",
  feasibility_reviewed: "/feasibility?tier=reviewed",
  custom_plan: "/feasibility",
  permit: "/contact",
};

/** The two reports get a card each; the custom plan and the permit service share one card as design, or design + permit. */
const REPORT_TIERS: ProductKind[] = ["feasibility_instant", "feasibility_reviewed"];
const PLAN = PRODUCTS.custom_plan;
const PERMIT = PRODUCTS.permit;

/**
 * What the firm does, in the order a project runs. Each column says what we do and where to start that stage.
 * Figures come from the app's own config (pricing.ts); the middle housing counts are Seattle's code, as on /company.
 */
const SERVICES = [
  {
    icon: Search,
    title: "Acquisition",
    body: "We search every Seattle listing for lots that can take a DADU or more homes, run the numbers on each, and help you buy the right one. Already own a lot? We start from yours.",
    href: "/search?top=1",
    cta: "See today's best lots",
  },
  {
    icon: PencilRuler,
    title: "Design and permit",
    body: "Our designers draw a custom plan for your lot, or adapt one of the city's pre-approved designs, then take it through SDCI to an issued permit.",
    href: "/plans",
    cta: "See our designs",
  },
  {
    icon: HardHat,
    title: "Construction",
    body: `Build with Pencil at $${CONSTRUCTION_PER_SQFT} per sq ft with the permit work included, or with a vetted builder from our network, bids side by side. We track it to final inspection.`,
    href: "/contact",
    cta: "Talk about your build",
  },
] as const;

const FAQ: FaqItem[] = [
  { q: "What does Pencil actually do?", a: "We're an acquisition and design-build firm for DADUs and middle housing in Seattle. We find the property, check what it can hold, design it, get the permit and build it. Hire us for every stage, or only the ones you need." },
  { q: "Do you only build DADUs?", a: "No. We also take on middle housing. Seattle now allows at least four homes on nearly every residential lot, and six near frequent transit. We help you buy a lot that suits it, design the homes and build them." },
  { q: "Do I need to own a lot already?", a: "No. Our search shows Seattle listings that can take a DADU, scored and priced out, and we can help you buy one. If you already own a lot, start with the feasibility report." },
  { q: "What does it cost?", a: `The feasibility report is ${price(PRODUCTS.feasibility_instant.amountCents)}, or ${price(PRODUCTS.feasibility_reviewed.amountCents)} reviewed and validated by an architectural designer. A custom DADU plan is ${price(PRODUCTS.custom_plan.amountCents)} and the permit service is ${price(PRODUCTS.permit.amountCents)}. Build with Pencil at $${CONSTRUCTION_PER_SQFT} per sq ft and we handle the permitting, so you only pay for the architecture.` },
  { q: "How long does a project take?", a: "About 10 months from contract to final inspection: a month to buy and check the lot, a month of design, typically two months of city review, then six months of construction. SDCI sets its own review time, so we never promise an approval date." },
  { q: "Who designs and builds it?", a: "Our designers draw your plans, or you pick one of the city's pre-approved designs. For the build, we bring vetted builders, put their bids side by side and track the work to final inspection. Builders we refer may pay Pencil a referral fee; we tell you before you choose one." },
  { q: "Is the feasibility report a professional certification?", a: "No. It's a detailed report built on Seattle's zoning and code data. For expert eyes on your lot, have it reviewed and validated by an architectural designer." },
];

export default function Home() {
  return (
    <main>
      {/* Hero: who we are in one line, one action (the address), one quiet alternative (the free consult). */}
      <section className="hm-hero" aria-labelledby="hm-h1">
        <div className="hm-hero-inner">
          <div className="hm-hero-copy">
            <Heading level={1} id="hm-h1">We find the lot, design it and build it.</Heading>
            <Lede style={{ marginTop: 18 }}>Pencil is a Seattle acquisition and design-build firm for DADUs and middle housing. One team, from the property search to the final inspection. Hire us for all of it, or only the part you need.</Lede>
            <div style={{ marginTop: 26 }}>
              <AddressForm source="hero" label="Your Seattle address" />
            </div>
            <div className="hm-hero-foot">
              <p className="hm-trust"><Check size={15} aria-hidden /> Checked against current Seattle code.</p>
              <TrackedLink href="/contact" event="hero_cta_click" props={{ cta: "free_consult" }} className="hm-quiet">
                Not sure yet? Book a free consult <ArrowRight size={14} aria-hidden />
              </TrackedLink>
            </div>
          </div>
          <figure className="hm-hero-art">
            <Image src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} priority sizes="(min-width: 960px) 52vw, 100vw" placeholder="blur" />
          </figure>
        </div>
      </section>

      {/* What we do: the three stages one firm runs, and what we build. */}
      <section className="hm-services" aria-labelledby="hm-services-h">
        <Container>
          <div className="hm-services-head">
            <Heading level={2} id="hm-services-h" className="hm-services-h">One firm, from acquisition to final inspection</Heading>
            <p className="hm-services-lede">Buying, design, permitting and construction usually means four firms and four contracts. With Pencil it&apos;s one team that knew the lot before you bought it.</p>
          </div>
          <ol className="hm-svc">
            {SERVICES.map((v, i) => (
              <li key={v.title} className="hm-svc-item">
                <span className="hm-svc-top">
                  <span className="hm-svc-icon" aria-hidden><v.icon size={20} /></span>
                  <span className="hm-svc-n" aria-hidden>0{i + 1}</span>
                </span>
                <h3 className="hm-svc-title">{v.title}</h3>
                <p className="hm-svc-body">{v.body}</p>
                <Link href={v.href} className="hm-quiet">{v.cta} <ArrowRight size={14} aria-hidden /></Link>
              </li>
            ))}
          </ol>
          <div className="hm-build">
            <h3 className="hm-build-h">What we build</h3>
            <dl className="hm-build-list">
              <div>
                <dt>DADUs</dt>
                <dd>A second, detached home in the backyard, to rent, to sell or for family.</dd>
              </div>
              <div>
                <dt>Middle housing</dt>
                <dd>At least four homes on nearly every Seattle residential lot, and six near frequent transit.</dd>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      {/* Case study: proof that the whole chain works, with real numbers */}
      <CaseStudyFeature />

      {/* How it works */}
      <section className="hm-band" aria-labelledby="hm-how">
        <Container>
          <div className="hm-how-head">
            <Heading level={2} id="hm-how" className="hm-how-h">About ten months, contract to final inspection</Heading>
            <p className="hm-how-lede">A typical DADU project with Pencil, stage by stage. Middle housing runs longer; we give you its schedule after the feasibility check.</p>
          </div>
          <ProjectTimeline />
          <p className="cf-band-note">Builders we refer may pay Pencil a referral fee. We tell you before you choose one.</p>
        </Container>
      </section>

      {/* Pricing */}
      <Section className="hm-surface" style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-pricing">
        <Container>
          <Heading level={2} id="hm-pricing" style={{ maxWidth: "22ch" }}>Clear prices. No surprise invoices.</Heading>
          <Lede style={{ marginTop: 14 }}>Every price below is the whole price. Start with the report; add design, permit and build when you&apos;re ready.</Lede>
          <ul className="hm-prices">
            {REPORT_TIERS.map((k) => {
              const p = PRODUCTS[k];
              return (
                <li key={k} className="hm-price" data-popular={p.popular || undefined}>
                  {p.popular && <span className="hm-badge">Most popular</span>}
                  <h3 className="hm-price-name">{p.name}</h3>
                  <p className="hm-price-amount">{price(p.amountCents)}</p>
                  <p className="hm-price-when">{p.turnaround}</p>
                  <p className="hm-price-body">
                    {k === "feasibility_instant" ? (<>Your lot&apos;s full DADU picture: <Term word="FAR" />, setbacks, height, lot coverage, and a site plan showing exactly where it fits.</>) : p.body}
                  </p>
                  <TrackedLink href={PRICE_HREF[k]} event="pricing_card_click" props={{ tier: k }} className={`s-btn ${p.popular ? "s-btn--primary" : "s-btn--outline"} hm-price-cta`}>
                    {p.cta}
                  </TrackedLink>
                </li>
              );
            })}
            <li className="hm-price hm-price--plan">
              <h3 className="hm-price-name">{PLAN.name}</h3>
              <p className="hm-price-body hm-price-body--lead">{PLAN.body}</p>
              <ul className="hm-options">
                <li className="hm-option">
                  <span className="hm-option-name">Design</span>
                  <span className="hm-option-amount">{price(PLAN.amountCents)}</span>
                  <span className="hm-option-when">{PLAN.turnaround}</span>
                </li>
                <li className="hm-option">
                  <span className="hm-option-name">Design + permit</span>
                  <span className="hm-option-amount">{price(PLAN.amountCents + PERMIT.amountCents)}</span>
                  <span className="hm-option-when">{PERMIT.turnaround}</span>
                </li>
                <li className="hm-option hm-option--build">
                  <span className="hm-option-name">Build with Pencil</span>
                  <span className="hm-option-amount">${CONSTRUCTION_PER_SQFT}/sq ft</span>
                  <span className="hm-option-when">Construction in Seattle. We take care of the permitting; you only pay for the architecture.</span>
                </li>
              </ul>
              <TrackedLink href={PRICE_HREF.custom_plan} event="pricing_card_click" props={{ tier: "custom_plan" }} className="s-btn s-btn--outline hm-price-cta">
                {PLAN.cta}
              </TrackedLink>
            </li>
          </ul>
          <div className="hm-note-row">
            <p className="hm-note">Pre-approved partner plans are priced by each design firm.</p>
            <TrackedLink href="/plans" event="pricing_card_click" props={{ tier: "preapproved" }} className="s-btn s-btn--outline">
              View pre-approved designs <ArrowRight size={15} aria-hidden />
            </TrackedLink>
          </div>
        </Container>
      </Section>
      {/* Today's best opportunities, from the Invest feed */}
      <InvestTeaser />

      {/* FAQ */}
      <Section className="hm-surface" style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-faq">
        <Container style={{ maxWidth: 820 }}>
          <Heading level={2} id="hm-faq">Questions, answered</Heading>
          <div style={{ marginTop: 24 }}>
            <Faq items={FAQ} />
          </div>
        </Container>
      </Section>

      {/* Closing action: the same address box, and the consult for anyone still unsure. */}
      <section className="hm-close" aria-labelledby="hm-close-h">
        <Container style={{ maxWidth: 820 }}>
          <Heading level={2} id="hm-close-h">Start with the lot.</Heading>
          <Lede style={{ marginTop: 14 }}>Enter an address you own or are looking at, and see what it can hold. Or tell us what you want to build; the consult is free.</Lede>
          <div style={{ marginTop: 24 }}>
            <AddressForm source="footer_cta" label="Your Seattle address" size="xl" />
          </div>
          <TrackedLink href="/contact" event="hero_cta_click" props={{ cta: "free_consult" }} className="hm-quiet hm-close-quiet">
            Book a free consult <ArrowRight size={14} aria-hidden />
          </TrackedLink>
        </Container>
      </section>
    </main>
  );
}
