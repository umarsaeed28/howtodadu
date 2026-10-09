import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Section, Container, Heading, Lede, Button } from "@/components/ui";
import HomeSearch from "@/components/search/HomeSearch";
import Journey from "@/components/site/Journey";
import Plat from "@/components/site/Plat";
import rendering from "../../public/home/dadu-rendering.webp";
import { COST_PER_SF } from "@/lib/config/costs";
import { SOFT_COSTS, salePricePerSf } from "@/lib/dadu-value";
import { PERMIT_PACKAGE } from "@/lib/portal/types";
import { BUILD_TYPES } from "@/lib/feasibility/defaults";

export const metadata: Metadata = {
  title: "Pencil — Seattle backyard cottages, from the lot to the keys",
  description:
    "Pencil takes a Seattle backyard cottage (DADU) from a free feasibility check to permits, a vetted builder, and renting or selling it. Every Seattle lot is already scored.",
};

/*
 * The home page, built on PET: Persuasion (one clear action, the free first look, a priced path),
 * Emotion (the finished cottage, what it does for a family), Trust (proof only Pencil has, costs in
 * the open, named data sources, who we are). Every figure here comes from the app's own config or data.
 */

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const LOTS_READ = "58,087";
const RENT = BUILD_TYPES.sfr_dadu.rentPerUnitMonthly;
const RESALE_800 = 800 * salePricePerSf(800);

const OUTCOMES = [
  { title: "Rent it", figure: `about ${usd(RENT)} a month`, body: "A typical Seattle backyard cottage rents for this, from the month it gets its certificate of occupancy." },
  { title: "Keep family close", figure: "their own front door", body: "A parent, a grown kid or a caregiver a few steps away, with a kitchen, a bath and a door of their own." },
  { title: "Sell it", figure: `about ${usd(RESALE_800)}`, body: "What an 800 sf cottage resells for in our planning model. Seattle lets you sell it separately with a unit lot subdivision." },
];

const SOURCES = [
  ["Parcels and zoning", "City of Seattle"],
  ["Building footprints", "Seattle 2023 outlines"],
  ["Every tree over the lot", "2021 LiDAR tree canopy"],
  ["Slope of the ground", "USGS 1 m lidar elevation"],
  ["Critical areas", "Seattle ECA maps"],
  ["What you may build", "Seattle Municipal Code 23.44.041"],
] as const;

const COSTS = [
  ["Feasibility check", "Free", "Score, site plan, cost and rent estimate. No sign-up."],
  ["Permit package", `${usd(PERMIT_PACKAGE.feeCents / 100)} fixed`, "Design options, permit drawings, submittal and every round of city corrections."],
  ["Construction", `${usd(COST_PER_SF)} per sf`, "The rate we plan with. Your builder's bid replaces it."],
  ["Soft costs", usd(SOFT_COSTS), "Utilities, fees, survey and the rest we budget on top of the build."],
] as const;

const TEAM = [
  ["Architecture", "We design the cottages, so a feasibility answer is something we could actually draw and permit."],
  ["Development", "We underwrite and build projects ourselves, so the numbers come from real jobs, not brochures."],
  ["Software", "We put that know-how into Pencil, so you get the same read on your lot in a minute."],
] as const;

