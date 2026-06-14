import Reveal from "./Reveal";
import SectionIntro from "./SectionIntro";

const ROWS = [
  { label: "Cost", value: "$1.95M" },
  { label: "Value", value: "$2.45M" },
  { label: "Homes", value: "6" },
];

export default function SeeNumbers() {
  return (
    <section id="numbers" className="htd-paper htd-section" aria-labelledby="numbers-title">
      <div className="htd-container">
        <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <SectionIntro
              eyebrow="The numbers"
              title="Every deal, in plain terms."
              titleId="numbers-title"
            />
            <Reveal delay={0.05}>
              <p className="htd-body-text mt-7 max-w-md" style={{ color: "var(--slate)" }}>
                For each property we show what it costs, what it could be worth, and what you can
                build. No guessing. You see the same picture we do.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <div className="htd-card p-7" style={{ background: "var(--bone)" }}>
              <div className="flex items-center justify-between">
                <span className="htd-mono text-sm" style={{ color: "var(--ink)" }}>
                  4214 NW 62nd St
                </span>
                <span className="htd-mono text-xs uppercase" style={{ color: "var(--slate)", letterSpacing: "0.1em" }}>
                  Example
                </span>
              </div>

              <dl className="mt-6">
                {ROWS.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-baseline justify-between border-t py-3"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <dt className="htd-body text-sm" style={{ color: "var(--slate)" }}>
                      {r.label}
                    </dt>
                    <dd className="htd-mono text-base" style={{ color: "var(--ink)" }}>
                      {r.value}
                    </dd>
                  </div>
                ))}
                <div
                  className="mt-1 flex items-baseline justify-between py-3"
                  style={{ borderTop: "1px solid var(--hairline)" }}
                >
                  <dt className="htd-body text-sm" style={{ color: "var(--slate)" }}>
                    Result
                  </dt>
                  <dd className="htd-body text-base font-medium" style={{ color: "var(--forest)" }}>
                    Worth more than it costs.
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
