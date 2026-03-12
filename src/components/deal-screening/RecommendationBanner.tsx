"use client";

import type { AcquisitionRecommendation } from "@/lib/deal-scoring";

interface RecommendationBannerProps {
  recommendation: AcquisitionRecommendation;
  reason: string;
}

function getBannerStyles(rec: AcquisitionRecommendation) {
  if (rec === "Pursue")
    return "border-emerald-500/30 bg-emerald-500/5";
  if (rec === "Investigate")
    return "border-amber-500/30 bg-amber-500/5";
  if (rec === "Caution")
    return "border-amber-600/30 bg-amber-600/10";
  return "border-neutral-400/30 bg-neutral-500/10";
}

function getLabelStyles(rec: AcquisitionRecommendation) {
  if (rec === "Pursue") return "text-emerald-700";
  if (rec === "Investigate") return "text-amber-700";
  if (rec === "Caution") return "text-amber-800";
  return "text-neutral-600";
}

export function RecommendationBanner({ recommendation, reason }: RecommendationBannerProps) {
  return (
    <section
      className={`rounded-2xl border p-6 md:p-8 animate-scale-in ${getBannerStyles(recommendation)}`}
      aria-labelledby="recommendation-heading"
      style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}
    >
      <h2 id="recommendation-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Recommendation
      </h2>
      <p className={`text-2xl md:text-3xl font-medium mb-3 ${getLabelStyles(recommendation)}`}>
        {recommendation}
      </p>
      <p className="text-foreground leading-relaxed transition-opacity">{reason}</p>
    </section>
  );
}
