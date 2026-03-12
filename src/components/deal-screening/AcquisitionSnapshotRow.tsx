"use client";

import type { DealSignals } from "@/lib/deal-scoring";
import type { ADUReport } from "@/lib/adu-analysis";
import { getScoreStatus } from "@/lib/score-colors";

interface AcquisitionSnapshotRowProps {
  signals: DealSignals;
  report: ADUReport;
}

function ScoreCircle({ score }: { score: number }) {
  const status = getScoreStatus(score);
  const circleClass =
    status === "green" ? "bg-emerald-500" : status === "yellow" ? "bg-amber-500" : "bg-red-500";
  return (
    <span
      className={`size-4 rounded-full shrink-0 ${circleClass} ring-2 ring-white/80 shadow-sm`}
      aria-label={status === "green" ? "Good" : status === "yellow" ? "Mid" : "Bad"}
    />
  );
}

export function AcquisitionSnapshotRow({ signals, report }: AcquisitionSnapshotRowProps) {
  const cards = [
    {
      label: "Lot Size",
      status: signals.lotSize.sqft >= 4000 ? "Favorable" : "Review",
      value: `${signals.lotSize.sqft.toLocaleString()} sq ft`,
      pct: signals.lotSize.score,
      explanation: signals.lotSize.sqft >= 4000 ? "Lot size supports development." : "Lot may constrain footprint.",
    },
    {
      label: "Terrain",
      status: signals.terrainSignal.rating.replace(" terrain risk", ""),
      value: "",
      pct: signals.terrainSignal.score,
      explanation: signals.terrainSignal.description,
    },
    {
      label: "Backyard",
      status: signals.backyardSignal.rating,
      value: "",
      pct: signals.backyardSignal.score,
      explanation: signals.backyardSignal.description,
    },
    {
      label: "Access",
      status: signals.siteOverview.accessSignal,
      value: report.access.sideYardFt != null ? `~${report.access.sideYardFt} ft` : "",
      pct: signals.accessSignal.score,
      explanation: signals.accessSignal.description,
    },
  ];

  return (
    <section
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      aria-label="Property signals"
    >
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-muted/5 p-4 hover:bg-muted/10 transition-colors animate-scale-in"
          style={{
            animationDelay: `${0.1 + i * 0.04}s`,
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <ScoreCircle score={card.pct} />
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {card.label}
            </p>
          </div>
          <p className="text-sm font-medium text-foreground truncate" title={card.status + (card.value ? ` · ${card.value}` : "")}>
            {card.status}
            {card.value ? ` · ${card.value}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{card.explanation}</p>
        </div>
      ))}
    </section>
  );
}
