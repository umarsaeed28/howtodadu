const steps = [
  {
    number: "1",
    title: "Explore the Opportunity",
    description:
      "We help you understand where middle housing can work in Seattle. This includes identifying neighborhoods, zoning considerations, and properties worth evaluating.",
  },
  {
    number: "2",
    title: "Evaluate Development Potential",
    description:
      "We assess the property: zoning, lot size, setbacks, coverage, and what can be built. You get a clear picture before making a purchase.",
  },
  {
    number: "3",
    title: "Develop the Design",
    description:
      "We create architectural designs for DADUs or small multifamily housing. Designs are aligned with Seattle regulations and your goals.",
  },
  {
    number: "4",
    title: "Prepare for Permits",
    description:
      "We prepare drawing sets ready for permit submission. We guide you through what Seattle requires and how to navigate the process.",
  },
  {
    number: "5",
    title: "Connect with Builders",
    description:
      "When you are ready to break ground, we connect you with builders and support the handoff from design to construction.",
  },
];

export function HowTheProcessWorks() {
  return (
    <section id="process" className="py-20 md:py-28 border-t border-[var(--border)]" aria-labelledby="process-heading">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <h2 id="process-heading" className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-4">
          How the Process Works
        </h2>
        <p className="text-[var(--muted-foreground)] leading-relaxed max-w-2xl mb-16">
          We guide you from the moment you start exploring an investment to the point where you are ready to break ground.
        </p>

        <ol className="space-y-12 md:space-y-16">
          {steps.map((step) => (
            <li key={step.number} className="flex gap-8">
              <span
                className="shrink-0 size-10 rounded-full border-2 border-[var(--primary)] flex items-center justify-center text-sm font-medium text-[var(--primary)]"
                aria-hidden
              >
                {step.number}
              </span>
              <div>
                <h3 className="font-serif text-lg font-medium text-[var(--foreground)] mb-2">{step.title}</h3>
                <p className="text-[var(--muted-foreground)] leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
