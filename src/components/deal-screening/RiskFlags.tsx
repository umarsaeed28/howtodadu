interface RiskFlagsProps {
  risks: string[];
}

export function RiskFlags({ risks }: RiskFlagsProps) {
  if (risks.length === 0) {
    return (
      <section
        className="border border-border rounded-lg p-6 bg-background"
        aria-labelledby="risk-flags-heading"
      >
        <h2
          id="risk-flags-heading"
          className="text-lg font-medium text-foreground mb-4"
        >
          Risk flags
        </h2>
        <p className="text-muted-foreground text-sm">
          No major risk flags identified.
        </p>
      </section>
    );
  }

  return (
    <section
      className="border border-border rounded-lg p-6 bg-background"
      aria-labelledby="risk-flags-heading"
    >
      <h2
        id="risk-flags-heading"
        className="text-lg font-medium text-foreground mb-4"
      >
        Risk flags
      </h2>
      <ul className="space-y-2" role="list">
        {risks.map((risk, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <span
              className="size-1.5 rounded-full bg-amber-500 shrink-0"
              aria-hidden
            />
            {risk}
          </li>
        ))}
      </ul>
    </section>
  );
}
