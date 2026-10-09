import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Section, Container, Heading, Lede, Pill } from "@/components/ui";
import { CASE_STUDIES, caseStudy, caseStudyTotals } from "@/lib/case-studies";
import "../case-study.css";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** "$1.225M", "$2M", "$775K": exact, with trailing zeros dropped. */
const usdK = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(3).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`);

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = caseStudy((await params).slug);
  return c ? { title: `Case study: ${c.address.split(",")[0]} — Pencil`, description: c.summary } : { title: "Case study — Pencil" };
}

/** A case study: the lot, the money in, the value after, and the photos. */
export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = caseStudy((await params).slug);
  if (!c) notFound();
  const t = caseStudyTotals(c);

  return (
    <main>
      <Section style={{ paddingBlock: "clamp(2.5rem, 6vw, 4.5rem) clamp(1.5rem, 3vw, 2.5rem)" }}>
        <Container style={{ maxWidth: 980 }}>
          <Pill>Case study</Pill>
          <Heading level={1} style={{ marginTop: 16, fontSize: "clamp(2rem, 4.6vw, 3.2rem)", maxWidth: "22ch" }}>{c.title}</Heading>
          <p className="cs-addr">{c.address} · {c.neighborhood}</p>
          <Lede style={{ marginTop: 14, maxWidth: "44rem" }}>{c.summary}</Lede>

          <dl className="cs-big">
            <div><dt>Total invested</dt><dd>{usdK(t.invested)}</dd></div>
            <div><dt>Combined value after</dt><dd>{usdK(t.arv)}</dd></div>
            <div><dt>Equity created</dt><dd>+{usdK(t.equity)}</dd></div>
            <div><dt>Rent a year</dt><dd>{usdK(t.annualRent)}</dd></div>
            <div><dt>Rent yield on cost</dt><dd>{t.grossYieldPct}%</dd></div>
          </dl>
        </Container>
      </Section>

      <Section style={{ paddingBlock: "0 clamp(2rem, 4vw, 3rem)" }}>
        <Container style={{ maxWidth: 980 }}>
          <ul className={`cs-photos${c.images.length === 1 ? " cs-photos--one" : ""}`}>
            {c.images.map((img) => (
              <li key={img.caption}>
                <figure>
                  {img.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.src} alt={img.alt} loading="lazy" />
                  ) : (
                    <div className="cs-photo-empty" role="img" aria-label={`${img.caption}: photo coming soon`}><ImageIcon size={22} aria-hidden /></div>
                  )}
                  <figcaption>{img.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section soft style={{ paddingBlock: "clamp(2.5rem, 5vw, 4rem)" }}>
        <Container style={{ maxWidth: 980 }}>
          <div className="cs-cols">
            <section aria-labelledby="cs-house">
              <Heading level={2} id="cs-house" style={{ fontSize: "1.5rem" }}>The front house</Heading>
              <table className="cs-table">
                <tbody>
                  <tr><th scope="row">Purchase price</th><td>{usd(c.purchase)}</td></tr>
                  <tr><th scope="row">Renovation, including {c.rental.basementBeds} bedrooms in the old unfinished basement</th><td>{usd(c.houseRenovation)}</td></tr>
                  <tr><th scope="row">Bedrooms after</th><td>{c.rental.houseBeds}</td></tr>
                  <tr><th scope="row">After-repair value</th><td>{usd(c.houseArv)}</td></tr>
                  <tr data-strong=""><th scope="row">Value added</th><td>+{usd(t.houseLift)}</td></tr>
                </tbody>
              </table>
            </section>
            <section aria-labelledby="cs-dadu">
              <Heading level={2} id="cs-dadu" style={{ fontSize: "1.5rem" }}>The DADU</Heading>
              <table className="cs-table">
                <tbody>
                  <tr><th scope="row">Size</th><td>{c.dadu.sqft.toLocaleString("en-US")} sf, {c.rental.daduBeds} bedrooms</td></tr>
                  <tr><th scope="row">Build cost</th><td>{usd(c.dadu.buildCost)} ({usd(t.daduBuildPerSf)} per sf)</td></tr>
                  <tr><th scope="row">After-repair value</th><td>{usd(c.dadu.arv)} ({usd(t.daduArvPerSf)} per sf)</td></tr>
                  <tr data-strong=""><th scope="row">Value added</th><td>+{usd(t.daduLift)}</td></tr>
                </tbody>
              </table>
              <p className="cs-note">{c.dadu.note}</p>
            </section>
          </div>

          <section aria-labelledby="cs-whole" className="cs-whole">
            <Heading level={2} id="cs-whole" style={{ fontSize: "1.5rem" }}>The whole deal</Heading>
            <table className="cs-table">
              <tbody>
                <tr><th scope="row">Purchase + renovation + DADU build</th><td>{usd(c.purchase)} + {usd(c.houseRenovation)} + {usd(c.dadu.buildCost)} = {usd(t.invested)}</td></tr>
                <tr><th scope="row">House ARV + DADU ARV</th><td>{usd(c.houseArv)} + {usd(c.dadu.arv)} = {usd(t.arv)}</td></tr>
                <tr data-strong=""><th scope="row">Equity created</th><td>+{usd(t.equity)} ({t.returnOnCostPct}% on cost)</td></tr>
              </tbody>
            </table>
            <p className="cs-note">ARV is the after-repair value. Equity and return are before financing, holding and selling costs.</p>
          </section>

          <section aria-labelledby="cs-rent" className="cs-whole">
            <Heading level={2} id="cs-rent" style={{ fontSize: "1.5rem" }}>The rent</Heading>
            <table className="cs-table">
              <tbody>
                <tr><th scope="row">Rooms</th><td>{c.rental.houseBeds} in the house + {c.rental.daduBeds} in the DADU = {t.rooms}</td></tr>
                <tr><th scope="row">Tenants</th><td>{c.rental.tenants}</td></tr>
                <tr><th scope="row">Rent per room</th><td>{usd(c.rental.rentPerRoom)} a month</td></tr>
                <tr><th scope="row">Rent, all rooms</th><td>{usd(t.monthlyRent)} a month · {usd(t.annualRent)} a year</td></tr>
                <tr data-strong=""><th scope="row">Gross yield on the {usdK(t.invested)} invested</th><td>{t.grossYieldPct}%</td></tr>
                <tr><th scope="row">Gross yield on the {usdK(t.arv)} value after</th><td>{t.yieldOnValuePct}%</td></tr>
                <tr><th scope="row">Years of rent to repay the cost</th><td>About {t.paybackYears}</td></tr>
              </tbody>
            </table>
            <p className="cs-note">Gross rent: before vacancy, utilities, taxes, insurance, upkeep and financing.</p>
          </section>

          <section aria-labelledby="cs-lot" className="cs-whole">
            <Heading level={2} id="cs-lot" style={{ fontSize: "1.5rem" }}>Why the lot worked</Heading>
            <ul className="cs-list">
              <li>{c.lot.sqft.toLocaleString("en-US")} sf lot, {c.lot.widthFt} × {c.lot.depthFt} ft, zoned {c.lot.zoning}: room for the largest DADU the code allows, {c.dadu.sqft.toLocaleString("en-US")} sf.</li>
              {c.lot.alley && <li>An alley along the rear lot line: construction access, utilities and the DADU&apos;s front door, with no setback on the alley side.</li>}
              <li>A {c.lot.yearBuilt} house with an unfinished basement: room for {c.rental.basementBeds} more bedrooms inside the walls already there.</li>
              <li>Close to the University of Washington, so every bedroom rents by the room to students.</li>
            </ul>
          </section>
        </Container>
      </Section>

      <Section style={{ paddingBlock: "clamp(2.5rem, 5vw, 4rem)" }}>
        <Container style={{ maxWidth: 980 }}>
          <Heading level={2} style={{ maxWidth: "24ch" }}>Have a lot like this one?</Heading>
          <Lede style={{ marginTop: 12 }}>See what yours can hold in 30 seconds, or find one with us.</Lede>
          <div className="cs-ctas">
            <Link href={`/feasibility?parcel=${c.lot.pin}`} className="s-btn s-btn--primary">See this lot&apos;s feasibility <ArrowRight size={15} aria-hidden /></Link>
            <Link href="/contact" className="s-btn s-btn--outline">Talk to us</Link>
          </div>
        </Container>
      </Section>
    </main>
  );
}
