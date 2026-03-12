"use client";

import { useRef, useState } from "react";
import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { getSeattleDealSignals } from "@/lib/deal-scoring";
import { buildResultsPageData } from "@/lib/results-page-data";
import {
  DealSnapshotSection,
  SitePlanSection,
  PropertyOverviewSection,
  BuildPotentialSection,
  SiteConditionsSection,
  NeighborhoodSignalsSection,
  WhatYouCanBuildSection,
  DisclaimerSection,
} from "./ResultsPageSections";
import { BuildOptionEconomicsSection } from "./BuildOptionEconomics";
import { AddToFavoritesButton } from "./AddToFavoritesButton";
import { useExportReportPdf } from "@/hooks/useExportReportPdf";
import Link from "next/link";

interface DealScreeningResultsProps {
  result: FeasibilityResult;
  report: ADUReport;
}

export function DealScreeningResults({ result, report }: DealScreeningResultsProps) {
  const signals = getSeattleDealSignals(result, report);
  const pageData = buildResultsPageData(result, report, signals);
  const address = pageData.address;
  const addressParts = (address || "Property").split(/,\s*/);
  const streetLine = addressParts[0] ?? "Property";
  const p = result.parcel;
  const reportRef = useRef<HTMLDivElement>(null);
  const exportToPdf = useExportReportPdf();
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const slug = (streetLine ?? "report").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      await exportToPdf(reportRef.current, `DADU-Feasibility-${slug}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      ref={reportRef}
      className="terra-dashboard bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col font-data text-sm"
    >
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-[var(--border)] uppercase tracking-[0.15em] font-bold text-[13px] bg-[var(--background)] sticky top-0 z-10">
        <span className="font-display text-base tracking-[0.05em]">HOW TO DADU</span>
        <div className="flex items-center gap-3">
          <AddToFavoritesButton
            address={address}
            className="!bg-transparent !border-[var(--border)] !text-[var(--foreground)] hover:!bg-[var(--foreground)] hover:!text-[var(--background)]"
          />
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="bg-transparent border border-[var(--border)] text-[var(--foreground)] px-4 py-2 text-xs uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? "Exporting…" : "Export Report"}
          </button>
          <Link
            href="/feasibility"
            className="bg-transparent border border-[var(--border)] text-[var(--foreground)] px-4 py-2 text-xs uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors no-underline"
          >
            New Search
          </Link>
          <span>{p?.pin ? `Analysis Ref: ${p.pin}` : "DADU Feasibility"}</span>
        </div>
      </header>

      {/* Page title */}
      <div className="px-6 md:px-8 pt-8 pb-4 border-b border-[var(--border)]">
        <span className="label">Target Parcel</span>
        <h1 className="font-display text-3xl md:text-4xl leading-tight tracking-tight max-w-[20ch]">
          {streetLine}
        </h1>
      </div>

      {/* Main content - single column flow */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        <DealSnapshotSection data={pageData.dealSnapshot} />
        <SitePlanSection
          result={result}
          report={report}
          address={address}
          siteSummary={report.headline}
        />
        <PropertyOverviewSection data={pageData.propertyOverview} />
        <BuildPotentialSection data={pageData.buildPotential} />
        <SiteConditionsSection data={pageData.siteConditions} />
        <NeighborhoodSignalsSection data={pageData.neighborhoodSignals} />
        <WhatYouCanBuildSection data={pageData.developmentOptions} />
        <BuildOptionEconomicsSection
          options={pageData.developmentOptions.options}
          report={report}
          result={result}
        />
        <DisclaimerSection />
      </main>
    </div>
  );
}
