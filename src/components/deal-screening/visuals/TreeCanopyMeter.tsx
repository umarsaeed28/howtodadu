"use client";

interface TreeCanopyMeterProps {
  percent: number | null;
  className?: string;
}

/** Simple meter for tree canopy coverage. */
export function TreeCanopyMeter({ percent, className = "" }: TreeCanopyMeterProps) {
  const pct = percent != null ? Math.min(100, percent) : 0;

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-[var(--muted-foreground)]">Tree canopy</span>
        <span className="font-display text-sm tabular-nums text-[var(--foreground)]">
          {percent != null ? `~${percent.toFixed(1)}%` : "—"}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-[var(--muted)]">
        <div
          className="h-full rounded-full bg-[var(--foreground)]/40 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
        Tree removal may require permits
      </p>
    </div>
  );
}
