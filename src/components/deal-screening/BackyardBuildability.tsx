import type { BackyardRating } from "@/lib/deal-scoring";

interface BackyardBuildabilityProps {
  rating: BackyardRating;
  description: string;
}

function getIndicatorStyle(rating: BackyardRating) {
  if (rating === "High") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (rating === "Moderate") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export function BackyardBuildability({ rating, description }: BackyardBuildabilityProps) {
  return (
    <section
      className="border border-border rounded-lg p-6 bg-background"
      aria-labelledby="backyard-buildability-heading"
    >
      <h2
        id="backyard-buildability-heading"
        className="text-lg font-medium text-foreground mb-4"
      >
        Backyard buildability
      </h2>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium mb-3 ${getIndicatorStyle(rating)}`}
        role="status"
      >
        <span className="size-2 rounded-full bg-current shrink-0" aria-hidden />
        {rating}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </section>
  );
}
