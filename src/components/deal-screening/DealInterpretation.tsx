import type { DealInterpretation } from "@/lib/deal-scoring";

interface DealInterpretationProps {
  interpretation: DealInterpretation;
}

export function DealInterpretation({ interpretation }: DealInterpretationProps) {
  return (
    <section
      className="border border-border rounded-lg p-6 bg-background"
      aria-labelledby="deal-interpretation-heading"
    >
      <h2
        id="deal-interpretation-heading"
        className="text-lg font-medium text-foreground mb-6"
      >
        Deal interpretation
      </h2>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Opportunity
          </p>
          <p className="text-foreground leading-relaxed">{interpretation.opportunity}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Risks
          </p>
          <p className="text-foreground leading-relaxed">{interpretation.risks}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Recommendation
          </p>
          <p className="text-foreground leading-relaxed">{interpretation.recommendation}</p>
        </div>
      </div>
    </section>
  );
}
