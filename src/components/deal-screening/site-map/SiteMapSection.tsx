"use client";

import { useState, useCallback } from "react";
import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { deriveSiteAnalysis } from "@/lib/site-analysis-data";
import type { MapOverlayKey } from "./MapOverlayToggleGroup";
import { MapOverlayToggleGroup } from "./MapOverlayToggleGroup";
import { ArchitecturalAnalysisCards } from "./ArchitecturalAnalysisCards";
import { ConstraintsReviewList } from "./ConstraintsReviewList";
import { VectorSitePlan } from "../VectorSitePlan";

const DEFAULT_OVERLAYS: Record<MapOverlayKey, boolean> = {
  sun: true,
  wind: true,
  slope: false,
  buildableEnvelope: true,
  structures: true,
  access: false,
  trees: false,
  adjacency: false,
};

interface SiteMapSectionProps {
  result: FeasibilityResult;
  report: ADUReport | null;
  address: string;
  siteSummary?: string;
  className?: string;
}

export function SiteMapSection({
  result,
  report,
  address,
  siteSummary,
  className = "",
}: SiteMapSectionProps) {
  const [overlays, setOverlays] = useState<Record<MapOverlayKey, boolean>>(DEFAULT_OVERLAYS);
  const siteAnalysis = deriveSiteAnalysis(result, report);

  const toggleOverlay = useCallback((key: MapOverlayKey) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const summary =
    siteSummary ??
    `This ${report?.stats?.find((s) => s.label === "Lot Size")?.value ?? "—"} sq ft parcel in ${
      report?.stats?.find((s) => s.label === "Zoning")?.value ?? "—"
    } zoning. ${report?.headline ?? ""}`;

  return (
    <section
      className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] ${className}`}
      aria-labelledby="site-map-heading"
    >
      <h2 id="site-map-heading" className="sr-only">
        Site map with architectural analysis
      </h2>

      {/* Header */}
      <div className="p-4 md:p-5 border-b border-[var(--border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
          Site analysis
        </p>
        <p className="text-sm text-[var(--foreground)] leading-relaxed">{summary}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 min-h-0">
        {/* A. Main Visual Map Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="p-3 md:p-4 flex-1 min-h-[280px] flex flex-col">
            <VectorSitePlan
              lot={result.lot}
              feasibility={result.feasibility}
              report={report}
              sitePlan={result.sitePlan}
              address={address}
              zoomable
              siteCoordinates={result.coordinates}
              overlays={{
                sun: overlays.sun,
                wind: overlays.wind,
                slope: overlays.slope,
                buildableEnvelope: overlays.buildableEnvelope,
                structures: overlays.structures,
                access: overlays.access,
                trees: overlays.trees,
                adjacency: overlays.adjacency,
              }}
              contours={result.contours ?? []}
            />
          </div>

          {/* Overlay toggles */}
          <div className="px-3 md:px-4 pb-3 border-t border-[var(--border)] pt-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Overlays
            </p>
            <MapOverlayToggleGroup overlays={overlays} onToggle={toggleOverlay} />
          </div>
        </div>

        {/* B. Architectural Site Analysis Summary Panel */}
        <div className="lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] p-4 md:p-5 flex flex-col gap-6 overflow-y-auto">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Summary
            </p>
            <ArchitecturalAnalysisCards data={siteAnalysis} />
          </div>
          <div className="pt-2 border-t border-[var(--border)]">
            <ConstraintsReviewList items={siteAnalysis.constraintsToReview} />
          </div>
        </div>
      </div>
    </section>
  );
}
