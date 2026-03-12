import { MapPin, Search, Pencil, FileCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "Identify the right property",
    description:
      "We evaluate what a property can support under Seattle's middle housing laws. Zoning, lot size, setbacks, development potential. So you know what you're getting before you buy.",
  },
  {
    number: "02",
    icon: Search,
    title: "Acquire",
    description:
      "For investors shopping for a lot. We help you find properties that pencil out, assess each one, and guide you to a confident purchase.",
  },
  {
    number: "03",
    icon: Pencil,
    title: "Design",
    description:
      "DADU, duplex, triplex, fourplex. We design what fits your property and Seattle's rules. Drawings and permit-ready packages.",
  },
  {
    number: "04",
    icon: FileCheck,
    title: "Permits & build",
    description:
      "We prep everything for Seattle and walk you through permitting. Then we connect you with builders. We guide you through to the end.",
  },
];

export function Services() {
  return (
    <section id="services" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-sm font-semibold text-[#786fa6] uppercase tracking-wider mb-3">
          The journey
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">
          Acquisition to design to permits.
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-14">
          We guide clients through the full path: identify the right property,
          acquire it, design it, permit it, build it. Then rent, sell, or own.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((item) => (
            <div
              key={item.number}
              className="group rounded-2xl border border-border bg-white p-8 shadow-sm hover:shadow-lg hover:border-[#786fa6]/30 transition-all duration-300"
            >
              <div className="flex items-start gap-5">
                <div className="size-12 rounded-xl bg-[#786fa6]/10 text-[#786fa6] flex items-center justify-center shrink-0 group-hover:bg-[#786fa6]/20 transition-colors">
                  <item.icon className="size-6" strokeWidth={1.5} />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#786fa6] tracking-wider">
                    {item.number}
                  </span>
                  <h3 className="text-xl font-semibold text-foreground mt-1 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
