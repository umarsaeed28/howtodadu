"use client";

import { useRef, useEffect } from "react";
import { useMounted } from "@/hooks/useMounted";
import { getScoreStrokeClass } from "@/lib/score-colors";

interface MiniDonutProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function MiniDonut({ value, size = 48, strokeWidth = 6, className = "" }: MiniDonutProps) {
  const mounted = useMounted();
  const ref = useRef<SVGCircleElement>(null);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDash = circumference * (value / 100);

  useEffect(() => {
    const el = ref.current;
    if (!el || !mounted) return;
    el.animate(
      [{ strokeDashoffset: circumference }, { strokeDashoffset: circumference - strokeDash }],
      { duration: 800, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  }, [mounted, circumference, strokeDash]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`-rotate-90 ${className}`}
      role="img"
      aria-label={`${value} percent`}
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/15"
      />
      <circle
        ref={ref}
        cx={cx}
        cy={cx}
        r={r}
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
