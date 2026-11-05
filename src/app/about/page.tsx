import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, Container, Heading, Lede, Button, Pill } from "@/components/ui";
import HomeAddressBar from "@/components/site/HomeAddressBar";
import Plat from "@/components/site/Plat";

const FINDINGS = [
  {
    title: "Where you can build",
    body: "Setbacks, height, and lot coverage under current Seattle code, drawn as the shaded buildable envelope.",
  },
  {
    title: "What fits inside it",
    body: "The backyard cottage the lot can carry, with a construction estimate.",
  },
  {
    title: "What gets in the way",
    body: "Trees, slopes, and the path from the street, checked against the rules before you spend on design.",
  },
];

const STEPS = [
  { title: "Pick a lot", body: "On the map of Seattle lots that can take a backyard cottage, or by address." },
  { title: "It reads the parcel", body: "Zoning, lot shape, buildings, trees, and critical areas from city data." },
  { title: "It sizes a DADU", body: "The largest cottage the lot's data supports, drawn on a plan." },
  { title: "It estimates the build", body: "Area times $350 per square foot, construction only." },
  { title: "You run the numbers", body: "Enter a sale price or a rent in the calculator to see whether it pays." },
];

const INSIGHTS = [
  { tag: "Guide", title: "What HB 1110 actually allows on your lot", body: "A plain read on Seattle middle housing, unit by unit." },
  { tag: "Zoning", title: "Reading the quarter mile transit test", body: "How proximity unlocks up to six homes on a single lot." },
  { tag: "Case study", title: "From single lot to six stacked flats", body: "How the numbers came together on a Ballard parcel." },
];

export const metadata = {
  title: "About Pencil",
  description: "Find, plan, and build middle housing in Seattle.",
};

export default function About() {
  return (
    <main>
      {/* Hero: the drawing is the proof */}
      <Section style={{ paddingBlock: "clamp(2.5rem, 6vw, 5rem)" }}>
        <Container>
          <div className="hero-grid">
            <div>
              <Heading level={1}>See what a property can become.</Heading>
              <Lede style={{ marginTop: 24 }}>
                Enter a Seattle address. Pencil reads the parcel, the zoning, and real costs, then draws
                what you can build and tells you whether it pencils.
              </Lede>
              <div style={{ marginTop: 32 }}>
                <HomeAddressBar />
              </div>
              <p className="s-body" style={{ marginTop: 14, fontSize: "0.95rem" }}>
                Free, no signup.{" "}
                <Link href="/" className="s-btn s-btn--ghost" style={{ minHeight: 0, padding: 0, fontSize: "inherit" }}>
                  Or open the map of Seattle lots
                </Link>
              </p>
            </div>
            <Plat />
          </div>
        </Container>
      </Section>

      {/* What the drawing tells you */}
      <Section soft>
        <Container>
          <div className="hero-grid" style={{ alignItems: "start" }}>
            <Heading level={2} style={{ maxWidth: "14ch" }}>
              One drawing answers three questions.
            </Heading>
            <div>
              {FINDINGS.map((f, i) => (
                <div key={f.title} className="finding">
                  <span className="finding-key" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="s-h3">{f.title}</h3>
                  <p className="s-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* How it works: a real sequence */}
      <Section soft>
        <Container>
          <div className="hero-grid" style={{ alignItems: "start" }}>
            <Heading level={2} style={{ maxWidth: "12ch" }}>
              From lot to estimate.
            </Heading>
            <div>
              {STEPS.map((st, i) => (
                <div key={st.title} className="seq-row">
                  <span className="seq-n">{i + 1}</span>
                  <div>
                    <h3 className="s-h3">{st.title}</h3>
                    <p className="s-body" style={{ marginTop: 4 }}>
                      {st.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Insights */}
      <Section>
        <Container>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <Heading level={2}>Understand the new rules.</Heading>
            <Link href="/insights" className="s-btn s-btn--ghost">
              All insights <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div style={{ marginTop: 32, borderBottom: "1px solid var(--line-strong)" }}>
            {INSIGHTS.map((post) => (
              <Link key={post.title} href="/insights" className="read-row">
                <span>
                  <Pill>{post.tag}</Pill>
                </span>
                <h3 className="s-h3">{post.title}</h3>
                <p className="s-body" style={{ fontSize: "0.98rem" }}>
                  {post.body}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* Final CTA: the page's one saturated field */}
      <Section className="s-section--flag">
        <Container>
          <div className="hero-grid" style={{ alignItems: "end" }}>
            <div>
              <Heading level={2} style={{ maxWidth: "16ch" }}>
                Let&apos;s look at a deal together.
              </Heading>
              <Lede style={{ marginTop: 16, color: "#2a1408" }}>
                Tell us what you&apos;re looking for. We&apos;ll show you what&apos;s possible, and whether
                it pencils.
              </Lede>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-start" }}>
              <Button href="/contact" size="lg">
                Talk to us
              </Button>
              <Button href="/feasibility" variant="outline" size="lg">
                Check a property
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
