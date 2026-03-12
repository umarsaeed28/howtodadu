"use client";

interface HeightBarChartProps {
  heightLimitFt: number;
  lotWidthFt?: number;
  className?: string;
}

/** Horizontal bar chart for height limit with 5 ft interval grading. */
export function HeightBarChart({
  heightLimitFt,
  lotWidthFt,
  className = "",
}: HeightBarChartProps) {
  const maxHeight = Math.ceil(heightLimitFt / 5) * 5 || 30;
  const fillPercent = (heightLimitFt / maxHeight) * 100;
  const steps = [0, 5, 10, 15, 20, 25, 30].filter((h) => h <= maxHeight);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="label mb-0">Height limit</p>
        <span className="text-sm tabular-nums text-[var(--foreground)] shrink-0">
          {heightLimitFt} ft{lotWidthFt != null && ` · Lot width ~${lotWidthFt} ft`}
        </span>
      </div>
      <div className="relative">
        <div className="h-8 rounded-sm overflow-hidden border border-[var(--border)] bg-[var(--muted)]">
          <div
            className="h-full bg-[var(--foreground)] rounded-sm transition-all duration-500"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        {steps.map((h) => (
          <span
            key={h}
            className={`absolute text-[10px] text-[var(--muted-foreground)] tabular-nums top-full mt-0.5 ${
              h === 0 ? "left-0 translate-x-0" : h === maxHeight ? "left-full -translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ left: h === 0 ? 0 : h === maxHeight ? "100%" : `${(h / maxHeight) * 100}%` }}
          >
            {h}'
          </span>
        ))}
      </div>
    </div>
  );
}
