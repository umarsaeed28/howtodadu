const ITEMS = [
  "3 projects underwritten",
  "Live with Puget Sound developers",
  "Grounded in NWMLS + King County GIS",
];

export function TrustStrip() {
  return (
    <section aria-label="Credibility" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 py-4">
        {ITEMS.map((item, i) => (
          <span key={item} className="flex items-center gap-3">
            {i > 0 ? (
              <span className="pencil-mono text-[var(--hairline)]" aria-hidden>
                ·
              </span>
            ) : null}
            <span className="pencil-mono text-[0.72rem] uppercase tracking-[0.12em] text-[var(--slate)]">
              {item}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
