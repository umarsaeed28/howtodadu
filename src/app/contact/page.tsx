import type { Metadata } from "next";
import Link from "next/link";
import { Check, Mail } from "lucide-react";
import { Section, Container, Heading, Lede, Button } from "@/components/ui";
import ContactForm from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Free consult — Pencil",
  description:
    "Not sure where to start with a Seattle DADU? Book a free consult. Pencil helps you find and buy a lot, design, permit, and build.",
};

const HELP = [
  ["Find and buy", "the right lot, or check the one you have"],
  ["Design", "a city-reviewed plan or one drawn for your lot"],
  ["Permit", "submittal to SDCI and every correction round"],
  ["Build", "matched with a builder, tracked to keys"],
] as const;

/** The free consult request: for anyone not sure where to start. */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ address?: string }> }) {
  const { address } = await searchParams;
  return (
    <main>
      <Section>
        <Container>
          <div className="s-grid s-grid-2" style={{ gap: "clamp(2rem,5vw,4rem)", alignItems: "start" }}>
            <div>
              <Heading level={1}>Not sure where to start? Talk to us, free.</Heading>
              <Lede style={{ marginTop: 22, maxWidth: "34rem" }}>
                Tell us where you are. We&apos;ll set up a free consult, look at your lot or your search, and lay out
                the path from here. Use Pencil for one step or all of them.
              </Lede>
              <ul className="cf-help">
                {HELP.map(([k, v]) => (
                  <li key={k}><Check size={18} aria-hidden /> <span><strong>{k}</strong> {v}</span></li>
                ))}
              </ul>
              <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                <Button href="mailto:hello@pencil.studio?subject=Free%20consult" variant="outline">
                  <Mail size={16} aria-hidden /> hello@pencil.studio
                </Button>
                <Link href="/feasibility" className="cf-alt">Prefer to look first? Check your lot</Link>
              </div>
            </div>

            <div style={{ maxWidth: 520, width: "100%" }}>
              <ContactForm address={address?.slice(0, 200) ?? ""} />
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
