import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Container, Heading, Lede, Section } from "@/components/ui";
import { CASE_STUDIES, caseStudyTotals } from "@/lib/case-studies";

/** "$1.225M", "$2M", "$775K". */
const usdK = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(3).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`);

/** The home page's proof: the latest case study, its four numbers and a photo, linking to the full write-up. */
export default function CaseStudyFeature() {
  const c = CASE_STUDIES[0];
  if (!c) return null;
  const t = caseStudyTotals(c);
  const photo = c.images.find((i) => i.src) ?? null;
  const href = `/case-studies/${c.slug}`;
  return (
    <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-case-h">
      <Container>
        <div className="hm-case">
          <div className="hm-case-text">
            <p className="hm-case-k">Case study · {c.address.split(",")[0]}</p>
            <Heading level={2} id="hm-case-h" style={{ maxWidth: "20ch" }}>{c.title}</Heading>
            <Lede style={{ marginTop: 14 }}>{c.summary}</Lede>
            <dl className="hm-case-nums">
              <div><dt>Invested</dt><dd>{usdK(t.invested)}</dd></div>
              <div><dt>Value after</dt><dd>{usdK(t.arv)}</dd></div>
              <div><dt>Rent a year</dt><dd>{usdK(t.annualRent)}</dd></div>
              <div><dt>Rent yield on cost</dt><dd>{t.grossYieldPct}%</dd></div>
            </dl>
            <Link href={href} className="s-btn s-btn--primary hm-case-cta">Read the case study <ArrowRight size={15} aria-hidden /></Link>
          </div>
          <Link href={href} className="hm-case-photo" aria-label={`${c.title}: read the case study`}>
            {photo?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.src} alt={photo.alt} loading="lazy" />
            ) : (
              <span className="hm-case-empty" aria-hidden><ImageIcon size={26} /></span>
            )}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
