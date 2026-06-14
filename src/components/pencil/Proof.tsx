import { Reveal } from "./Reveal";

interface CaseStudy {
  location: string;
  play: string;
  metricLabel: string;
  metricValue: string;
}

// TODO: replace with the 3 real case studies — location, the play, the outcome
// number, optional 1-line client quote.
const CASES: CaseStudy[] = [
  {
    location: "BALLARD · NR2",
    play: "Single lot → 6-unit stacked flats",
    metricLabel: "Projected margin",
    metricValue: "+24.1%",
  },
  {
    location: "BEACON HILL · NR1",
    play: "Tear-down → 4 townhomes",
    metricLabel: "Units unlocked",
    metricValue: "4",
  },
  {
    location: "EDMONDS · RS-8",
    play: "RS-8 lot → remodel + DADU",
    metricLabel: "Weeks saved",
    metricValue: "~6",
  },
];

export function Proof() {
  return (
    <section
      id="proof"
      aria-labelledby="proof-heading"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal>
          <p className="pencil-eyebrow">Proof</p>
          <h2 id="proof-heading" className="pencil-h2 mt-4 text-[var(--ink)]">
            Underwritten, not theorized.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CASES.map((c, i) => (
            <Reveal key={c.location} delay={i * 0.06}>
              <article
                className="flex h-full flex-col rounded-[4px] bg-[var(--card)] p-6 transition-transform duration-150 hover:-translate-y-0.5"
                style={{ border: "1px solid var(--hairline)", boxShadow: "var(--drafted-shadow)" }}
              >
                <div className="pencil-mono text-[0.75rem] uppercase tracking-[0.1em] text-[var(--blue)]">
                  {c.location}
                </div>
                <p className="pencil-display mt-3 flex-1 text-[1.1rem] font-medium leading-snug text-[var(--ink)]">
                  {c.play}
                </p>
                <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
                  <div className="pencil-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--slate)]">
                    {c.metricLabel}
                  </div>
                  <div
                    className="pencil-mono mt-1 text-[1.6rem] font-medium"
                    style={{ color: "var(--green)" }}
                  >
                    {c.metricValue}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
