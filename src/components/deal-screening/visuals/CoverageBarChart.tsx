"use client";

interface CoverageBarChartProps {
  usedPercent: number;
  maxPercent: number;
  usedSqft?: number;
  availableSqft?: number;
  className?: string;
}

/** Horizontal bar chart for lot coverage: used (existing) vs available (buildable) footprint. */
export function CoverageBarChart({
  usedPercent,
  maxPercent,
  usedSqft,
  availableSqft,
  className = "",
}: CoverageBarChartProps) {
  const usedWidth = (Math.min(usedPercent, maxPercent) / maxPercent) * 100;
  const availableWidth = 100 - usedWidth;

  return (
    <div className={className}>
      <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-2">
        <span>Coverage: {usedPercent.toFixed(1)}% used{usedSqft != null && ` (${usedSqft.toLocaleString()} sq ft)`}</span>
        <span>Limit: {maxPercent}%</span>
      </div>
      <div className="h-8 rounded-sm overflow-hidden border border-[var(--border)] bg-[var(--muted)] flex">
        <div
          className="h-full bg-[var(--foreground)] transition-all duration-500 shrink-0"
          style={{ width: `${usedWidth}%` }}
        />
        <div
          className="h-full bg-emerald-500/70 transition-all duration-500 shrink-0"
          style={{ width: `${availableWidth}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--foreground)]" aria-hidden />
          Existing footprint
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" aria-hidden />
          Buildable footprint
        </span>
        {availableSqft != null && (
          <span className="tabular-nums font-medium text-[var(--foreground)]">
            {availableSqft.toLocaleString()} sq ft available
          </span>
        )}
      </div>
    </div>
  );
}
