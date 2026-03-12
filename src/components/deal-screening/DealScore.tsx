import type { DealScoreResult } from "@/lib/deal-scoring";

interface DealScoreProps {
  result: DealScoreResult;
}

function getCategoryStyles(category: string) {
  if (category === "Strong candidate") return "text-emerald-600";
  if (category === "Promising but needs review") return "text-amber-600";
  if (category === "Moderate risk") return "text-orange-600";
  if (category === "Challenging site") return "text-amber-700";
  return "text-neutral-500";
}

export function DealScore({ result }: DealScoreProps) {
  const { score, scoreCategory, interpretation } = result;
  const pct = score / 100;
  const rotation = -90 + pct * 180; // 0 = left, 100 = right

  return (
    <section
      className="border border-border rounded-lg p-8 md:p-10 bg-background"
      aria-labelledby="deal-score-heading"
    >
      <h2 id="deal-score-heading" className="sr-only">
        Confidence Score
      </h2>

      <div className="flex flex-col md:flex-row md:items-center gap-10">
        {/* Gauge visualization */}
        <div className="shrink-0" role="img" aria-label={`Confidence score ${score} out of 100`}>
          <div className="relative size-40 md:size-48">
            <svg viewBox="0 0 120 80" className="w-full h-full" aria-hidden>
              <path
                d="M 20 70 A 50 50 0 0 1 100 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-muted/30"
                aria-hidden
              />
              <path
                d="M 20 70 A 50 50 0 0 1 100 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={3.14 * 50}
                strokeDashoffset={3.14 * 50 * (1 - pct)}
                className="text-foreground transition-all duration-1000"
                aria-hidden
              />
            </svg>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-2 text-center">
              <span className="text-4xl md:text-5xl font-light tracking-tight tabular-nums">
                {score}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <p
            className={`text-sm font-medium uppercase tracking-wider mb-2 ${getCategoryStyles(scoreCategory)}`}
          >
            {scoreCategory}
          </p>
          <p className="text-lg text-foreground leading-relaxed max-w-md">
            {interpretation}
          </p>
        </div>
      </div>
    </section>
  );
}
