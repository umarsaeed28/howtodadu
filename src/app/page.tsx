import Link from "next/link";
import { ArrowRight, Search, Layers, Calculator, PencilRuler } from "lucide-react";
import { Section, Container, Heading, Lede, Button, Card, CardLink, Metric, Pill } from "@/components/ui";
import { parcels } from "@/lib/parcels";
import ParcelCard from "@/components/pencil-app/ParcelCard";
import HomeAddressBar from "@/components/site/HomeAddressBar";

const WHAT = [
  { Icon: Search, title: "Find the property", body: "We surface lots that fit your goals and your budget across Seattle." },
  { Icon: Layers, title: "See the options", body: "What each lot can become, with a few clear ways to build it." },
  { Icon: Calculator, title: "Run the numbers", body: "Real costs, value, and return, so you can compare deals honestly." },
  { Icon: PencilRuler, title: "Design and permits", body: "We design the project and prepare the drawings for the city." },
];

const STEPS = [
  { n: "01", title: "Drop an address", body: "Or let Pencil watch the whole market for you." },
  { n: "02", title: "It reads the rules", body: "Zoning, overlays, and transit proximity under current Seattle code." },
  { n: "03", title: "It runs real costs", body: "Not a per square foot guess. Quantities priced against local trades." },
  { n: "04", title: "It tells you the options", body: "Unit yield, the best use, and an early pro forma." },
  { n: "05", title: "It tells you if it pencils", body: "A clear verdict, with the margin to back it." },
];

const INSIGHTS = [
  { tag: "Guide", title: "What HB 1110 actually allows on your lot", body: "A plain read on Seattle middle housing, unit by unit." },
  { tag: "Zoning", title: "Reading the quarter mile transit test", body: "How proximity unlocks up to six homes on a single lot." },
  { tag: "Case study", title: "From single lot to six stacked flats", body: "How the numbers came together on a Ballard parcel." },
];

export default function Home() {
  const featured = parcels
    .filter((p) => p.verdict === "PENCILS")
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 3);

  return (
    <main>
      {/* Hero */}
      <Section className="s-section">
        <Container style={{ maxWidth: 880, textAlign: "center", marginInline: "auto" }}>
          <Heading level={1} style={{ marginInline: "auto" }}>
            See what a lot can become.
          </Heading>
          <Lede style={{ marginTop: 22, marginInline: "auto", maxWidth: "40rem" }}>
            Pencil reads a parcel, the zoning, and real costs, then tells you what you can build and
            whether it pencils.
          </Lede>
          <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Button href="/feasibility" size="lg">
              Check a property
              <ArrowRight size={17} aria-hidden />
            </Button>
            <Button href="/app" variant="outline" size="lg">
              Explore deals
            </Button>
          </div>
        </Container>
      </Section>

      {/* Trust band */}
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
                <Metric>{m.v}</Metric>
                <p className="s-body" style={{ marginTop: 8, fontSize: "0.92rem" }}>
                  {m.l}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* What Pencil does */}
      <Section>
        <Container>
          <Heading level={2} style={{ maxWidth: "18ch" }}>
            One process, start to finish.
          </Heading>
          <div className="s-grid s-grid-4" style={{ marginTop: 40 }}>
            {WHAT.map(({ Icon, title, body }) => (
              <Card key={title}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    height: 42,
                    width: 42,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9,
                    background: "var(--green-tint)",
                    color: "var(--green)",
                  }}
                >
                  <Icon size={20} />
                </span>
                <h3 className="s-h3" style={{ marginTop: 18 }}>
                  {title}
                </h3>
                <p className="s-body" style={{ marginTop: 8, fontSize: "0.95rem" }}>
                  {body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Live taste of the product */}
      <Section soft>
        <Container>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div>
              <Heading level={2}>
                Deals that pencil today.
              </Heading>
            </div>
            <Link href="/app" className="s-btn s-btn--ghost">
              Explore all deals <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="pencil-app" style={{ background: "transparent", marginTop: 36 }}>
            <div className="s-grid s-grid-3">
              {featured.map((p) => (
                <ParcelCard key={p.id} parcel={p} />
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section>
        <Container>
          <Heading level={2} style={{ maxWidth: "16ch" }}>
            From address to verdict.
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

      {/* Feasibility bridge */}
      <Section soft>
        <Container>
          <Card style={{ padding: "clamp(2rem, 5vw, 4rem)", textAlign: "center" }}>
            <Heading level={2} style={{ marginInline: "auto", maxWidth: "20ch" }}>
              Check any Seattle lot, free.
            </Heading>
            <Lede style={{ marginTop: 16, marginInline: "auto", maxWidth: "34rem" }}>
              No signup. Enter an address and see what it allows, the options, and an early read on the
              numbers.
            </Lede>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
              <HomeAddressBar />
            </div>
          </Card>
        </Container>
      </Section>

      {/* Insights teaser */}
      <Section>
        <Container>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div>
              <Heading level={2}>
                Understand the new rules.
              </Heading>
            </div>
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

      {/* Final CTA */}
      <Section soft>
        <Container style={{ textAlign: "center" }}>
          <Heading level={2} style={{ marginInline: "auto", maxWidth: "18ch" }}>
            Let&apos;s look at a deal together.
          </Heading>
          <Lede style={{ marginTop: 16, marginInline: "auto", maxWidth: "34rem" }}>
            Tell us what you&apos;re looking for. We&apos;ll show you what&apos;s possible, and whether
            it pencils.
          </Lede>
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Button href="/contact" size="lg">
              Talk to us
            </Button>
            <Button href="/app" variant="outline" size="lg">
              Explore deals
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
