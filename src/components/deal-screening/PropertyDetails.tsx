"use client";

import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";

interface PropertyDetailsProps {
  result: FeasibilityResult;
  report: ADUReport;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export function PropertyDetails({ result, report }: PropertyDetailsProps) {
  const p = result.parcel;
  const f = result.feasibility;
  const footprint = report.daduFootprint;

  const existingSqft = f?.totalBuildingSqft ?? null;
  const lotSqft = p?.lotSqft ?? f?.shapeArea;
  const dimensions =
    f?.lotWidth && f?.lotDepth
      ? `${f.lotWidth} × ${f.lotDepth} ft`
      : report.stats.find((s) => s.label === "Dimensions")?.value;
  const zoning = p?.zoning ?? report.stats.find((s) => s.label === "Zoning")?.value;
  const yearBuilt = p?.yearBuilt ?? report.stats.find((s) => s.label === "Year Built")?.value;
  const lotCoverage =
    report.coverage?.currentPercent != null
      ? `${report.coverage.currentPercent.toFixed(1)}%`
      : null;
  const accessType =
    report.access.type === "alley"
      ? "Alley"
      : report.access.type === "corner"
        ? "Corner lot"
        : report.access.type === "side"
          ? report.access.sideYardFt != null
            ? `Side (~${report.access.sideYardFt} ft)`
            : "Side yard"
          : report.access.type === "none"
            ? "None"
            : null;

  const existingADUs =
    (f?.existingAADU ?? 0) + (f?.existingDADU ?? 0) > 0
      ? `${(f?.existingAADU ?? 0) + (f?.existingDADU ?? 0)} (${f?.existingAADU ?? 0} AADU, ${f?.existingDADU ?? 0} DADU)`
      : "None";

  const garage =
    (f?.detachedGarageCount ?? 0) > 0
      ? `${f?.detachedGarageCount} garage${(f?.detachedGarageCount ?? 0) > 1 ? "s" : ""} · ${(f?.detachedGarageSqft ?? 0).toLocaleString()} sq ft`
      : null;

  const basement =
    (f?.basementSqft ?? 0) > 0 ? `${(f?.basementSqft ?? 0).toLocaleString()} sq ft` : null;

  const potentialDADU = footprint?.buildableSqft;

  const details = [
    { label: "Lot size", value: lotSqft ? `${Number(lotSqft).toLocaleString()} sq ft` : null },
    {
      label: "Existing building footprint",
      value: existingSqft ? `${Number(existingSqft).toLocaleString()} sq ft` : null,
    },
    { label: "Lot coverage", value: lotCoverage },
    { label: "Lot dimensions", value: dimensions },
    { label: "Zoning", value: zoning ?? null },
    { label: "Year built", value: yearBuilt ?? null },
    { label: "Access type", value: accessType },
    { label: "Existing ADUs", value: existingADUs },
    { label: "Detached garage", value: garage },
    { label: "Basement", value: basement },
    {
      label: "Potential DADU size",
      value: potentialDADU != null ? `Up to ${potentialDADU.toLocaleString()} sq ft` : null,
    },
  ].filter((d) => d.value != null && d.value !== "");

  if (details.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-background p-6 md:p-8"
      aria-labelledby="lot-details-heading"
    >
      <h2 id="lot-details-heading" className="text-lg font-medium text-foreground mb-4">
        Lot details
      </h2>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
        {details.map((d) => (
          <DetailRow key={d.label} label={d.label} value={d.value!} />
        ))}
      </div>
    </section>
  );
}
