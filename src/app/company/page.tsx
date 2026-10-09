import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Code2, Landmark, PencilRuler } from "lucide-react";
import { Container, Heading, Lede } from "@/components/ui";
import CaseStudyFeature from "@/components/home/CaseStudyFeature";
import { TEAM, initials } from "@/lib/team";
import rendering from "../../../public/home/dadu-rendering.webp";

export const metadata: Metadata = {
  title: "About us — Pencil",
  description:
    "Pencil is a Seattle acquisition and design-build firm for DADUs and middle housing. Architecture, development and software under one roof.",
};

/*
 * Structure follows ui-ux-pro-max's Trust & Authority pattern (mission hero, the case for it, how we work, proof,
 * the people, one clear contact path), in Pencil's brand (pencil-design). The free consult is the one primary action.
 */

const DISCIPLINES = [
  {
    icon: PencilRuler,
    title: "Architecture",
    body: "We design the buildings, so every feasibility answer is grounded in what can actually be drawn, permitted and built.",
  },
  {
    icon: Landmark,
    title: "Development",
    body: "We buy, underwrite and build projects ourselves, so the numbers we show you reflect real costs, not theory.",
  },
  {
    icon: Code2,
    title: "Software",
    body: "We turned that experience into Pencil's tools, so you get the same read on a lot in minutes, not weeks.",
  },
] as const;

/** Placeholder slots show in development only; see src/lib/team.ts. */
const people = TEAM.filter((m) => !m.placeholder || process.env.NODE_ENV !== "production");

export default function CompanyPage() {
  return (
    <main>
      {/* Hero: who we are, one action. */}
      <section className="co-hero" aria-labelledby="co-h1">
        <div className="co-hero-inner">
          <div className="co-hero-copy">
            <Heading level={1} id="co-h1">We buy, design and build housing in Seattle.</Heading>
            <Lede style={{ marginTop: 18 }}>
              Pencil is an acquisition and design-build firm for DADUs and middle housing. Architecture, development
              and software under one roof, so the firm that checks your lot is the one that draws it and builds it.
            </Lede>
            <div className="co-actions">
              <Link href="/contact" className="s-btn s-btn--primary s-btn--lg">
                Book a free consult <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#hm-case-h" className="hm-quiet">See our work <ArrowRight size={14} aria-hidden /></a>
            </div>
          </div>
          <figure className="co-hero-art">
            <Image src={rendering} alt="A Seattle craftsman house with a modern two-story DADU at the rear of the lot." priority sizes="(min-width: 960px) 46vw, 100vw" placeholder="blur" />
          </figure>
        </div>
      </section>

      {/* Why we exist */}
      <section className="co-why" aria-labelledby="co-why-h">
        <Container>
          <div className="co-split">
            <Heading level={2} id="co-why-h" className="co-split-h">The rules changed. The know-how didn&apos;t keep up.</Heading>
            <div className="co-split-body">
              <p>
                Seattle now allows at least four homes on nearly every residential lot, and six near frequent transit.
                The opportunity is real, but knowing which lots actually work takes zoning, design and cost knowledge
                that most owners and buyers don&apos;t have on hand.
              </p>
              <p>
                We learned it on our own projects, buying and building them ourselves. Then we built the tools, and
                opened the same team to you.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* How we work: three disciplines, hairline columns (same pattern as the home page's services). */}
      <section className="co-how" aria-labelledby="co-how-h">
        <Container>
          <Heading level={2} id="co-how-h" style={{ maxWidth: "22ch", textWrap: "balance" }}>Three disciplines, one team</Heading>
          <ol className="hm-svc">
            {DISCIPLINES.map((d, i) => (
              <li key={d.title} className="hm-svc-item">
                <span className="hm-svc-top">
                  <span className="hm-svc-icon" aria-hidden><d.icon size={20} /></span>
                  <span className="hm-svc-n" aria-hidden>0{i + 1}</span>
                </span>
                <h3 className="hm-svc-title">{d.title}</h3>
                <p className="hm-svc-body">{d.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Proof: our own project, real numbers. "See our work" jumps to its heading (#hm-case-h). */}
      <CaseStudyFeature />

      {/* Team */}
      <section className="co-team" aria-labelledby="co-team-h">
        <Container>
          <Heading level={2} id="co-team-h">The team</Heading>
          <Lede style={{ marginTop: 14 }}>The people who will check your lot, draw it and see it built.</Lede>
          <ul className="co-people">
            {people.map((m, i) => (
              <li key={`${m.name}-${i}`} className="co-person" data-placeholder={m.placeholder || undefined}>
                <div className="co-photo">
                  {m.photo ? (
                    <Image src={m.photo} alt={`${m.name}, ${m.role}`} fill sizes="(min-width: 900px) 30vw, (min-width: 560px) 45vw, 100vw" />
                  ) : (
                    <span className="co-initials" aria-hidden>{m.placeholder ? "+" : initials(m.name)}</span>
                  )}
                </div>
                <h3 className="co-name">{m.name}</h3>
                <p className="co-role">{m.role}</p>
                {m.bio && <p className="co-bio">{m.bio}</p>}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Closing action */}
      <section className="hm-close" aria-labelledby="co-close-h">
        <Container style={{ maxWidth: 820 }}>
          <Heading level={2} id="co-close-h">Tell us what you want to build.</Heading>
          <Lede style={{ marginTop: 14 }}>A DADU behind your house, a lot for four homes, or just a question about a listing. The first conversation is free.</Lede>
          <div className="co-actions">
            <Link href="/contact" className="s-btn s-btn--primary s-btn--lg">
              Book a free consult <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/feasibility" className="hm-quiet">Or check a lot yourself <ArrowRight size={14} aria-hidden /></Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
