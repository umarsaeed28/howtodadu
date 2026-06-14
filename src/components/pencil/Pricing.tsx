import { Reveal } from "./Reveal";

interface Tier {
  name: string;
  tagline: string;
  body: string;
  price: string;
  priceNote?: string;
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Pencil Check",
    tagline: "Know fast.",
    body: "Zoning, max unit yield, a rough pro forma, and a clear go/no-go in 48 hours.",
    price: "$499",
    priceNote: "placeholder",
  },
  {
    name: "Full Feasibility",
    tagline: "The whole deal.",
    body: "Zoning analysis, 2–3 massing & site options, detailed pro forma, and a BIM-driven construction estimate.",
    price: "$3,500",
    priceNote: "placeholder",
    popular: true,
  },
  {
    name: "Master Plan",
    tagline: "Build-ready.",
    body: "Design development, drawings, procurement options, and GC-ready numbers.",
    price: "From $10,000",
    priceNote: "placeholder",
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal>
          <p className="pencil-eyebrow">Pricing</p>
          <h2 id="pricing-heading" className="pencil-h2 mt-4 text-[var(--ink)]">
            Pay for the answer, not the hours.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.06}>
              <div
                className="group flex h-full flex-col rounded-[4px] bg-[var(--card)] p-6 transition-transform duration-150 hover:-translate-y-0.5"
                style={{
                  border: "1px solid var(--hairline)",
                  borderTop: tier.popular ? "3px solid var(--green)" : "1px solid var(--hairline)",
                  boxShadow: "var(--drafted-shadow)",
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="pencil-display text-[1.25rem] font-medium text-[var(--ink)]">
                    {tier.name}
                  </h3>
                  {tier.popular ? (
                    <span
                      className="pencil-mono rounded-[4px] px-2 py-1 text-[0.62rem] uppercase tracking-[0.1em]"
                      style={{ backgroundColor: "var(--green-tint)", color: "var(--green)" }}
                    >
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p className="pencil-mono mt-1 text-[0.8rem] uppercase tracking-[0.08em] text-[var(--blue)]">
                  {tier.tagline}
                </p>
                <p className="mt-4 flex-1 text-[0.98rem] leading-[1.6] text-[var(--slate)]">
                  {tier.body}
                </p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="pencil-mono text-[1.6rem] font-medium text-[var(--ink)]">
                    {tier.price}
                  </span>
                  {tier.priceNote ? (
                    <span className="pencil-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--slate)]">
                      ({tier.priceNote})
                    </span>
                  ) : null}
                </div>
                <a
                  href="#request"
                  className={`pencil-btn mt-5 w-full ${tier.popular ? "pencil-btn-primary" : "pencil-btn-outline"}`}
                >
                  Request a feasibility
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Daily Deals subscription banner */}
        <Reveal delay={0.1}>
          <div
            className="mt-6 flex flex-col items-start justify-between gap-4 rounded-[4px] p-6 sm:flex-row sm:items-center"
            style={{ backgroundColor: "var(--green-tint)", border: "1px solid var(--green)" }}
          >
            <div>
              <h3 className="pencil-display text-[1.15rem] font-medium text-[var(--ink)]">
                Daily Deals subscription
              </h3>
              <p className="mt-1 text-[0.98rem] text-[var(--slate)]">
                The whole market, screened every morning.{" "}
                <span className="pencil-mono text-[var(--ink)]">From $___/mo</span>
              </p>
            </div>
            <a href="#daily-deals" className="pencil-btn pencil-btn-primary shrink-0">
              Get the daily deals
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
