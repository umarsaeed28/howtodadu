"use client";

import type { SiteAnalysisData } from "@/lib/site-analysis-data";
import { SLOPE_LABELS, TREE_LABELS } from "@/lib/site-analysis-data";

interface ArchitecturalAnalysisCardsProps {
  data: SiteAnalysisData;
  className?: string;
}

function Card({
  label,
  status,
  explanation,
  className = "",
}: {
  label: string;
  status: string;
  explanation: string;
  className?: string;
}) {
  return (
    <div
      className={`p-3 border border-[var(--border)] rounded-sm bg-[var(--background)] ${className}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-[var(--foreground)]">{status}</p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-snug">
        {explanation}
      </p>
    </div>
  );
}

export function ArchitecturalAnalysisCards({
  data,
  className = "",
}: ArchitecturalAnalysisCardsProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}
      aria-label="Architectural site analysis summary"
    >
      <Card
        label={data.sunAnalysis.label}
        status={data.sunAnalysis.status}
        explanation={data.sunAnalysis.explanation}
      />
      <Card
        label={data.windAnalysis.label}
        status={data.windAnalysis.status}
        explanation={data.windAnalysis.explanation}
      />
      <Card
        label="Topography"
        status={SLOPE_LABELS[data.slopeCondition]}
        explanation={data.slopeExplanation}
      />
      <Card
        label="Access"
        status={
          data.accessCondition === "alley"
            ? "Alley"
            : data.accessCondition === "corner_workable"
              ? "Corner"
              : data.accessCondition === "side_workable"
                ? "Side yard"
                : data.accessCondition === "side_tight"
                  ? "Side tight"
                  : data.accessCondition === "limited"
                    ? "Limited"
                    : "Verify"
        }
        explanation={data.accessExplanation}
      />
      <Card
        label="Tree canopy"
        status={TREE_LABELS[data.treeCondition]}
        explanation={data.treeExplanation}
      />
      <Card
        label="Privacy & adjacency"
        status={
          data.privacyCondition === "close_side"
            ? "Close side"
            : data.privacyCondition === "open_rear"
              ? "Open rear"
              : data.privacyCondition === "mixed"
                ? "Mixed"
                : "Verify"
        }
        explanation={data.privacyExplanation}
      />
      <Card
        label="Street & entry"
        status={data.streetContext}
        explanation={data.streetExplanation}
        className="sm:col-span-2"
      />
    </div>
  );
}
