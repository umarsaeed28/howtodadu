"use client";

import { useId, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "./Reveal";

const ITEMS = [
  {
    q: "Which areas do you cover?",
    a: "Seattle and the broader Puget Sound (King / Snohomish), expanding by jurisdiction.",
  },
  {
    q: "Where does the data come from?",
    a: "NWMLS listings, King County / Seattle GIS, and current local construction costs.",
  },
  {
    q: "Is the daily verdict final?",
    a: "It's a fast, accurate screen to surface candidates. A Full Feasibility confirms the number before you commit.",
  },
  {
    q: "Do I have to be a developer?",
    a: "No. Agents, investors, and lot owners use Pencil to see what a parcel can become.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[820px] px-6 py-20 lg:py-28">
        <Reveal>
          <p className="pencil-eyebrow">FAQ</p>
          <h2 id="faq-heading" className="pencil-h2 mt-4 text-[var(--ink)]">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="mt-10">
          <dl className="border-t" style={{ borderColor: "var(--hairline)" }}>
            {ITEMS.map((item, i) => {
              const isOpen = open === i;
              const panelId = `${baseId}-panel-${i}`;
              const btnId = `${baseId}-btn-${i}`;
              return (
                <div key={item.q} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <dt>
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left"
                    >
                      <span className="pencil-display text-[1.1rem] font-medium text-[var(--ink)]">
                        {item.q}
                      </span>
                      {isOpen ? (
                        <Minus className="size-5 shrink-0 text-[var(--blue)]" aria-hidden />
                      ) : (
                        <Plus className="size-5 shrink-0 text-[var(--blue)]" aria-hidden />
                      )}
                    </button>
                  </dt>
                  <dd
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    hidden={!isOpen}
                    className="pb-5 pr-10 text-[1.0625rem] leading-[1.65] text-[var(--slate)]"
                  >
                    {item.a}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
