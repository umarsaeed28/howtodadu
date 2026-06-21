import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Section, Container, Heading, Lede, Button, Card, CardLink, Pill } from "@/components/ui";
import HomeAddressBar from "@/components/site/HomeAddressBar";
import BuildGuidePreview from "@/components/site/BuildGuidePreview";

const STEPS = [
  {
    n: "1",
    title: "Drop an address",
    body: "Enter any Seattle property. No signup, no listing hunt.",
  },
  {
    n: "2",
    title: "See what's allowed + the build options",
    body: "Zoning, unit count, housing types, and envelope constraints from city GIS.",
  },
  {
    n: "3",
    title: "Open a complete guide for each scenario",
    body: "Every realistic way to build the property, with steps, constraints, and risks to verify.",
  },
];

const INSIGHTS = [
  { tag: "Guide", title: "What HB 1110 actually allows on your lot", body: "A plain read on Seattle middle housing, unit by unit." },
  { tag: "Zoning", title: "Reading the quarter mile transit test", body: "How proximity unlocks up to six homes on a single lot." },
  { tag: "Case study", title: "From single lot to six stacked flats", body: "How one Ballard parcel moved from address to build plan." },
];

export default function Home() {
  return (
    <main>
      <Section className="s-section">
        <Container style={{ maxWidth: 880, textAlign: "center", marginInline: "auto" }}>
          <Heading level={1} style={{ marginInline: "auto" }}>
            See what a property can become.
          </Heading>
          <Lede style={{ marginTop: 22, marginInline: "auto", maxWidth: "40rem" }}>
            Enter a Seattle address. See what you can build, and a complete guide for every way to
            build it.
          </Lede>
          <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
            <Button href="/feasibility" size="lg">
              Check a property
              <ArrowRight size={17} aria-hidden />
            </Button>
          </div>
        </Container>
      </Section>

      <Section soft tight>
        <Container>
          <div className="s-grid s-grid-4" style={{ textAlign: "center" }}>
            {[
              { v: "4–6", l: "homes allowed on most lots" },
              { v: "< 2 min", l: "to a first read" },
              { v: "100%", l: "Seattle and Puget Sound" },
              { v: "$0", l: "to check a property" },
            ].map((m) => (
              <div key={m.l}>
                <span className="s-mono" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 500 }}>
                  {m.v}
                </span>
                <p className="s-body" style={{ marginTop: 8, fontSize: "0.92rem" }}>
                  {m.l}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Heading level={2} style={{ maxWidth: "20ch" }}>
            How it works
          </Heading>
          <div className="s-grid" style={{ marginTop: 40, gridTemplateColumns: "1fr" }}>
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 20,
                  alignItems: "baseline",
                  paddingBlock: 18,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span className="s-mono" style={{ color: "var(--green)", fontSize: "0.95rem" }}>
                  {s.n}
                </span>
                <div>
                  <h3 className="s-h3">{s.title}</h3>
                  <p className="s-body" style={{ marginTop: 4 }}>
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <BuildGuidePreview />

      <Section>
        <Container>
          <Card style={{ padding: "clamp(2rem, 5vw, 4rem)", textAlign: "center" }}>
            <Heading level={2} style={{ marginInline: "auto", maxWidth: "20ch" }}>
              Check any Seattle property, free.
            </Heading>
            <Lede style={{ marginTop: 16, marginInline: "auto", maxWidth: "34rem" }}>
              No signup. Enter an address and see what it allows, the build options, and a guide for
              each one.
            </Lede>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
              <HomeAddressBar />
            </div>
          </Card>
        </Container>
      </Section>

      <Section soft>
        <Container>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <Heading level={2}>Understand the new rules.</Heading>
            <Link href="/insights" className="s-btn s-btn--ghost">
              All insights <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="s-grid s-grid-3" style={{ marginTop: 36 }}>
            {INSIGHTS.map((post) => (
              <CardLink key={post.title} href="/insights">
                <Pill>{post.tag}</Pill>
                <h3 className="s-h3" style={{ marginTop: 16 }}>
                  {post.title}
                </h3>
                <p className="s-body" style={{ marginTop: 8, fontSize: "0.95rem" }}>
                  {post.body}
                </p>
              </CardLink>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container style={{ textAlign: "center" }}>
          <Heading level={2} style={{ marginInline: "auto", maxWidth: "18ch" }}>
            Planning a project?
          </Heading>
          <Lede style={{ marginTop: 16, marginInline: "auto", maxWidth: "34rem" }}>
            Tell us about the property. We will walk through what it allows and the realistic build
            paths.
          </Lede>
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
            <Button href="/contact" size="lg">
              Talk to us
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
