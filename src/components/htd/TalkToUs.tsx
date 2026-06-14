import Reveal from "./Reveal";
import Subscribe from "./Subscribe";

export default function TalkToUs() {
  return (
    <section id="talk" className="htd-pine htd-section" aria-labelledby="talk-title">
      <div className="htd-container">
        <Reveal>
          <h2 id="talk-title" className="htd-h2" style={{ color: "var(--bone)" }}>
            Let&apos;s look at a deal together.
          </h2>
          <p className="htd-lede mt-6 max-w-xl" style={{ color: "var(--sage)" }}>
            Tell us what you&apos;re looking for. We&apos;ll show you what&apos;s possible.
          </p>
          <div className="mt-8">
            <a href="mailto:hello@howtodadu.com?subject=Talk%20to%20us" className="htd-btn htd-btn-forest">
              Talk to us
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 max-w-md border-t pt-8" style={{ borderColor: "var(--hairline-dk)" }}>
            <p className="htd-eyebrow" style={{ color: "var(--sage)" }}>
              Subscribe for updates
            </p>
            <div className="mt-4">
              <Subscribe dark />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
