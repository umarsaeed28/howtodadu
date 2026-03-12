"use client";

import type { DealInterpretation } from "@/lib/deal-scoring";
import type { AcquisitionRecommendation } from "@/lib/deal-scoring";

interface SummaryAndRecommendationProps {
  interpretation: DealInterpretation;
  recommendation: AcquisitionRecommendation;
  risks: string[];
}

const FALLBACK_RISKS = ["Public data may be incomplete", "Feasibility is preliminary only"];

function getBannerStyles(rec: AcquisitionRecommendation) {
  if (rec === "Pursue") return "border-emerald-500/30 bg-emerald-500/5";
  if (rec === "Investigate") return "border-amber-500/30 bg-amber-500/5";
  if (rec === "Caution") return "border-amber-600/30 bg-amber-600/10";
  return "border-neutral-400/30 bg-neutral-500/10";
}

function getLabelStyles(rec: AcquisitionRecommendation) {
  if (rec === "Pursue") return "text-emerald-700";
  if (rec === "Investigate") return "text-amber-700";
  if (rec === "Caution") return "text-amber-800";
  return "text-neutral-600";
}

export function SummaryAndRecommendation({
  interpretation,
  recommendation,
  risks,
}: SummaryAndRecommendationProps) {
  const displayRisks = [...risks];
  FALLBACK_RISKS.forEach((r) => {
    if (!displayRisks.includes(r)) displayRisks.push(r);
  });
  const topRisks = displayRisks.slice(0, 3);

  return (
    <section
      className={`rounded-2xl border p-6 md:p-8 animate-scale-in ${getBannerStyles(recommendation)}`}
      aria-labelledby="summary-heading"
      style={{ animationDelay: "0.15s", opacity: 0, animationFillMode: "forwards" }}
    >
      <h2 id="summary-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Summary
      </h2>
      <p className={`text-2xl md:text-3xl font-medium mb-4 ${getLabelStyles(recommendation)}`}>
        {recommendation}
      </p>
      <p className="text-foreground leading-relaxed mb-5">{interpretation.recommendation}</p>

      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Risks to verify
      </p>
      <ul className="space-y-1 mb-5" role="list">
        {topRisks.map((risk) => (
          <li key={risk} className="text-sm text-foreground flex items-start gap-2">
            <span className="text-amber-600 shrink-0">•</span>
            {risk}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Preliminary insights only. Verify all factors before acquisition.
      </p>
    </section>
  );
}
