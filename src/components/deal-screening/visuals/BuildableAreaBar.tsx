"use client";

import {
  coverageAvailabilityBand,
  coverageAvailabilityBuildableBarClass,
  coverageAvailabilityValueClass,
} from "@/lib/metric-health";

interface BuildableAreaBarProps {
  availableSqft: number;
  maxSqft?: number;
  label?: string;
  className?: string;
}

/** Horizontal bar showing buildable area vs max. */
export function BuildableAreaBar({
  availableSqft,
  maxSqft = 1200,
  label = "Buildable area",
  className = "",
}: BuildableAreaBarProps) {
  const pct = Math.min(100, (availableSqft / maxSqft) * 100);
  const band = coverageAvailabilityBand(availableSqft);

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
        <span className={`font-display text-lg tabular-nums font-semibold ${coverageAvailabilityValueClass(band)}`}>
          {availableSqft.toLocaleString()} sq ft
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-[var(--muted)]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${coverageAvailabilityBuildableBarClass(band)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {maxSqft && (
        <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
          Up to ~{maxSqft.toLocaleString()} sq ft typical for DADU
        </p>
      )}
    </div>
  );
}
