"use client";

import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { VectorSitePlan } from "./VectorSitePlan";
import { SunWindPanel } from "./SunWindPanel";

interface VisualPropertyContextProps {
  result: FeasibilityResult;
  report: ADUReport;
  address: string;
  /** Plain language site summary */
  siteSummary?: string;
}

export function VisualPropertyContext({
  result,
  report,
  address,
  siteSummary,
}: VisualPropertyContextProps) {
  const summary =
    siteSummary ??
    `This ${report.stats.find((s) => s.label === "Lot Size")?.value ?? "—"} sq ft parcel in ${
      report.stats.find((s) => s.label === "Zoning")?.value ?? "—"
    } zoning. ${report.headline}`;

  return (
    <section
      className="aura-panel overflow-hidden rounded-xl"
      aria-labelledby="property-context-heading"
    >
      <h2 id="property-context-heading" className="sr-only">
        Site plan with solar and wind orientation
      </h2>
      <div className="flex flex-col">
        <div className="p-4 border-b border-[var(--aura-border)]">
          <p className="aura-overline mb-1">Site plan</p>
          <p className="text-[var(--aura-text)] text-sm leading-relaxed">{summary}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-0 min-h-0">
          <div className="flex-1 min-w-0 p-4 flex items-stretch">
            <VectorSitePlan
              lot={result.lot}
              feasibility={result.feasibility}
              report={report}
              sitePlan={result.sitePlan}
              address={address}
              zoomable
            />
          </div>
          <div className="sm:w-[160px] shrink-0 border-t sm:border-t-0 sm:border-l border-[var(--aura-border)] p-3">
            <SunWindPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
