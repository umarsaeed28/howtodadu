"use client";

import { useRef, useState } from "react";
import type { FeasibilityResult } from "@/lib/feasibility";
import { AdUniverseFeasibilityReport } from "./AdUniverseFeasibilityReport";
import { AddToFavoritesButton } from "./AddToFavoritesButton";
import { useExportReportPdf } from "@/hooks/useExportReportPdf";
import Link from "next/link";

interface DealScreeningResultsProps {
  result: FeasibilityResult;
  /** When true, no full-page chrome — for use under a persistent search bar */
  embedded?: boolean;
}

export function DealScreeningResults({ result, embedded = false }: DealScreeningResultsProps) {
  const p = result.parcel;
  const address = p?.address ?? "Property";
  const streetLine = address.split(/,\s*/)[0]?.trim() || "Property";
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

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <AddToFavoritesButton
        address={address}
        className="!bg-white !border-zinc-300 !text-zinc-900 hover:!bg-zinc-900 hover:!text-white"
      />
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={exporting}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? "Exporting…" : "Export PDF"}
      </button>
      {!embedded ? (
        <Link
          href="/feasibility"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors no-underline"
        >
          New search
        </Link>
      ) : null}
      {p?.pin ? (
        <span className="text-xs text-zinc-500 tabular-nums hidden sm:inline">PIN {p.pin}</span>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div
        ref={reportRef}
        className="rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm overflow-hidden"
      >
        <div className="flex flex-col gap-4 border-b border-zinc-200 bg-zinc-50/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
              Feasibility report
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
              {streetLine}
            </h2>
            {address !== streetLine ? (
              <p className="mt-1 text-sm text-zinc-600">{address}</p>
            ) : null}
          </div>
          {actions}
        </div>
        <AdUniverseFeasibilityReport result={result} />
      </div>
    );
  }

  return (
    <div ref={reportRef} className="min-h-screen flex flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <span className="text-base font-semibold tracking-tight text-zinc-900">How to DADU</span>
        {actions}
      </header>

      <div className="border-b border-zinc-200 bg-white px-4 sm:px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">Property</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
          {streetLine}
        </h1>
        {address !== streetLine ? (
          <p className="mt-1 text-sm text-zinc-600">{address}</p>
        ) : null}
      </div>

      <main className="flex-1">
        <AdUniverseFeasibilityReport result={result} />
      </main>
    </div>
  );
}