export default function Home() {
  return (
    <main>
      {/* Hero: the finished cottage (emotion) beside one clear action (persuasion). */}
      <section className="hp-hero" aria-labelledby="hp-h1">
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
            <Heading level={1} id="hp-h1">Your backyard can pay for itself.</Heading>
            <Lede style={{ marginTop: 20 }}>
              Pencil takes a Seattle backyard cottage from the first look to the keys. We check the lot, design and permit the cottage, bring you a vetted builder, and help you rent it or sell it.
            </Lede>
            <div style={{ marginTop: 28 }}>
              <HomeSearch />
            </div>
            <ul className="hp-assure" aria-label="What to expect">
              <li><Check size={15} aria-hidden /> Free first look</li>
              <li><Check size={15} aria-hidden /> No sign-up</li>
              <li><Check size={15} aria-hidden /> City and county records</li>
            </ul>
          </div>
          <figure className="hp-hero-art">
            <Image src={rendering} alt="A Seattle craftsman house with a new two-story backyard cottage behind it, drawn as an architect's rendering." priority sizes="(min-width: 960px) 52vw, 100vw" placeholder="blur" />
          </figure>
        </div>
      </section>

      {/* Proof only Pencil can show (trust + persuasion): the whole city is already scored. */}
      <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <div className="hp-proof">
            <div>
              <Heading level={2} style={{ maxWidth: "18ch" }}>We have already read your lot.</Heading>
              <Lede style={{ marginTop: 18 }}>
                All {LOTS_READ} single-family lots in Seattle: the lot lines, the zoning, the house on it, every tree, the slope. Each one is scored for a backyard cottage, so you can see the good ones before anyone else does.
              </Lede>
              <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button href="/search" size="lg">See the map <ArrowRight size={16} aria-hidden /></Button>
              </div>
            </div>
            <Link href="/search" className="hp-grid-card" aria-label="Open the map of scored Seattle lots">
              <span className="hp-grid" aria-hidden>
                {Array.from({ length: 60 }, (_, i) => {
                  const g = (i * 37 + (i >> 2) * 11) % 13;
                  return <span key={i} data-g={g < 2 ? 3 : g < 6 ? 2 : g < 9 ? 1 : 0} />;
                })}
              </span>
              <span className="hp-grid-legend">
                <span><i data-g="3" /> Top pick</span>
                <span><i data-g="2" /> Good</span>
                <span><i data-g="1" /> Fair</span>
                <span><i data-g="0" /> No room</span>
              </span>
            </Link>
          </div>
        </Container>
      </Section>

      {/* Emotion: what a cottage does for a household, with the planning figures. */}
      <Section soft style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <Heading level={2} style={{ maxWidth: "20ch" }}>What a backyard cottage does for you.</Heading>
          <ul className="hp-outcomes">
            {OUTCOMES.map((o) => (
              <li key={o.title}>
                <h3 className="s-h3">{o.title}</h3>
                <p className="hp-figure">{o.figure}</p>
                <p className="s-body">{o.body}</p>
              </li>
            ))}
          </ul>
          <p className="hp-note">Planning figures from Pencil&apos;s cost and resale model. Your feasibility report shows the numbers for your lot.</p>
        </Container>
      </Section>

      {/* Persuasion: the whole path, priced, on one rail. The page's one saturated field. */}
      <section className="hp-journey" aria-labelledby="hp-journey-h">
        <Container>
          <div className="hp-journey-head">
            <Heading level={2} id="hp-journey-h" style={{ maxWidth: "16ch" }}>One team, from lot to keys.</Heading>
            <Button href="/login?mode=signup&next=%2Fportal%2Fnew" size="lg">Start your project <ArrowRight size={16} aria-hidden /></Button>
          </div>
          <div style={{ marginTop: 40 }}>
            <Journey tone="dark" />
          </div>
        </Container>
      </section>

      {/* Persuasion by reciprocity: what the free report shows, before anyone asks for anything. */}
      <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <div className="hero-grid" style={{ alignItems: "center" }}>
            <div>
              <Heading level={2} style={{ maxWidth: "15ch" }}>See it drawn before you spend a dollar.</Heading>
              <ul className="hp-checks">
                <li><strong>Where you can build.</strong> Setbacks, height and lot coverage under current Seattle code, drawn as the buildable area.</li>
                <li><strong>What fits.</strong> The largest cottage the lot can carry, which you can drag around the plan.</li>
                <li><strong>What gets in the way.</strong> Trees, slope, critical areas and the path in from the street.</li>
                <li><strong>What it costs and earns.</strong> A build estimate, rent and resale, with every assumption shown.</li>
              </ul>
              <div style={{ marginTop: 26 }}>
                <Button href="/feasibility" size="lg">Check an address <ArrowRight size={16} aria-hidden /></Button>
              </div>
            </div>
            <div>
              <Plat />
            </div>
          </div>
        </Container>
      </Section>

      {/* Trust: the costs and the sources, in the open. */}
      <Section soft style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <Heading level={2} style={{ maxWidth: "20ch" }}>Our numbers, in the open.</Heading>
          <div className="hp-trust">
            <div>
              <h3 className="s-h3">What it costs</h3>
              <dl className="hp-costs">
                {COSTS.map(([k, v, note]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd className="hp-cost">{v}</dd>
                    <dd className="hp-cost-note">{note}</dd>
                  </div>
                ))}
              </dl>
              <p className="hp-disclosure">
                <ShieldCheck size={16} aria-hidden /> Builders we introduce you to may pay Pencil a referral fee. It never changes your price, and you can pick any builder you like.
              </p>
            </div>
            <div>
              <h3 className="s-h3">Where the data comes from</h3>
              <ul className="hp-sources">
                {SOURCES.map(([what, src]) => (
                  <li key={what}><span>{what}</span><span>{src}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* Trust: who we are. */}
      <Section id="about" style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <div className="hp-about">
            <div>
              <Heading level={2} style={{ maxWidth: "16ch" }}>Architects, developers and engineers, in one shop.</Heading>
              <Lede style={{ marginTop: 18 }}>
                Seattle rewrote its rules for backyard cottages, and the know-how did not keep up. We built Pencil so an owner gets the answer a seasoned developer would, then the team to carry it out.
              </Lede>
              <Link href="/company" className="s-btn s-btn--ghost" style={{ marginTop: 18, paddingInline: 0 }}>More about Pencil <ArrowRight size={16} aria-hidden /></Link>
            </div>
            <dl className="hp-team">
              {TEAM.map(([k, v]) => (
                <div key={k}>
                  <dt className="s-h3">{k}</dt>
                  <dd className="s-body">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      {/* Persuasion: the portal makes a long project feel handled. */}
      <Section soft style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <div className="hero-grid" style={{ alignItems: "center" }}>
            <div className="hp-portal" aria-hidden>
              <div className="hp-portal-card">
                <p className="hp-portal-title">4521 Fremont Ave N <span>Sample</span></p>
                <div className="hp-portal-bar">{[0, 1, 2, 3].map((i) => <span key={i} data-on={i <= 2} />)}</div>
                <p className="hp-portal-stage">Stage 3 of 4 · Architecture and permit</p>
                <p className="hp-portal-next"><b>Your move</b> Approve a design option</p>
                <p className="hp-portal-latest">Latest: two design options are ready for you</p>
              </div>
            </div>
            <div>
              <Heading level={2} style={{ maxWidth: "15ch" }}>Your project, in one place.</Heading>
              <Lede style={{ marginTop: 18 }}>
                Every project shows where it stands and the one thing that needs you next. Approve designs, compare builder bids side by side, and follow the build. We email you at every step.
              </Lede>
              <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button href="/login?mode=signup" size="lg">Create an account</Button>
                <Button href="/login" variant="outline" size="lg">Sign in</Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Final action. */}
      <Section className="s-section--flag" style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }}>
        <Container>
          <div className="hero-grid" style={{ alignItems: "end" }}>
            <div>
              <Heading level={2} style={{ maxWidth: "16ch" }}>Find out what your lot can hold.</Heading>
              <Lede style={{ marginTop: 16 }}>It takes a minute and costs nothing. Keep going only if it pencils.</Lede>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button href="/feasibility" size="lg">Check an address</Button>
              <Button href="/contact" variant="outline" size="lg">Talk to us</Button>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
