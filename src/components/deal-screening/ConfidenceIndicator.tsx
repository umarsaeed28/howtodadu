import type { ConfidenceLevel } from "@/lib/deal-scoring";

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
}

export function ConfidenceIndicator({ level }: ConfidenceIndicatorProps) {
  return (
    <section
      className="border border-border rounded-lg p-6 bg-background"
      aria-labelledby="confidence-heading"
    >
      <h2
        id="confidence-heading"
        className="text-lg font-medium text-foreground mb-2"
      >
        Confidence
      </h2>
      <p className="text-muted-foreground font-medium mb-4">{level}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        This tool provides preliminary insights only and should not be treated
        as a final feasibility determination.
      </p>
    </section>
  );
}
