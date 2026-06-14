import { Reveal } from "./Reveal";

export function WhyNow() {
  return (
    <section
      id="why-now"
      aria-labelledby="why-now-heading"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal className="grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="pencil-eyebrow">Why now</p>
            <h2 id="why-now-heading" className="pencil-h2 mt-4 max-w-[18ch] text-[var(--ink)]">
              Every Seattle lot just changed. Most people don&rsquo;t know what theirs can do.
            </h2>
          </div>
          <p className="max-w-[52ch] self-end text-[1.0625rem] leading-[1.65] text-[var(--slate)]">
            Since January 2026, HB 1110 and Seattle&rsquo;s permanent zoning allow at least four homes
            on nearly every residential lot — six near frequent transit. The opportunity is real.
            Figuring out which lots actually pencil — zoning, massing, construction cost, the pro forma
            — still eats weeks of an architect&rsquo;s time. Pencil does it in minutes, across every
            lot at once.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
