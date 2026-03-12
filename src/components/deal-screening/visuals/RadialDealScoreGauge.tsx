"use client";

import { useRef, useEffect } from "react";
import { useMounted } from "@/hooks/useMounted";
import { useCountUp } from "@/hooks/useCountUp";

interface RadialDealScoreGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Display number; use countUp for animation */
  displayValue?: number;
}

/** Full radial gauge (270° arc) for deal score 0–100. */
export function RadialDealScoreGauge({
  value,
  size = 120,
  strokeWidth = 8,
  className = "",
  displayValue,
}: RadialDealScoreGaugeProps) {
  const mounted = useMounted();
  const animatedValue = useCountUp(value, 900);
  const ref = useRef<SVGPathElement>(null);

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270° arc: -225° to +45° (top-left to top-right)
  const startAngle = (-225 * Math.PI) / 180;
  const endAngle = (45 * Math.PI) / 180;
  const circumference = (3 / 4) * Math.PI * 2 * r;
  const strokeDash = circumference * (Math.min(100, Math.max(0, value)) / 100);

  useEffect(() => {
    const el = ref.current;
    if (!el || !mounted) return;
    el.animate(
      [
        { strokeDashoffset: circumference },
        { strokeDashoffset: Math.max(0, circumference - strokeDash) },
      ],
      { duration: 1, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  }, [mounted, circumference, strokeDash]);

  const pathD = `M ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(endAngle)} ${cy + r * Math.sin(endAngle)}`;

  const strokeClass =
    value >= 80
      ? "stroke-[var(--foreground)]"
      : value >= 65
        ? "stroke-[var(--foreground)]"
        : value >= 50
          ? "stroke-amber-600"
          : "stroke-amber-700";

  return (
    <div className={`relative ${className}`} role="img" aria-label={`Deal score ${value} out of 100`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-[var(--muted)] opacity-30"
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
          className={strokeClass}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-3xl md:text-4xl tabular-nums text-[var(--foreground)]">
          {mounted ? (displayValue ?? animatedValue) : "—"}
        </span>
      </div>
    </div>
  );
}
