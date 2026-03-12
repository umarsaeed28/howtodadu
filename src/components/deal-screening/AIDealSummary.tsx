"use client";

import type { DealInterpretation } from "@/lib/deal-scoring";

interface AIDealSummaryProps {
  interpretation: DealInterpretation;
}

export function AIDealSummary({ interpretation }: AIDealSummaryProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-muted/5 p-6 md:p-8 animate-fade-in-up"
      aria-labelledby="ai-summary-heading"
      style={{ animationDelay: "0.1s", opacity: 0, animationFillMode: "forwards" }}
    >
      <h2 id="ai-summary-heading" className="text-lg font-medium text-foreground mb-6">
        Deal summary
      </h2>
      <div className="space-y-6 text-foreground leading-relaxed">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            Why this deal looks attractive
          </p>
          <p>{interpretation.opportunity}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            What needs verification
          </p>
          <p>{interpretation.risks}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            Recommended next action
          </p>
          <p className="font-medium">{interpretation.recommendation}</p>
        </div>
      </div>
    </section>
  );
}
