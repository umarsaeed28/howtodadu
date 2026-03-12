import { Search, FileCheck, PenTool, FileText } from "lucide-react";

const services = [
  {
    icon: Search,
    title: "Property Discovery",
    description:
      "Helping investors identify properties where middle housing may be possible.",
  },
  {
    icon: FileCheck,
    title: "Development Feasibility",
    description:
      "Evaluating zoning, lot size, and early development potential.",
  },
  {
    icon: PenTool,
    title: "Architectural Design",
    description:
      "Designing DADUs and small multifamily housing aligned with Seattle regulations.",
  },
  {
    icon: FileText,
    title: "Permit Preparation",
    description:
      "Preparing architectural drawing sets ready for permit submission.",
  },
];

export function WhatWeHelpWith() {
  return (
    <section
      id="services"
      className="py-20 md:py-28 border-t border-[var(--border)]"
      aria-labelledby="help-title"
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <h2
          id="help-title"
          className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-12"
        >
          What we help with
        </h2>

        <div className="grid sm:grid-cols-2 gap-8 mb-12">
          {services.map((item) => (
            <article
              key={item.title}
              className="border border-[var(--border)] rounded-xl p-8 bg-[var(--card)]"
            >
              <div
                className="size-10 rounded-lg border border-[var(--border)] flex items-center justify-center mb-6 text-[var(--muted-foreground)]"
                aria-hidden
              >
                <item.icon className="size-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-medium text-[var(--foreground)] mb-3">
                {item.title}
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div className="border-l-2 border-[var(--primary)]/30 pl-6 py-2">
          <p className="text-sm font-medium text-[var(--foreground)] mb-1">
            Not sure what kind of property to buy?
          </p>
          <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
            We help you understand what to look for before making a purchase.
          </p>
        </div>
      </div>
    </section>
  );
}
