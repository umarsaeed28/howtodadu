const stats = [
  {
    value: "100%",
    label: "Seattle focused",
    detail: "We only work in Seattle. Every project is informed by deep local zoning knowledge.",
  },
  {
    value: "4",
    label: "Housing types",
    detail: "DADUs, duplexes, triplexes, and fourplexes \u2014 the full range of middle housing.",
  },
  {
    value: "2",
    label: "Services integrated",
    detail: "Acquisition and design combined. One firm from property search to permit drawings.",
  },
];

export function SocialProof() {
  return (
    <section className="py-24 md:py-32 bg-secondary/50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4">
            Why It Matters
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Seattle&apos;s zoning reforms unlocked new housing types.
            Most people don&apos;t know where to start.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border border-border bg-card rounded-lg p-8"
            >
              <p className="text-4xl md:text-5xl font-semibold tracking-tight mb-2 text-primary">
                {stat.value}
              </p>
              <p className="font-semibold mb-3">{stat.label}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
