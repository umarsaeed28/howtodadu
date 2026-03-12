"use client";

interface HeatBarProps {
  value: number;
}

/** Horizontal bar with gradient fill (low=red, high=green). */
export function HeatBar({ value }: HeatBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      className="h-2 w-full rounded-full overflow-hidden bg-muted-foreground/10"
      role="img"
      aria-label={`${value} percent`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-red-500/90 via-amber-500/80 to-emerald-500/90 animate-bar-fill"
        style={{
          width: `${pct}%`,
          transformOrigin: "left",
        }}
      />
    </div>
  );
}
