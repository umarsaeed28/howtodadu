"use client";

import { useRef, useEffect } from "react";
import { useMounted } from "@/hooks/useMounted";
import { getScoreStrokeClass } from "@/lib/score-colors";

interface SemicircleGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Half-circle gauge (180°) — good for terrain, risk. */
export function SemicircleGauge({ value, size = 56, strokeWidth = 6, className = "" }: SemicircleGaugeProps) {
  const mounted = useMounted();
  const ref = useRef<SVGPathElement>(null);
  const r = (size - strokeWidth) / 2;
  const circumference = Math.PI * r;
  const strokeDash = circumference * (value / 100);

  useEffect(() => {
    const el = ref.current;
    if (!el || !mounted) return;
    el.animate(
      [{ strokeDashoffset: circumference }, { strokeDashoffset: circumference - strokeDash }],
      { duration: 800, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  }, [mounted, circumference, strokeDash]);

  const cx = size / 2;
  const pathD = `M ${cx - r} ${cx} A ${r} ${r} 0 0 0 ${cx + r} ${cx}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={`${value} percent`}>
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/15"
      />
      <path
        ref={ref}
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        className={getScoreStrokeClass(value)}
      />
    </svg>
  );
}
