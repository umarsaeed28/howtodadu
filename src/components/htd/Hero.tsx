"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function Hero() {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.05 } },
  };
  const item: Variants = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
      };

  return (
    <section id="overview" className="htd-pine" aria-labelledby="hero-title">
      <div className="htd-container" style={{ paddingTop: 170, paddingBottom: "clamp(5rem,10vw,9rem)" }}>
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl">
          <motion.p variants={item} className="htd-eyebrow" style={{ color: "var(--sage)" }}>
            Seattle middle housing
          </motion.p>
          <motion.h1 id="hero-title" variants={item} className="htd-h1 mt-6" style={{ color: "var(--bone)" }}>
            The quiet work behind a good deal.
          </motion.h1>
          <motion.p variants={item} className="htd-lede mt-7 max-w-xl" style={{ color: "var(--sage)" }}>
            We help investors find, plan, and build middle housing in Seattle. From the right property
            to permit ready plans.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-wrap gap-3">
            <a href="#talk" className="htd-btn htd-btn-forest">
              Talk to us
            </a>
            <a href="#how-it-works" className="htd-btn htd-btn-ghost-dark">
              See how it works
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
