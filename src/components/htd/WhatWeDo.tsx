import Reveal from "./Reveal";
import SectionIntro from "./SectionIntro";

const CARDS = [
  {
    title: "Find the property.",
    body: "We find lots that fit your goals and your budget.",
  },
  {
    title: "See the options.",
    body: "We show what each lot can become, with a few ways to build it.",
  },
  {
    title: "Run the numbers.",
    body: "We show the cost, the value, and the return, so you can compare deals side by side.",
  },
  {
    title: "Design and permits.",
    body: "We design the project and prepare the drawings for the city.",
  },
];

export default function WhatWeDo() {
  return (
    <section id="what-we-do" className="htd-bone htd-section" aria-labelledby="what-title">
      <div className="htd-container">
        <SectionIntro eyebrow="What we do" title="One process, start to finish." titleId="what-title" />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={0.06 * i}>
              <article className="htd-card htd-card-hover h-full p-7">
                <h3 className="htd-display text-xl" style={{ color: "var(--ink)" }}>
                  {c.title}
                </h3>
                <p className="htd-body-text mt-3" style={{ color: "var(--slate)" }}>
                  {c.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
