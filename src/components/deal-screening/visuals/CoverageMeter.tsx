"use client";

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
        <p className="text-xs text-[var(--muted-foreground)] mt-2 tabular-nums">
          ~{availableSqft.toLocaleString()} sq ft available
        </p>
      )}
    </div>
  );
}
