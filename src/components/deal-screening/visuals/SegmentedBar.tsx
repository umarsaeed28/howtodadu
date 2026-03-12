"use client";

import { getScoreBgClass } from "@/lib/score-colors";

interface SegmentedBarProps {
  value: number;
  segments?: number;
}

/** Bar divided into segments; filled segments based on value. Low=red, high=green. */
export function SegmentedBar({ value, segments = 5 }: SegmentedBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const filledCount = Math.round((pct / 100) * segments);
  const fillClass = getScoreBgClass(pct);

  return (
    <div
      className="flex gap-1 h-2 w-full"
      role="img"
      aria-label={`${value} percent, ${filledCount} of ${segments} segments`}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className="flex-1 h-full rounded-sm overflow-hidden bg-muted-foreground/15">
          {i < filledCount && (
            <div
              className={`h-full w-full rounded-sm animate-bar-fill ${fillClass}`}
              style={{
                transformOrigin: "left",
                animationDelay: `${i * 80}ms`,
                animationFillMode: "forwards",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
