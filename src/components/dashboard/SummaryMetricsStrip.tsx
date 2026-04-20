"use client";

import { daduScoreClass } from "@/lib/metric-health";

interface SummaryMetricsStripProps {
  total: number;
  strongConfidence: number;
  mediumConfidence: number;
  needsReview: number;
  lowConfidence: number;
  favorited: number;
  avgLot: number | null;
  avgScore: number | null;
  loading?: boolean;
}

export function SummaryMetricsStrip({
  total,
  strongConfidence,
  mediumConfidence,
  needsReview,
  lowConfidence,
  favorited,
  avgLot,
  avgScore,
  loading,
}: SummaryMetricsStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-zinc-100"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  const cell = (
    label: string,
    value: string | number,
    sub?: string,
    valueClassName = "text-zinc-900"
  ) => (
    <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClassName}`}>{value}</p>
      {sub ? <p className="text-[11px] text-zinc-500">{sub}</p> : null}
    </div>
  );

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8"
      aria-label="Summary metrics"
    >
      {cell("Properties", total)}
      {cell("Strong", strongConfidence, "confidence")}
      {cell("Medium", mediumConfidence)}
      {cell("Needs review", needsReview)}
      {cell("Low", lowConfidence)}
      {cell("Favorited", favorited)}
      {cell("Avg lot", avgLot != null ? avgLot.toLocaleString() + " sf" : "—")}
      {cell(
        "Avg score",
        avgScore ?? "—",
        "/ 100",
        avgScore != null ? daduScoreClass(avgScore) : "text-zinc-900"
      )}
    </section>
  );
}
