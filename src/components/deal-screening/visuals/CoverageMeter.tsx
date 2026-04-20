"use client";

import {
  coverageAvailabilityBand,
  coverageAvailabilityHint,
  coverageAvailabilityValueClass,
} from "@/lib/metric-health";

interface CoverageMeterProps {
  usedPercent: number;
  maxPercent: number;
  availableSqft?: number;
  className?: string;
}

/** Progress meter for lot coverage: used vs limit. */
export function CoverageMeter({
  usedPercent,
  maxPercent,
  availableSqft,
  className = "",
}: CoverageMeterProps) {
  const fillPct = Math.min(100, (usedPercent / maxPercent) * 100);
  const isOver = usedPercent > maxPercent;
  const availBand = coverageAvailabilityBand(availableSqft);

  return (
    <div className={className}>
      <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-2">
        <span>Coverage used: {usedPercent.toFixed(1)}%</span>
        <span>Limit: {maxPercent}%</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-[var(--muted)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver ? "bg-amber-600" : "bg-[var(--foreground)]"
          }`}
          style={{ width: `${Math.min(100, fillPct)}%` }}
        />
      </div>
      {availableSqft != null && (
        <p
          className="text-xs mt-2 tabular-nums"
          title={coverageAvailabilityHint(availBand)}
        >
          <span className="text-[var(--muted-foreground)]">~</span>
          <span className={`font-semibold ${coverageAvailabilityValueClass(availBand)}`}>
            {availableSqft.toLocaleString()} sq ft
          </span>
          <span className="text-[var(--muted-foreground)]"> available</span>
        </p>
      )}
    </div>
  );
}
