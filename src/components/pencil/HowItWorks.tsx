import { Reveal } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Drop an address.",
    body: "Or let Pencil watch the whole market for you.",
  },
  {
    n: "02",
    title: "It reads the rules.",
    body: "Zoning, overlays, transit proximity, and HB 1110 entitlements pulled live from King County GIS and grounded in Seattle building code.",
  },
  {
    n: "03",
    title: "It runs real costs.",
    body: "Not a napkin per-square-foot number. BIM-driven takeoffs priced against current Puget Sound material and trade costs.",
  },
  {
    n: "04",
    title: "It tells you if it pencils.",
    body: "Unit yield, the best use, a lender-ready pro forma, and a clear verdict — with the margin to back it.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal>
          <p className="pencil-eyebrow">How it works</p>
          <h2 id="how-it-works-heading" className="pencil-h2 mt-4 text-[var(--ink)]">
            From address to verdict.
          </h2>
        </Reveal>

        <ol className="mt-14 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              delay={i * 0.06}
              className="relative px-0 pb-10 sm:px-7 sm:pb-0 lg:px-0"
            >
              <li className="list-none lg:px-6">
                {/* hairline divider between steps on larger layouts */}
                {i > 0 ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 hidden h-[calc(100%-0.5rem)] w-px lg:block"
                    style={{ backgroundColor: "var(--hairline)" }}
                  />
                ) : null}
                <span className="pencil-mono text-[0.95rem] font-medium text-[var(--blue)]">
                  {step.n}
                </span>
                <h3 className="pencil-display mt-4 text-[1.2rem] font-medium text-[var(--ink)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.98rem] leading-[1.6] text-[var(--slate)]">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
