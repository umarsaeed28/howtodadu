import type { Metadata } from "next";
import { Section, Container, Eyebrow, Heading, Lede, Body, CardLink, Pill } from "@/components/ui";
import NewsletterField from "@/components/site/NewsletterField";

export const metadata: Metadata = {
  title: "Insights — Pencil",
  description:
    "Guides, zoning updates, and case studies on Seattle middle housing. Understand the rules and the numbers.",
};

const POSTS = [
  {
    tag: "Guide",
    title: "What HB 1110 actually allows on your lot",
    body: "A plain read on Seattle middle housing, unit by unit, with the conditions that matter.",
  },
  {
    tag: "Zoning",
    title: "Reading the quarter mile transit test",
    body: "How frequent transit proximity can unlock up to six homes on a single lot.",
  },
  {
    tag: "Case study",
    title: "From single lot to six stacked flats",
    body: "How the numbers came together on a Ballard parcel, from purchase to pro forma.",
  },
  {
    tag: "Guide",
    title: "Lot splits and unit lot subdivision",
    body: "When splitting a lot makes a project pencil, and when it quietly does not.",
  },
  {
    tag: "Costs",
    title: "Why per square foot estimates mislead",
    body: "The gap between a napkin number and a real takeoff, and what it does to your margin.",
  },
  {
    tag: "Zoning",
    title: "Overlays that change the math",
    body: "Environmentally critical areas, design review, and the rules that shape a site.",
  },
];

export default function InsightsPage() {
  return (
    <main>
      <Section>
        <Container style={{ maxWidth: 820 }}>
          <Eyebrow>Insights</Eyebrow>
          <Heading level={1} style={{ marginTop: 18 }}>
            Understand the new rules.
          </Heading>
          <Lede style={{ marginTop: 22, maxWidth: "40rem" }}>
            Guides, zoning updates, and case studies on Seattle middle housing. Written to be useful,
            not to sell.
          </Lede>
        </Container>
      </Section>

      <Section className="s-section" style={{ paddingTop: 0 }}>
        <Container>
          <div className="s-grid s-grid-3">
            {POSTS.map((post) => (
              <CardLink key={post.title} href="/insights">
                <Pill>{post.tag}</Pill>
                <h3 className="s-h3" style={{ marginTop: 16 }}>
                  {post.title}
                </h3>
                <Body style={{ marginTop: 8, fontSize: "0.95rem" }}>{post.body}</Body>
              </CardLink>
            ))}
          </div>
        </Container>
      </Section>

      <Section soft>
        <Container style={{ maxWidth: 620, textAlign: "center" }}>
          <Heading level={2}>Get the next one.</Heading>
          <Body style={{ marginTop: 14 }}>
            A short note when there is something worth reading. No noise.
          </Body>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: "26rem" }}>
              <NewsletterField />
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
