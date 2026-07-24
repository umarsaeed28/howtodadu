import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Section, Container, Eyebrow, Heading, Lede, Body, Button, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Company — Pencil",
  description:
    "Pencil combines architecture, development, and software to help people build middle housing in Seattle.",
};

const DISCIPLINES = [
  {
    title: "Architecture",
    body: "We design the buildings, so the feasibility is grounded in what can actually be drawn and built.",
  },
  {
    title: "Development",
    body: "We underwrite and build projects ourselves, so the numbers reflect real costs, not theory.",
  },
  {
    title: "Software",
    body: "We turned that experience into Pencil, so anyone can get the same read in minutes.",
  },
];

export default function CompanyPage() {
  return (
    <main>
      <Section>
        <Container style={{ maxWidth: 820 }}>
          <Eyebrow>The company</Eyebrow>
          <Heading level={1} style={{ marginTop: 18 }}>
            We are Pencil.
          </Heading>
          <Lede style={{ marginTop: 22, maxWidth: "42rem" }}>
            We help people find, plan, and build middle housing in Seattle. We bring architecture,
            development, and software together so the answer you get is one you can act on.
          </Lede>
        </Container>
      </Section>

      <Section soft>
        <Container>
          <Eyebrow>What we bring</Eyebrow>
          <Heading level={2} style={{ marginTop: 14, maxWidth: "20ch" }}>
            Three disciplines, one answer.
          </Heading>
          <div className="s-grid s-grid-3" style={{ marginTop: 40 }}>
            {DISCIPLINES.map((d) => (
              <Card key={d.title}>
                <h3 className="s-h3">{d.title}</h3>
                <Body style={{ marginTop: 10, fontSize: "0.95rem" }}>{d.body}</Body>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container style={{ maxWidth: 720 }}>
          <Eyebrow>Why we built it</Eyebrow>
          <Heading level={2} style={{ marginTop: 14 }}>
            The rules changed. The knowledge did not keep up.
          </Heading>
          <Body style={{ marginTop: 18 }}>
            Seattle now allows at least four homes on nearly every residential lot, and six near
            frequent transit. The opportunity is real, but figuring out which lots actually work takes
            zoning, design, and cost knowledge that most people do not have on hand. Pencil puts that
            knowledge in everyone&apos;s reach, starting with a free check.
          </Body>
          <div style={{ marginTop: 26 }}>
            <Button href="/contact">
              Talk to us <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
