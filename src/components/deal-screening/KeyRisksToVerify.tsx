"use client";

interface KeyRisksToVerifyProps {
  risks: string[];
  alwaysInclude?: string[];
}

const FALLBACK_RISKS = [
  "Public data may be incomplete",
  "Feasibility is preliminary only",
];

export function KeyRisksToVerify({ risks, alwaysInclude = FALLBACK_RISKS }: KeyRisksToVerifyProps) {
  const combined = [...risks];
  alwaysInclude.forEach((r) => {
    if (!combined.includes(r)) combined.push(r);
  });
  const display = combined.slice(0, 5);

  return (
    <section
      className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 md:p-8 animate-fade-in-up"
      aria-labelledby="risks-heading"
      style={{ animationDelay: "0.18s", opacity: 0, animationFillMode: "forwards" }}
    >
      <h2 id="risks-heading" className="text-lg font-medium text-foreground mb-4">
        Key risks to verify
      </h2>
      <ul className="space-y-2" role="list">
        {display.map((risk) => (
          <li key={risk} className="flex items-start gap-2 text-sm">
            <span className="text-amber-600 shrink-0">•</span>
            <span className="text-foreground">{risk}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-4">
        This tool provides preliminary insights only. Verify all factors before acquisition.
      </p>
    </section>
  );
}
