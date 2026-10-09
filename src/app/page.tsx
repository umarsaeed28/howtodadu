import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Hammer, KeyRound, LayoutDashboard, MapPin, Ruler, Search } from "lucide-react";
import { Section, Container, Heading, Lede, Body, Button, Card, Eyebrow } from "@/components/ui";
import Image from "next/image";
import HomeAddressBar from "@/components/site/HomeAddressBar";
import rendering from "../../public/home/dadu-rendering.webp";

export const metadata: Metadata = {
  title: "Pencil — Seattle DADUs from lot to keys",
  description:
    "Pencil takes a Seattle property from feasibility to a built backyard cottage: free site score and plan, a fixed-fee permit package, vetted builders, and help selling or renting it.",
};

/* The journey, as the portal runs it, plus the exit. */
const JOURNEY = [
  { Icon: MapPin, title: "Acquire", tag: "Your lot or ours", body: "Start with a property you own, or ask us to find a lot that takes a cottage." },
  { Icon: Ruler, title: "Feasibility", tag: "Free", body: "Score, buildable area, the largest cottage, a site plan you can drag, and rough numbers." },
  { Icon: ClipboardCheck, title: "Permit", tag: "$15,000 fixed", body: "Design options you approve, permit drawings, submittal, and the city's corrections handled." },
  { Icon: Hammer, title: "Build", tag: "Vetted builders", body: "One to three bids side by side, then a tracker from contract to certificate of occupancy." },
  { Icon: KeyRound, title: "Sell or rent", tag: "The payoff", body: "Priced and listed, or leased. The cottage earns from day one." },
];

const FINDINGS = [
  { title: "Where you can build", body: "Setbacks, height and lot coverage under current Seattle code, drawn as the buildable envelope." },
  { title: "What fits inside it", body: "The backyard cottage the lot can carry, with a build estimate and what it resells for." },
  { title: "What gets in the way", body: "Trees, slope, critical areas and the path from the street, checked before you spend on design." },
];

const PORTAL = [
  "A stepper that always shows the one next action",
  "Design options you approve with a click",
  "Builder bids compared side by side",
  "A build tracker and every file in one place",
];

const DISCIPLINES = [
  { title: "Architecture", body: "We design the buildings, so the feasibility is grounded in what can actually be drawn and built." },
  { title: "Development", body: "We underwrite and build projects ourselves, so the numbers reflect real costs, not theory." },
  { title: "Software", body: "We turned that experience into Pencil, so anyone can get the same read in minutes." },
];

const GRADES = [
  { label: "Top pick", color: "#145A40", note: "93 and up" },
  { label: "Good", color: "#6CB98A", note: "82 to 92" },
  { label: "Fair", color: "#D9A441", note: "70 to 81" },
];

