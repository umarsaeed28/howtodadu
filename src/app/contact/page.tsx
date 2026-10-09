import type { Metadata } from "next";
import Link from "next/link";
import { Check, Mail } from "lucide-react";
import { Section, Container, Heading, Lede, Button } from "@/components/ui";
import ContactForm from "@/components/site/ContactForm";
import Journey from "@/components/site/Journey";

export const metadata: Metadata = {
  title: "Free consult — Pencil",
  description:
    "Pencil runs a Seattle DADU end to end, from acquisition to construction: the lot, feasibility, design, permit and build. Start with a free consult.",
};

const CONSULT = [
  "Your lot, or your search, and what it can hold",
  "Which stages you want us to run, from one to all five",
  "A rough budget and order of work, before you spend anything",
] as const;

/** The free consult: Pencil as one service from acquisition to construction. */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ address?: string }> }) {
  const { address } = await searchParams;
  return (
    <main>
      <Section>
        <Container>
          <div className="s-grid s-grid-2" style={{ gap: "clamp(2rem,5vw,4rem)", alignItems: "start" }}>
            <div>
              <Heading level={1} style={{ fontSize: "clamp(2.4rem, 4.2vw, 3.5rem)", maxWidth: "16ch" }}>One team, from buying the lot to building the DADU.</Heading>
              <Lede style={{ marginTop: 22, maxWidth: "34rem" }}>
                Pencil runs your Seattle DADU end to end. We find and buy the lot, check what fits, design it, get it
                permitted and build it, with one team and one project tracker the whole way. It starts with a free consult.
              </Lede>
              <h2 className="cf-sub">In the consult we cover</h2>
              <ul className="cf-help">
                {CONSULT.map((c) => (
                  <li key={c}><Check size={18} aria-hidden /> <span>{c}</span></li>
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

      <section className="hm-band" aria-labelledby="cf-stages">
        <Container>
          <Heading level={2} id="cf-stages" style={{ maxWidth: "22ch" }}>Acquisition to construction, one service</Heading>
          <p className="cf-band-lede">Take every stage, or hand us only the ones you need. Each picks up where the last one ended, so nothing is redone.</p>
          <div style={{ marginTop: 40 }}>
            <Journey tone="dark" />
          </div>
          <p className="cf-band-note">Builders we refer may pay Pencil a referral fee. We tell you before you choose one.</p>
        </Container>
      </section>
    </main>
  );
}
