import Reveal from "./Reveal";
import SectionIntro from "./SectionIntro";

const STEPS = [
  { n: "01", head: "Find.", line: "We bring you lots worth looking at." },
  { n: "02", head: "Plan.", line: "We show the options and the numbers for each one." },
  { n: "03", head: "Buy.", line: "You buy with a clear picture of what you can build." },
  { n: "04", head: "Design.", line: "We design it and prepare the permit drawings." },
  { n: "05", head: "Build.", line: "We hand off to a builder when you're ready to start." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="htd-bone htd-section" aria-labelledby="how-title">
      <div className="htd-container">
        <SectionIntro
          eyebrow="How it works"
          title="A clear path, start to finish."
          titleId="how-title"
        />

        <ol className="mt-12">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={0.05 * i}>
              <div
                className="grid grid-cols-1 gap-2 py-7 md:grid-cols-[auto_1fr] md:gap-10"
                style={{ borderTop: "1px solid var(--hairline)" }}
              >
                <span className="htd-mono text-xl" style={{ color: "var(--slate)" }}>
                  {s.n}
                </span>
                <div className="md:flex md:items-baseline md:gap-8">
                  <h3 className="htd-display text-xl md:w-48 md:shrink-0" style={{ color: "var(--ink)" }}>
                    {s.head}
                  </h3>
                  <p className="htd-body-text mt-1 max-w-xl md:mt-0" style={{ color: "var(--slate)" }}>
                    {s.line}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
