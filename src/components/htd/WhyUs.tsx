import Reveal from "./Reveal";

export default function WhyUs() {
  return (
    <section id="why-us" className="htd-pine htd-section" aria-labelledby="why-us-title">
      <div className="htd-container">
        <Reveal>
          <p className="htd-eyebrow" style={{ color: "var(--sage)" }}>
            Why us
          </p>
          <h2 id="why-us-title" className="htd-h2 mt-5" style={{ color: "var(--bone)" }}>
            We&apos;ve done every part of this.
          </h2>
        </Reveal>
        <Reveal delay={0.06}>
          <p
            className="htd-body-text mt-8 max-w-2xl"
            style={{ color: "var(--sage)", fontSize: "1.2rem", lineHeight: 1.7 }}
          >
            We find the property, run the numbers, design the building, and get it ready for permits.
            It is all in one place, by people who have done it before. You get one clear process
            instead of five separate vendors.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
