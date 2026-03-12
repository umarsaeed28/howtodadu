"use client";

import type { DealSignals } from "@/lib/deal-scoring";
import type { ADUReport } from "@/lib/adu-analysis";
import { MiniDonut, HeatBar } from "./visuals";
import { AccessVisual } from "./AccessVisual";
import { getScoreStatus, getScoreStatusStyles } from "@/lib/score-colors";

interface GISDealIntelligenceProps {
  signals: DealSignals;
  report: ADUReport;
}

function ScoreCircle({ score }: { score: number }) {
  const status = getScoreStatus(score);
  const circleClass =
    status === "green"
      ? "bg-emerald-500"
      : status === "yellow"
        ? "bg-amber-500"
        : "bg-red-500";
  const label = status === "green" ? "Good" : status === "yellow" ? "Mid" : "Bad";

  return (
    <span
      className={`size-4 rounded-full shrink-0 ${circleClass} ring-2 ring-white/80 shadow-sm`}
      aria-label={label}
      title={label}
    />
  );
}

function Panel({
  title,
  rating,
  explanation,
  pct,
  variant,
  index,
}: {
  title: string;
  rating: string;
  explanation: string;
  pct: number;
  variant: "donut" | "heat";
  index: number;
}) {
  const { border } = getScoreStatusStyles(pct);

  return (
    <div
      className={`rounded-xl border border-border bg-background p-5 pl-6 border-l-4 hover:border-border/80 transition-colors animate-scale-in ${border}`}
      style={{
        animationDelay: `${0.1 + index * 0.08}s`,
        opacity: 0,
        animationFillMode: "forwards",
      }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <div className="flex gap-4 items-center mb-3 flex-wrap">
        <p className="text-base font-medium text-foreground flex-1">{rating}</p>
        <ScoreCircle score={pct} />
        {variant === "donut" && (
          <div className="shrink-0">
            <MiniDonut value={pct} size={48} strokeWidth={5} />
          </div>
        )}
      </div>
      {variant === "heat" && (
        <div className="mb-3">
          <HeatBar value={pct} />
        </div>
      )}
      <p className="text-sm text-muted-foreground">What this means: {explanation}</p>
    </div>
  );
}

export function GISDealIntelligence({ signals, report }: GISDealIntelligenceProps) {
  const lotOpportunity =
    signals.lotSize.score >= 70 ? "Strong" : signals.lotSize.score >= 50 ? "Moderate" : "Limited";

  const lotExplanation =
    signals.lotSize.sqft >= 5000
      ? "Lot size creates a strong early signal for investment potential."
      : signals.lotSize.sqft >= 4000
        ? "Lot size is workable. Layout optimization may be needed."
        : "Lot configuration may constrain placement and unit size.";

  return (
    <section aria-labelledby="gis-intelligence-heading">
      <h2 id="gis-intelligence-heading" className="text-lg font-medium text-foreground mb-6">
        GIS deal intelligence
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel
          title="Terrain and slope risk"
          rating={signals.terrainSignal.rating.replace(" terrain risk", "")}
          explanation={signals.terrainSignal.description}
          pct={signals.terrainSignal.score}
          variant="donut"
          index={0}
        />
        <Panel
          title="Backyard buildability"
          rating={signals.backyardSignal.rating}
          explanation={signals.backyardSignal.description}
          pct={signals.backyardSignal.score}
          variant="heat"
          index={1}
        />
        <div
          className={`rounded-xl border border-border bg-background p-5 pl-6 border-l-4 hover:border-border/80 transition-colors animate-scale-in ${getScoreStatusStyles(signals.accessSignal.score).border}`}
          style={{
            animationDelay: "0.26s",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Access feasibility
          </p>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <ScoreCircle score={signals.accessSignal.score} />
          </div>
          <AccessVisual access={report.access} score={signals.accessSignal.score} />
          <p className="text-xs text-muted-foreground mt-3">What this means: {signals.accessSignal.description}</p>
        </div>
        <Panel
          title="Lot opportunity"
          rating={lotOpportunity}
          explanation={lotExplanation}
          pct={signals.lotSize.score}
          variant="heat"
          index={3}
        />
      </div>
    </section>
  );
}
