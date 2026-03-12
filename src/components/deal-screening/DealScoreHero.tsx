"use client";

import { useRef, useEffect } from "react";
import type { DealScoreResult, AcquisitionRecommendation } from "@/lib/deal-scoring";
import { useCountUp } from "@/hooks/useCountUp";
import { useMounted } from "@/hooks/useMounted";

interface DealScoreHeroProps {
  result: DealScoreResult;
  recommendation: AcquisitionRecommendation;
}

function getCategoryColor(category: string) {
  if (category === "Exceptional candidate") return "text-emerald-700";
  if (category === "Strong candidate") return "text-emerald-600";
  if (category === "Promising but needs review") return "text-amber-600";
  if (category === "Mixed signals") return "text-amber-700";
  if (category === "High risk") return "text-orange-700";
  return "text-neutral-500";
}

function getGaugeColor(score: number) {
  if (score >= 80) return "stroke-emerald-600";
  if (score >= 65) return "stroke-emerald-500";
  if (score >= 50) return "stroke-amber-500";
  if (score >= 35) return "stroke-orange-500";
  return "stroke-red-500";
}

export function DealScoreHero({ result, recommendation }: DealScoreHeroProps) {
  const { score, scoreCategory, interpretation } = result;
  const pct = score / 100;
  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference * pct;
  const displayScore = useCountUp(score, 1200);
  const mounted = useMounted();
  const gaugeRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = gaugeRef.current;
    if (!el || !mounted) return;
    el.animate(
      [
        { strokeDashoffset: circumference },
        { strokeDashoffset: circumference - strokeDash },
      ],
      { duration: 1200, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  }, [mounted, circumference, strokeDash]);

  return (
    <section
      className="rounded-2xl border border-border bg-background p-8 md:p-12"
      aria-labelledby="deal-score-heading"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
        {/* Animated circular gauge with glow effect */}
        <div
          className="shrink-0 flex justify-center lg:justify-start"
          role="img"
          aria-label={`Confidence score ${score} out of 100`}
        >
          <div className="relative size-44 md:size-52">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 drop-shadow-sm" aria-hidden>
              <defs>
                <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted-foreground/10"
              />
              <circle
                ref={gaugeRef}
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                className={getGaugeColor(score)}
                style={{ filter: "url(#gauge-glow)" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-light tabular-nums">
              {displayScore}
            </span>
          </div>
        </div>

        {/* Copy with staggered fade-in */}
        <div className="flex-1 max-w-xl space-y-1">
          <h2
            id="deal-score-heading"
            className="text-2xl md:text-3xl font-light tracking-tight text-foreground mb-2 animate-fade-in-up"
            style={{ animationDelay: "0.1s", opacity: 0, animationFillMode: "forwards" }}
          >
            Confidence Score
          </h2>
          <p
            className={`text-sm font-medium uppercase tracking-wider mb-2 ${getCategoryColor(scoreCategory)} animate-fade-in-up`}
            style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}
          >
            {scoreCategory}
          </p>
          <p
            className="text-lg text-foreground leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "0.3s", opacity: 0, animationFillMode: "forwards" }}
          >
            {interpretation}
          </p>
        </div>
      </div>

      {/* Text equivalent for accessibility */}
      <p className="sr-only">
        Confidence score {score} out of 100, classified as {scoreCategory}. {interpretation}
      </p>
    </section>
  );
}
