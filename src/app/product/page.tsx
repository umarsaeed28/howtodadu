import type { Metadata } from "next";
import { ArrowRight, MapPin, BookOpen, Layers, ShieldCheck } from "lucide-react";
import { Section, Container, Eyebrow, Heading, Lede, Body, Button, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "How it works — Pencil",
  description:
    "Enter a Seattle address. See what you can build, and a complete guide for every way to build it.",
};

const PILLARS = [
  {
    Icon: MapPin,
    title: "Property feasibility",
    body: "Zoning, overlays, transit proximity, and lot dimensions from county and city GIS, kept current with Seattle code.",
  },
  {
    Icon: Layers,
    title: "Build options",
    body: "Every realistic housing type for the lot: DADU, townhomes, stacked flats, cottage housing, and more.",
  },
  {
    Icon: BookOpen,
    title: "Complete guides",
    body: "For each option: what it is, why it fits, constraints to verify, risks to plan for, and the steps to build.",
  },
  {
    Icon: ShieldCheck,
    title: "Honest confidence",
    body: "Rules-based reads are labeled high confidence. Site-specific items are flagged for verification before you commit.",
  },
];

export default function ProductPage() {
  return (
    <main>
      <Section>
        <Container style={{ maxWidth: 820 }}>
          <Eyebrow>How it works</Eyebrow>
          <Heading level={1} style={{ marginTop: 18 }}>
            See what a property can become.
          </Heading>
          <Lede style={{ marginTop: 22, maxWidth: "40rem" }}>
            Enter a Seattle address. Pencil reads the rules, lists every realistic build option, and
            opens a complete guide for each one.
          </Lede>
          <div style={{ marginTop: 30 }}>
            <Button href="/feasibility" size="lg">
              Check a property <ArrowRight size={17} aria-hidden />
            </Button>
          </div>
        </Container>
      </Section>

      <Section soft>
        <Container>
          <Eyebrow>The flow</Eyebrow>
          <Heading level={2} style={{ marginTop: 14, maxWidth: "20ch" }}>
            Address → options → guides.
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
        <Container style={{ maxWidth: 720 }}>
          <Eyebrow>Free to start</Eyebrow>
          <Heading level={2} style={{ marginTop: 14 }}>
            Value first, ask later.
          </Heading>
          <Body style={{ marginTop: 16 }}>
            Anyone can check any Seattle property for free. You get what it allows, the build options,
            and a guide for each scenario, with no signup. When you are ready to go deeper, we are
            here.
          </Body>
          <div style={{ marginTop: 24 }}>
            <Button href="/feasibility">
              Try the free check <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
