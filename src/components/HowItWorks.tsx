import { ArrowRight } from "lucide-react";

const phases = [
  { label: "Identify", text: "Evaluate what a property can support. Zoning, lot size, setbacks. We do this before you buy." },
  { label: "Acquire", text: "Find and purchase the right lot. We guide you through vetting and closing." },
  { label: "Design", text: "Plans and drawings. DADU, duplex, triplex, fourplex. Sized for your lot and Seattle's rules." },
  { label: "Permits", text: "We prepare everything and walk you through Seattle permitting." },
  { label: "Build", text: "We connect you with builders and support you through construction." },
  { label: "Rent · Sell · Own", text: "The outcome. You choose how to use what you built." },
];

export function HowItWorks() {
  return (
    <section id="process" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-sm font-semibold text-[#786fa6] uppercase tracking-wider mb-3">
          Process
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">
          The full path.
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-14">
          From identifying the right property to owning, renting, or selling.
          We walk with you every step.
        </p>

        {/* Visual flow */}
        <div className="hidden sm:flex items-center gap-3 mb-12 flex-wrap">
          {phases.map((phase, i) => (
            <span key={phase.label} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground bg-white border border-border rounded-full px-4 py-2 shadow-sm">
                {phase.label}
              </span>
              {i < phases.length - 1 && (
                <ArrowRight className="size-4 text-[#786fa6]/60" />
              )}
            </span>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {phases.map((phase) => (
            <div
              key={phase.label}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-md hover:border-[#786fa6]/20 transition-all duration-300"
            >
              <p className="text-sm font-bold text-[#786fa6] mb-2">
                {phase.label}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {phase.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
