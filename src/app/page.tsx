import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Check, ShieldCheck, Timer, Users } from "lucide-react";
import { Section, Container, Heading, Lede } from "@/components/ui";
import { AddressForm, Term, TrackedLink } from "@/components/home/HomeBits";
import Faq, { type FaqItem } from "@/components/home/Faq";
import ProjectTimeline from "@/components/home/ProjectTimeline";
import InvestTeaser from "@/components/home/InvestTeaser";
import CaseStudyFeature from "@/components/home/CaseStudyFeature";
import rendering from "../../public/home/dadu-rendering.webp";
import { CONSTRUCTION_PER_SQFT, PRODUCTS, price, type ProductKind } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pencil — Seattle DADU feasibility, plans, and permits",
  description:
    "See exactly what you can build on your Seattle lot in 30 seconds. Then get permit-ready plans, and we'll see them through to your permit. Pre-approved plans, custom designs and permit service.",
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

const WHY = [
  { Icon: ShieldCheck, title: "Code first.", body: "Every result is checked against current Seattle DADU rules before you see it." },
  { Icon: Timer, title: "Answers in seconds.", body: "Feasibility in seconds, so you know what fits before you spend a dollar on design." },
  { Icon: Users, title: "Humans in the loop.", body: "AI does the heavy lifting. Licensed architects and designers, real people, make the calls." },
];

const FAQ: FaqItem[] = [
  { q: "How big can a Seattle DADU be?", a: "Up to 1,000 square feet in most cases, with height limits tied to your lot size. Your feasibility report shows your exact numbers." },
  { q: "Do I need off-street parking?", a: "No. Seattle doesn't require parking for a DADU." },
  { q: "Pre-approved or custom: which is right for me?", a: "Pre-approved plans are faster and already city-reviewed. Custom plans fit unusual lots or specific layouts. Not sure? Start with feasibility; it will tell you." },
  { q: "How long does permitting take?", a: "It depends on SDCI's queue and your plan type. Pre-approved plans typically move fastest. We track every step for you." },
  { q: "Is the feasibility report a professional certification?", a: "No. It's a detailed data report based on Seattle's public zoning and code rules. Want expert eyes on it? Choose Architect-Reviewed." },
];

export default function Home() {
  return (
    <main>
      {/* Hero: one action (the address), two quiet alternatives. */}
      <section className="hm-hero" aria-labelledby="hm-h1">
        <div className="hm-hero-inner">
          <div className="hm-hero-copy">
            <Heading level={1} id="hm-h1">Got DADU issues? We&apos;ll work through them together.</Heading>
            <Lede style={{ marginTop: 18 }}>Not sure where to start? That&apos;s okay. We&apos;ll help you find the right property, show you what it can hold, design the DADU, and stay by your side through permit and build. You&apos;ll never have to figure it out alone.</Lede>
            <div style={{ marginTop: 26 }}>
              <AddressForm source="hero" label="Your Seattle address" />
            </div>
            <p className="hm-trust"><Check size={15} aria-hidden /> Built on current Seattle code. No signup to start.</p>
          </div>
          <figure className="hm-hero-art">
            <Image src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} priority sizes="(min-width: 960px) 52vw, 100vw" placeholder="blur" />
          </figure>
        </div>
      </section>

      {/* How it works */}
      <section className="hm-band" aria-labelledby="hm-how">
        <Container>
          <div className="hm-how-head">
            <Heading level={2} id="hm-how" className="hm-how-h">From buying the lot to the final inspection</Heading>
            <p className="hm-how-lede">About a year, start to finish. One team runs every stage of your DADU; hire us for all of it, or only the parts you need.</p>
          </div>
          <ProjectTimeline />
          <p className="cf-band-note">Builders we refer may pay Pencil a referral fee. We tell you before you choose one.</p>
        </Container>
      </section>

      {/* Case study: proof, with real numbers */}
      <CaseStudyFeature />

      {/* Today's best opportunities, from the Invest feed */}
      <InvestTeaser />

      {/* Why Pencil */}
      <Section soft style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-why">
        <Container>
          <Heading level={2} id="hm-why" style={{ maxWidth: "20ch" }}>Built for Seattle. Built for speed.</Heading>
          <ul className="hm-why">
            {WHY.map(({ Icon, title, body }) => (
              <li key={title}>
                <Icon size={24} aria-hidden className="hm-why-icon" />
                <p><strong>{title}</strong> {body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* FAQ */}
      <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-faq">
        <Container style={{ maxWidth: 820 }}>
          <Heading level={2} id="hm-faq">Questions, answered</Heading>
          <div style={{ marginTop: 24 }}>
            <Faq items={FAQ} />
          </div>
        </Container>
      </Section>

      {/* Pricing */}
      <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-pricing">
        <Container>
          <Heading level={2} id="hm-pricing" style={{ maxWidth: "22ch" }}>Clear prices. No surprise invoices.</Heading>
          <Lede style={{ marginTop: 14 }}>Most architects charge $100 to $250 an hour just to tell you what&apos;s possible. We start at $200, flat.</Lede>
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
    </main>
  );
}
