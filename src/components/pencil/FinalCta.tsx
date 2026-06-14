import { Reveal } from "./Reveal";

export function FinalCta() {
  return (
    <section
      id="request"
      aria-labelledby="final-cta-heading"
      style={{ backgroundColor: "var(--green-tint)", borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-24 text-center lg:py-32">
        <Reveal>
          <h2 id="final-cta-heading" className="pencil-h2 mx-auto max-w-[20ch] text-[var(--ink)]">
            See if your next lot pencils.
          </h2>
          <p className="pencil-lede mx-auto mt-5 max-w-[40ch]">
            Get tomorrow&rsquo;s deals, or send us a parcel today.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#daily-deals" className="pencil-btn pencil-btn-primary">
              Get the daily deals
            </a>
            <a
              href="mailto:hello@pencil.studio?subject=Feasibility%20request"
              className="pencil-btn pencil-btn-outline"
            >
              Request a feasibility
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
