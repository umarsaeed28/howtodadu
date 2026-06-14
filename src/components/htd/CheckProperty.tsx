import Link from "next/link";
import Reveal from "./Reveal";

export default function CheckProperty() {
  return (
    <section id="check" className="htd-bone htd-section" aria-labelledby="check-title">
      <div className="htd-container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="htd-eyebrow">Try it</p>
            <h2 id="check-title" className="htd-h2 mt-5" style={{ color: "var(--ink)" }}>
              See what a lot can do.
            </h2>
            <p className="htd-lede mt-6" style={{ color: "var(--slate)" }}>
              Enter an address and get an early read on its potential.
            </p>
            <Link href="/feasibility" className="htd-btn htd-btn-forest mt-8">
              Check a property
            </Link>
            <p className="htd-mono mx-auto mt-8 max-w-lg text-xs leading-relaxed" style={{ color: "var(--slate)" }}>
              This is an early estimate from public data and Seattle resources like ADUniverse. It is
              not final. We confirm everything before you buy.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
