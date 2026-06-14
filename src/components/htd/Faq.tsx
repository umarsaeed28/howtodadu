"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import Reveal from "./Reveal";
import SectionIntro from "./SectionIntro";

const ITEMS = [
  {
    q: "What is a DADU?",
    a: "A second smaller home on the same lot. Like a backyard house.",
  },
  {
    q: "Do you find properties for us?",
    a: "Yes. We bring you lots that fit your goals.",
  },
  {
    q: "Is the property check accurate?",
    a: "It is a good early read. We confirm the details before you buy.",
  },
  {
    q: "Do you handle permits?",
    a: "Yes. We prepare the drawings the city needs.",
  },
  {
    q: "Where do you work?",
    a: "Seattle and the nearby area.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="htd-bone htd-section" aria-labelledby="faq-title">
      <div className="htd-container">
        <SectionIntro eyebrow="FAQ" title="Common questions." titleId="faq-title" />

        <Reveal delay={0.05}>
          <div className="mt-12" style={{ borderTop: "1px solid var(--hairline)" }}>
            {ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <h3>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-btn-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="htd-display text-lg" style={{ color: "var(--ink)" }}>
                        {item.q}
                      </span>
                      <span style={{ color: "var(--forest)" }} aria-hidden>
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    hidden={!isOpen}
                    className="pb-6 pr-10"
                  >
                    <p className="htd-body-text max-w-2xl" style={{ color: "var(--slate)" }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
