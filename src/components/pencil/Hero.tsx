"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { VerdictCard } from "./VerdictCard";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="pencil-grid-bg relative"
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-16">
        <motion.div
          variants={reduce ? undefined : container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
        >
          <motion.p variants={reduce ? undefined : item} className="pencil-eyebrow">
            Middle-housing feasibility · Seattle / Puget Sound
          </motion.p>

          <motion.h1
            id="hero-heading"
            variants={reduce ? undefined : item}
            className="pencil-h1 mt-5 text-[var(--ink)]"
          >
            Does it pencil?
            <br />
            Know in minutes, not weeks.
          </motion.h1>

          <motion.p
            variants={reduce ? undefined : item}
            className="pencil-lede mt-6 max-w-[34rem]"
          >
            Pencil reads the parcel, the zoning, and the real construction costs — then tells you
            exactly what you can build under HB 1110, and whether the numbers actually work.
            Lender-ready, every time.
          </motion.p>

          <motion.div
            variants={reduce ? undefined : item}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a href="#daily-deals" className="pencil-btn pencil-btn-primary">
              Get the daily deals
            </a>
            <a href="#request" className="pencil-btn pencil-btn-outline">
              Request a feasibility
            </a>
          </motion.div>
        </motion.div>

        <div className="flex justify-center lg:justify-end">
          <VerdictCard />
        </div>
      </div>

      <hr className="border-0 border-t" style={{ borderColor: "var(--hairline)" }} />
    </section>
  );
}
