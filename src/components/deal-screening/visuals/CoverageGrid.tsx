"use client";

interface CoverageGridProps {
  usedPercent: number;
  maxPercent: number;
  /** Exact existing coverage in sq ft (footprint of structures on lot). */
  usedSqft?: number;
  availableSqft?: number;
  className?: string;
}

/** 2D grid diagram showing lot coverage: used (existing) vs available (buildable). */
export function CoverageGrid({
  usedPercent,
  maxPercent,
  usedSqft,
  availableSqft,
  className = "",
}: CoverageGridProps) {
  const totalCells = 100;
  const usedCells = Math.round((usedPercent / 100) * totalCells);
  const availableCells = Math.round(((maxPercent - usedPercent) / 100) * totalCells);
  const overLimitCells = totalCells - usedCells - Math.max(0, availableCells);

  return (
    <div className={className}>
      <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-2">
        <span>Coverage used: {usedPercent.toFixed(1)}%{usedSqft != null && ` (${usedSqft.toLocaleString()} sq ft footprint)`}</span>
        <span>Limit: {maxPercent}%</span>
      </div>
      <div
        className="grid gap-0.5 aspect-square max-w-[220px] rounded overflow-hidden border border-[var(--border)]"
        style={{ gridTemplateColumns: `repeat(10, 1fr)`, gridTemplateRows: `repeat(10, 1fr)` }}
        role="img"
        aria-label={`Lot coverage: ${usedPercent.toFixed(1)}% used (${usedSqft?.toLocaleString() ?? "—"} sq ft footprint), ${maxPercent}% limit, ${availableSqft?.toLocaleString() ?? "—"} sq ft buildable`}
      >
        {Array.from({ length: totalCells }).map((_, i) => {
          let fill: "used" | "available" | "over";
          if (i < usedCells) fill = "used";
          else if (i < usedCells + Math.max(0, availableCells)) fill = "available";
          else fill = "over";

          return (
            <div
              key={i}
              className={`transition-colors ${
                fill === "used"
                  ? "bg-[var(--foreground)]"
                  : fill === "available"
                    ? "bg-emerald-500/70"
                    : "bg-[var(--muted)]"
              }`}
            />
          );
        })}
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
