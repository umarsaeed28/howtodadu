import Reveal from "./Reveal";
import SectionIntro from "./SectionIntro";

const ITEMS = [
  "Funds and family offices looking for steady, asset backed projects.",
  "Investors who want middle housing without running the process themselves.",
  "Owners who want to know what their lot can do.",
];

export default function WhoItsFor() {
  return (
    <section id="who" className="htd-paper htd-section" aria-labelledby="who-title">
      <div className="htd-container">
        <SectionIntro
          eyebrow="Who it's for"
          title="Built for people putting capital to work."
          titleId="who-title"
        />

        <ul className="mt-12 max-w-3xl" style={{ borderTop: "1px solid var(--hairline)" }}>
          {ITEMS.map((item, i) => (
            <Reveal as="li" key={i} delay={0.06 * i}>
              <p
                className="htd-body-text py-5"
                style={{ borderBottom: "1px solid var(--hairline)", color: "var(--ink)", fontSize: "1.2rem" }}
              >
                {item}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