export default function Home() {
  return (
    <main>
      {/* Hero: the address bar and the drawing */}
      <Section style={{ paddingBlock: "clamp(2.5rem, 6vw, 5rem)" }}>
        <Container>
          <div className="hero-grid">
            <div>
              <Eyebrow>Seattle backyard cottages, A to Z</Eyebrow>
              <Heading level={1} style={{ marginTop: 14 }}>
                From the lot to the keys.
              </Heading>
              <Lede style={{ marginTop: 22 }}>
                Pencil reads the parcel, draws the cottage, permits it, builds it with vetted contractors, then helps you sell it or rent it. The first look is free.
              </Lede>
              <div style={{ marginTop: 30 }}>
                <HomeAddressBar />
              </div>
              <p className="s-body" style={{ marginTop: 14, fontSize: "0.95rem" }}>
                Free, no sign-up for the first look.{" "}
                <Link href="/search" className="s-btn s-btn--ghost" style={{ minHeight: 0, padding: 0, fontSize: "inherit" }}>
                  Or browse every lot that can take one
                </Link>
              </p>
            </div>
            <figure className="lp-hero-art">
              <Image src={rendering} alt="A Seattle craftsman house with a new two-story backyard cottage behind it, drawn as an architect's rendering." priority sizes="(min-width: 900px) 50vw, 100vw" placeholder="blur" />
            </figure>
          </div>
          <dl className="lp-stats" aria-label="Pencil by the numbers">
            {([
              ["58,000+", "Seattle lots read and scored"],
              ["51,000+", "can take a backyard cottage"],
              ["$350", "per sf, the build cost we plan to"],
              ["5", "steps from lot to keys"],
            ] as const).map(([v, k]) => (
              <div key={k}>
                <dd className="s-metric">{v}</dd>
                <dt className="s-body" style={{ fontSize: "0.9rem", marginTop: 4 }}>{k}</dt>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      {/* The journey */}
      <Section soft>
        <Container>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div>
              <Eyebrow>How it works</Eyebrow>
              <Heading level={2} style={{ marginTop: 12, maxWidth: "18ch" }}>One team, every step.</Heading>
            </div>
            <Button href="/login?mode=signup&next=%2Fportal%2Fnew" size="lg">
              Start your project <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
          <ol className="lp-journey" style={{ marginTop: 36 }}>
            {JOURNEY.map(({ Icon, title, tag, body }, i) => (
              <li key={title} className="s-card s-card--pad lp-step">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span className="lp-step-n" aria-hidden>{i + 1}</span>
                  <span className="s-pill" style={{ fontSize: "0.78rem" }}>{tag}</span>
                </div>
                <Icon size={22} aria-hidden style={{ color: "var(--flag)", marginTop: 18 }} />
                <h3 className="s-h3" style={{ marginTop: 10 }}>{title}</h3>
                <Body style={{ marginTop: 6, fontSize: "0.95rem" }}>{body}</Body>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Search */}
      <Section>
        <Container>
          <div className="hero-grid" style={{ alignItems: "center" }}>
            <div>
              <Eyebrow>Search</Eyebrow>
              <Heading level={2} style={{ marginTop: 12, maxWidth: "16ch" }}>Every lot that can take a cottage, on one map.</Heading>
              <Lede style={{ marginTop: 16 }}>
                Homes for sale with a DADU score, pulled from the MLS every two days, plus tens of thousands of off-market lots. Filter by score, price and lot size. Save the ones you like.
              </Lede>
              <div style={{ marginTop: 24 }}>
                <Button href="/search" size="lg">
                  <Search size={16} aria-hidden /> Open the map
                </Button>
              </div>
            </div>
            <Link href="/search" className="s-card s-card--link lp-mapcard" aria-label="Open the map of Seattle lots">
              <div className="lp-mapcard-grid" aria-hidden>
                {Array.from({ length: 48 }, (_, i) => {
                  const g = (i * 7) % 11;
                  const color = g < 2 ? GRADES[0].color : g < 6 ? GRADES[1].color : g < 9 ? GRADES[2].color : "var(--bg-soft)";
                  return <span key={i} style={{ background: color, opacity: g >= 9 ? 1 : 0.9 }} />;
                })}
              </div>
              <ul className="lp-legend">
                {GRADES.map((g) => (
                  <li key={g.label}><span style={{ background: g.color }} aria-hidden /> {g.label} <small>{g.note}</small></li>
                ))}
              </ul>
            </Link>
          </div>
        </Container>
      </Section>

      {/* Feasibility */}
      <Section soft>
        <Container>
          <div className="hero-grid" style={{ alignItems: "start" }}>
            <div>
              <Eyebrow>Feasibility</Eyebrow>
              <Heading level={2} style={{ marginTop: 12, maxWidth: "14ch" }}>One drawing answers three questions.</Heading>
              <div style={{ marginTop: 24 }}>
                <Button href="/feasibility" variant="outline" size="lg">
                  Check a property <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            </div>
            <div>
              {FINDINGS.map((f, i) => (
                <div key={f.title} className="finding">
                  <span className="finding-key" aria-hidden>{i + 1}</span>
                  <h3 className="s-h3">{f.title}</h3>
                  <p className="s-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Portal */}
      <Section>
        <Container>
          <div className="hero-grid" style={{ alignItems: "center" }}>
            <Card>
              <LayoutDashboard size={22} aria-hidden style={{ color: "var(--flag)" }} />
              <ul className="lp-checks" style={{ marginTop: 14 }}>
                {PORTAL.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </Card>
            <div>
              <Eyebrow>Your portal</Eyebrow>
              <Heading level={2} style={{ marginTop: 12, maxWidth: "16ch" }}>Your project, in one place.</Heading>
              <Lede style={{ marginTop: 16 }}>
                Sign in to see where each project stands, approve designs, compare bids and follow the build. Pencil moves it along and emails you at every step.
              </Lede>
              <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button href="/login" size="lg">Sign in</Button>
                <Button href="/login?mode=signup" variant="outline" size="lg">Create an account</Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* About us */}
      <Section soft id="about">
        <Container>
          <Eyebrow>About us</Eyebrow>
          <Heading level={2} style={{ marginTop: 12, maxWidth: "20ch" }}>Architects, developers and engineers, in one shop.</Heading>
          <Lede style={{ marginTop: 16 }}>
            We help people find, plan and build middle housing in Seattle. The rules changed in 2023; we built Pencil so the answer you get is one you can act on.
          </Lede>
          <div className="s-grid s-grid-3" style={{ marginTop: 36 }}>
            {DISCIPLINES.map((d) => (
              <Card key={d.title}>
                <h3 className="s-h3">{d.title}</h3>
                <Body style={{ marginTop: 10, fontSize: "0.95rem" }}>{d.body}</Body>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/company" className="s-btn s-btn--ghost">More about Pencil <ArrowRight size={16} aria-hidden /></Link>
          </div>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section className="s-section--flag">
        <Container>
          <div className="hero-grid" style={{ alignItems: "end" }}>
            <div>
              <Heading level={2} style={{ maxWidth: "16ch" }}>Let&apos;s look at your lot together.</Heading>
              <Lede style={{ marginTop: 16 }}>Start with the free feasibility. Keep going when it pencils.</Lede>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button href="/feasibility" size="lg">Check a property</Button>
              <Button href="/contact" variant="outline" size="lg">Talk to us</Button>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
