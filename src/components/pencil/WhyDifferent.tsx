import { Reveal } from "./Reveal";

export function WhyDifferent() {
  return (
    <section
      id="why-different"
      aria-labelledby="why-different-heading"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="pencil-eyebrow">Why it&rsquo;s different</p>
            <h2 id="why-different-heading" className="pencil-h2 mt-4 text-[var(--ink)]">
              Anyone can guess. Pencil estimates.
            </h2>
            <p className="mt-5 max-w-[48ch] text-[1.0625rem] leading-[1.65] text-[var(--slate)]">
              Most feasibility tools die at construction cost — a generic per-square-foot figure
              that&rsquo;s wrong the moment you trust it. Pencil closes the loop: real material
              quantities from the massing, priced against a live Puget Sound cost catalog.
              That&rsquo;s the difference between a number and a guess — and it&rsquo;s why your
              lender takes it seriously.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 self-center sm:grid-cols-2">
            {/* The ONLY red on the page */}
            <div
              className="rounded-[4px] p-5"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--red)",
              }}
            >
              <div className="pencil-mono text-[0.72rem] uppercase tracking-[0.1em]" style={{ color: "var(--red)" }}>
                Napkin math
              </div>
              <p className="pencil-mono mt-3 text-[0.86rem] leading-[1.7] text-[var(--slate)]">
                $ /sf assumption
                <br />
                ±30%
                <br />
                falls apart under diligence
              </p>
            </div>

            <div
              className="rounded-[4px] p-5"
              style={{
                backgroundColor: "var(--green-tint)",
                border: "1px solid var(--green)",
              }}
            >
              <div className="pencil-mono text-[0.72rem] uppercase tracking-[0.1em]" style={{ color: "var(--green)" }}>
                Pencil
              </div>
              <p className="pencil-mono mt-3 text-[0.86rem] leading-[1.7] text-[var(--ink)]">
                itemized BIM takeoff
                <br />
                live local pricing
                <br />
                lender-grade
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
