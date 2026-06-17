import type { Metadata } from "next";
import { ArrowRight, Database, Calculator, Map as MapIcon, ShieldCheck } from "lucide-react";
import { Section, Container, Eyebrow, Heading, Lede, Body, Button, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Product — Pencil",
  description:
    "Pencil reads the parcel, the zoning, and real construction costs, then tells you what you can build and whether it pencils.",
};

const PILLARS = [
  {
    Icon: Database,
    title: "Grounded in real data",
    body: "Zoning, overlays, transit proximity, and lot dimensions pulled from county and city GIS, kept current with Seattle code.",
  },
  {
    Icon: Calculator,
    title: "A real cost model",
    body: "Not a per square foot guess. Quantities from the massing, priced against current local material and trade costs.",
  },
  {
    Icon: MapIcon,
    title: "A deal browser",
    body: "Every active listing run through the full feasibility, sorted by margin, so you can see the deals that work.",
  },
  {
    Icon: ShieldCheck,
    title: "A clear verdict",
    body: "Unit yield, the best use, an early pro forma, and a plain verdict you can take to a lender.",
  },
];

export default function ProductPage() {
  return (
    <main>
      <Section>
        <Container style={{ maxWidth: 820 }}>
          <Eyebrow>The product</Eyebrow>
          <Heading level={1} style={{ marginTop: 18 }}>
            Pencil, the feasibility engine.
          </Heading>
          <Lede style={{ marginTop: 22, maxWidth: "40rem" }}>
            One tool that turns an address into an answer. It reads the rules, runs the real costs,
            and tells you what a lot can become and whether the numbers work.
          </Lede>
          <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button href="/feasibility" size="lg">
              Check a property <ArrowRight size={17} aria-hidden />
            </Button>
            <Button href="/app" variant="outline" size="lg">
              Explore deals
            </Button>
          </div>
        </Container>
      </Section>

      <Section soft>
        <Container>
          <Eyebrow>How it is built</Eyebrow>
          <Heading level={2} style={{ marginTop: 14, maxWidth: "20ch" }}>
            Four parts, one answer.
          </Heading>
          <div className="s-grid s-grid-2" style={{ marginTop: 40 }}>
            {PILLARS.map(({ Icon, title, body }) => (
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
                <Body style={{ marginTop: 8, fontSize: "0.95rem" }}>{body}</Body>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="s-grid s-grid-2" style={{ alignItems: "center", gap: "clamp(2rem,5vw,4rem)" }}>
            <div>
              <Eyebrow>The feasibility check</Eyebrow>
              <Heading level={2} style={{ marginTop: 14 }}>
                Value first, ask later.
              </Heading>
              <Body style={{ marginTop: 16 }}>
                Anyone can check any Seattle lot for free. You get what it allows, the options, and an
                early read on the numbers, with no signup. It is the fastest way to see if a deal is
                worth a closer look.
              </Body>
              <div style={{ marginTop: 24 }}>
                <Button href="/feasibility">
                  Try the free check <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            </div>
            <div>
              <Eyebrow>The deal browser</Eyebrow>
              <Heading level={2} style={{ marginTop: 14 }}>
                The market, already underwritten.
              </Heading>
              <Body style={{ marginTop: 16 }}>
                Stop hunting listings. Pencil scans new Puget Sound listings, runs each through the
                full feasibility, and shows you only the ones that pencil, sorted by margin.
              </Body>
              <div style={{ marginTop: 24 }}>
                <Button href="/app" variant="outline">
                  Explore deals
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
