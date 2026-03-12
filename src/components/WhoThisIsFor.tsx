export function WhoThisIsFor() {
  const audiences = [
    "Investors exploring middle housing opportunities",
    "Buyers looking for properties that can support a DADU or small multifamily",
    "Property owners evaluating the potential of their lot",
    "First time developers who want guidance through Seattle's zoning and permitting process",
  ];

  return (
    <section
      id="who"
      className="py-20 md:py-28 border-t border-[var(--border)] bg-[var(--muted)]/50"
      aria-labelledby="who-title"
    >
      <div className="mx-auto max-w-3xl px-6 md:px-12">
        <h2
          id="who-title"
          className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-12"
        >
          Who this is for
        </h2>

        <ul className="space-y-6" role="list">
          {audiences.map((item, i) => (
            <li key={i} className="flex gap-4">
              <span
                className="shrink-0 size-6 rounded-full border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--muted-foreground)]"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="text-[var(--muted-foreground)] leading-relaxed">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
