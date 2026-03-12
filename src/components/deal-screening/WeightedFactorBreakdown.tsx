"use client";

import type { FactorBreakdownItem } from "@/lib/deal-scoring";
import { useCountUp } from "@/hooks/useCountUp";
import { getScoreBgClass } from "@/lib/score-colors";

interface WeightedFactorBreakdownProps {
  factors: FactorBreakdownItem[];
  totalScore: number;
}

export function WeightedFactorBreakdown({ factors, totalScore }: WeightedFactorBreakdownProps) {
  if (!factors.length) return null;
  const displayTotal = useCountUp(totalScore, 600);

  return (
    <section
      className="rounded-2xl border border-border bg-muted/5 p-6 md:p-8"
      aria-labelledby="factor-breakdown-heading"
    >
      <h2 id="factor-breakdown-heading" className="text-lg font-medium text-foreground mb-4 animate-fade-in-up">
        How the Deal Score is formed
      </h2>
      {/* Stacked bar: each segment = factor contribution */}
      <div
        className="h-4 w-full rounded-lg overflow-hidden flex mb-6 animate-fade-in-up"
        role="img"
        aria-label="Factor contributions stacked by weight"
      >
        {factors.map((f, i) => (
          <div
            key={f.name}
            className={`h-full animate-bar-fill opacity-90 hover:opacity-100 ${getScoreBgClass(f.score)}`}
            style={{
              width: `${f.contribution}%`,
              transformOrigin: "left",
              animationDelay: `${i * 80}ms`,
              animationFillMode: "forwards",
              minWidth: f.contribution > 0 ? "4px" : "0",
            }}
            title={`${f.name}: ${f.contribution} pts`}
          />
        ))}
      </div>
      <div className="space-y-5">
        {factors.map((f, i) => (
          <div
            key={f.name}
            className="animate-fade-in-up"
            style={{ animationDelay: `${0.05 * i}s`, opacity: 0, animationFillMode: "forwards" }}
          >
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-foreground">{f.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {f.contribution} pts <span className="text-foreground/60">(weight {f.weight})</span>
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted-foreground/15 overflow-hidden">
              <div
                className={`h-full rounded-full animate-bar-fill ${getScoreBgClass(f.score)}`}
                style={{
                  width: `${f.score}%`,
                  transformOrigin: "left",
                  animationDelay: `${i * 100}ms`,
                  animationFillMode: "forwards",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{f.explanation}</p>
          </div>
        ))}
      </div>
      <p
        className="text-xs text-muted-foreground mt-6 pt-6 border-t border-border tabular-nums animate-fade-in-up"
        style={{ animationDelay: `${factors.length * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}
      >
        Total score: <span className="font-medium text-foreground">{displayTotal}</span> of 100. Weighted combination
        of zoning, lot, terrain, backyard, access, and context.
      </p>
    </section>
  );
}
