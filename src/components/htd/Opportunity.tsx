import Reveal from "./Reveal";

const PARAGRAPHS = [
  "In 2026, Seattle started allowing more homes on almost every lot. Most lots can now hold four homes. Lots near transit can hold six.",
  "The market has not caught up. A lot still sells like one house, even when it can hold several.",
  "That gap is the opportunity. We help you find it and build it.",
];

export default function Opportunity() {
  return (
    <section id="why-now" className="htd-pine htd-section" aria-labelledby="why-now-title">
      <div className="htd-container">
        <Reveal>
          <p className="htd-eyebrow" style={{ color: "var(--sage)" }}>
            Why now
          </p>
          <h2 id="why-now-title" className="htd-h2 mt-5" style={{ color: "var(--bone)" }}>
            Seattle changed the rules.
          </h2>
        </Reveal>

        <div className="mt-10 max-w-2xl space-y-6">
          {PARAGRAPHS.map((p, i) => (
            <Reveal key={i} delay={0.06 * i}>
              <p className="htd-body-text" style={{ color: "var(--sage)", fontSize: "1.2rem", lineHeight: 1.7 }}>
                {p}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
