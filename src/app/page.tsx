import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Check, Compass, LayoutTemplate, PencilRuler, ShieldCheck, Timer, Users } from "lucide-react";
import { Section, Container, Heading, Lede } from "@/components/ui";
import { AddressForm, Term, TrackedLink } from "@/components/home/HomeBits";
import Faq, { type FaqItem } from "@/components/home/Faq";
import Journey, { ART, type JourneyStep } from "@/components/site/Journey";
import rendering from "../../public/home/dadu-rendering.webp";
import { PRODUCTS, PRODUCT_ORDER, price, type ProductKind } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pencil — Seattle DADU feasibility, plans, and permits",
  description:
    "See exactly what you can build on your Seattle lot in 30 seconds. Then get real plans, drawn by real architects, in under a week. Pre-approved plans, custom designs and permit service.",
};

/*
 * Copy is the product brief's, verbatim. Design follows Pencil's brand (pencil-design) with impeccable and
 * ui-ux-pro-max rules: one primary action per section, the popular tier highlighted, real prices, no stat strips.
 *
 * PLACEHOLDER: the hero image slot asks for an isometric Seattle craftsman with a modern 2-story DADU at the rear
 * and alley access. The current rendering (front access) fills the slot until that image exists: replace
 * public/home/dadu-rendering.webp (same name) or HERO_IMAGE below, and update its alt text.
 */
const HERO_IMAGE = { src: rendering, alt: "A Seattle craftsman house with a modern two-story DADU (backyard cottage) at the rear of the lot." };

const PATHS = [
  { Icon: Compass, title: "Not sure yet?", body: "Find out if your lot qualifies, how big you can build, and where it fits. Answers in seconds.", cta: "Check feasibility", href: "/feasibility", path: "feasibility" },
  { Icon: LayoutTemplate, title: "Want a proven design?", body: "Choose from plans already reviewed by the City of Seattle. The fastest path from idea to permit.", cta: "Browse plans", href: "/plans", path: "plans" },
  { Icon: PencilRuler, title: "Have a layout in mind?", body: "Sketch your footprint right on your lot. We check it against code live, then our architects make it real.", cta: "Draw my DADU", href: "/custom", path: "custom" },
] as const;

const STEPS: JourneyStep[] = [
  { Art: ART.Feasibility, title: "Check your lot", body: "Enter your address. See your buildable envelope, height limit, and setbacks instantly." },
  { Art: ART.Paths, title: "Pick your path", body: "A city-reviewed plan, or a custom design shaped to your lot." },
  { Art: ART.Plans, title: "Get your plans", body: "AI drafts the layout. Licensed architects refine every line." },
  { Art: ART.Permit, title: "Get permitted", body: "We submit to SDCI and handle the corrections, so you don't have to." },
];

const PRICE_HREF: Record<ProductKind, string> = {
  feasibility_instant: "/feasibility",
  feasibility_reviewed: "/feasibility?tier=reviewed",
  custom_plan: "/custom",
  permit: "/permit",
};

const WHY = [
  { Icon: ShieldCheck, title: "Code first.", body: "Every result is checked against current Seattle DADU rules before you see it." },
  { Icon: Timer, title: "Days, not months.", body: "Feasibility in seconds, plans in under a week. Traditional design takes weeks just to start." },
  { Icon: Users, title: "Humans in the loop.", body: "AI does the heavy lifting. Licensed architects make the calls." },
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
            <p className="hm-eyebrow">Seattle <Term word="DADU" /> feasibility, plans, and permits</p>
            <Heading level={1} id="hm-h1">Your backyard is worth more than you think.</Heading>
            <Lede style={{ marginTop: 18 }}>See exactly what you can build on your lot in 30 seconds. Then get real plans, drawn by real architects, in under a week.</Lede>
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

      {/* Path selector */}
      <Section style={{ paddingBlock: "clamp(1rem, 3vw, 2rem) clamp(3rem, 6vw, 5rem)" }}>
        <Container>
          <h2 className="sr-only">Pick where to start</h2>
          <ul className="hm-paths">
            {PATHS.map(({ Icon, title, body, cta, href, path }) => (
              <li key={title}>
                <TrackedLink href={href} event="hero_cta_click" props={{ cta: "path_card", path }} className="hm-path">
                  <Icon size={22} aria-hidden className="hm-path-icon" />
                  <span className="hm-path-title">{title}</span>
                  <span className="hm-path-body">{body}</span>
                  <span className="hm-path-cta">{cta} <ArrowRight size={15} aria-hidden /></span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* How it works */}
      <section className="hm-band" aria-labelledby="hm-how">
        <Container>
          <Heading level={2} id="hm-how" style={{ maxWidth: "20ch" }}>From &ldquo;what if&rdquo; to permit in four steps</Heading>
          <div style={{ marginTop: 40 }}>
            <Journey tone="dark" steps={STEPS} label="From what if to permit in four steps" />
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-pricing">
        <Container>
          <Heading level={2} id="hm-pricing" style={{ maxWidth: "22ch" }}>Clear prices. No surprise invoices.</Heading>
          <Lede style={{ marginTop: 14 }}>Most architects charge $100 to $250 an hour just to tell you what&apos;s possible. We start at $200, flat.</Lede>
          <ul className="hm-prices">
            {PRODUCT_ORDER.map((k) => {
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
          </ul>
          <p className="hm-note">Pre-approved partner plans are priced by each design firm.</p>
        </Container>
      </Section>

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

      {/* Footer CTA */}
      <section className="hm-final" aria-labelledby="hm-final-h">
        <Container style={{ maxWidth: 860 }}>
          <Heading level={2} id="hm-final-h" style={{ maxWidth: "22ch" }}>Thirty seconds could change what your property is worth.</Heading>
          <div style={{ marginTop: 24 }}>
            <AddressForm source="footer_cta" label="Your Seattle address" size="xl" />
          </div>
        </Container>
      </section>
    </main>
  );
}
