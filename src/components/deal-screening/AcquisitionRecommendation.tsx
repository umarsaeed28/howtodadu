import type { AcquisitionRecommendation as RecType } from "@/lib/deal-scoring";

interface AcquisitionRecommendationProps {
  recommendation: RecType;
}

function getStyles(rec: RecType) {
  switch (rec) {
    case "Pursue":
      return "bg-emerald-50 border-emerald-200 text-emerald-800";
    case "Investigate":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "Caution":
      return "bg-orange-50 border-orange-200 text-orange-800";
    case "Pass":
      return "bg-neutral-100 border-neutral-200 text-neutral-700";
    default:
      return "bg-muted border-border text-foreground";
  }
}

export function AcquisitionRecommendation({ recommendation }: AcquisitionRecommendationProps) {
  return (
    <section
      className="border border-border rounded-lg p-6 bg-background"
      aria-labelledby="acquisition-rec-heading"
    >
      <h2
        id="acquisition-rec-heading"
        className="text-lg font-medium text-foreground mb-4"
      >
        Acquisition recommendation
      </h2>
      <div
        className={`inline-flex items-center px-4 py-2 rounded-md border text-base font-semibold ${getStyles(recommendation)}`}
        role="status"
      >
        {recommendation}
      </div>
    </section>
  );
}
