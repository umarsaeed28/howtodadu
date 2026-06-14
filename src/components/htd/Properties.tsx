import Reveal from "./Reveal";
import SectionIntro from "./SectionIntro";

// TODO: replace with three real projects.
const PROJECTS = [
  {
    location: "Ballard, Seattle",
    became: "A home plus a backyard home.",
    homes: "2",
    result: "One to rent. One to sell.",
  },
  {
    location: "Beacon Hill, Seattle",
    became: "Four townhomes on one lot.",
    homes: "4",
    result: "Four homes for sale.",
  },
  {
    location: "Delridge, Seattle",
    became: "Six small flats near transit.",
    homes: "6",
    result: "Six homes to rent.",
  },
];

export default function Properties() {
  return (
    <section id="properties" className="htd-paper htd-section" aria-labelledby="properties-title">
      <div className="htd-container">
        <SectionIntro eyebrow="Our work" title="Real lots. Real plans." titleId="properties-title" />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={i} delay={0.07 * i}>
              <article className="htd-card htd-card-hover h-full p-6">
                <span className="htd-mono text-xs uppercase" style={{ color: "var(--slate)", letterSpacing: "0.08em" }}>
                  {p.location}
                </span>
                <h3 className="htd-display mt-4 text-lg" style={{ color: "var(--ink)" }}>
                  {p.became}
                </h3>
                <dl className="mt-5">
                  <div className="flex items-baseline justify-between border-t py-3" style={{ borderColor: "var(--hairline)" }}>
                    <dt className="htd-body text-sm" style={{ color: "var(--slate)" }}>
                      Homes you can build
                    </dt>
                    <dd className="htd-mono text-base" style={{ color: "var(--ink)" }}>
                      {p.homes}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t py-3" style={{ borderColor: "var(--hairline)" }}>
                    <dt className="htd-body text-sm" style={{ color: "var(--slate)" }}>
                      Result
                    </dt>
                    <dd className="htd-body text-sm" style={{ color: "var(--ink)" }}>
                      {p.result}
                    </dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
