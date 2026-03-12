"use client";

import type { ResultsPageData } from "@/lib/results-page-data";
import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { SiteMapSection } from "./site-map";
import { RadialDealScoreGauge } from "./visuals/RadialDealScoreGauge";
import { CoverageBarChart } from "./visuals/CoverageBarChart";
import { HeightBarChart } from "./visuals/HeightBarChart";
import { TreeCanopyMeter } from "./visuals/TreeCanopyMeter";
import { AccessVisual } from "./AccessVisual";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { FeasibilityCheck } from "@/lib/adu-analysis";

function CheckIcon({ status }: { status: FeasibilityCheck["status"] }) {
  if (status === "pass")
    return <CheckCircle2 className="size-4 text-[var(--foreground)] shrink-0" />;
  if (status === "fail") return <XCircle className="size-4 text-red-500 shrink-0" />;
  return <AlertTriangle className="size-4 text-amber-600 shrink-0" />;
}

export function DealSnapshotSection({ data }: { data: ResultsPageData["dealSnapshot"] }) {
  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="deal-snapshot-heading">
      <h2 id="deal-snapshot-heading" className="font-display text-2xl mb-6">
        1. Deal Snapshot
      </h2>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="shrink-0 flex items-center justify-center lg:justify-start">
          <div className="w-32 h-32 md:w-40 md:h-40">
            <RadialDealScoreGauge value={data.score} />
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="label">Opportunity type</p>
            <p className="font-display text-xl text-[var(--foreground)]">{data.opportunityType}</p>
          </div>
          <div>
            <p className="label">Confidence</p>
            <p className="text-sm text-[var(--foreground)]">{data.confidenceLevel}</p>
          </div>
          {data.keyStrengths.length > 0 && (
            <div>
              <p className="label mb-2">Key strengths</p>
              <div className="flex flex-wrap gap-2">
                {data.keyStrengths.map((s) => (
                  <span
                    key={s}
                    className="inline-flex px-3 py-1 rounded-full text-xs font-medium border border-[var(--foreground)] bg-[rgba(44,74,59,0.06)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.keyRisks.length > 0 && (
            <div>
              <p className="label mb-2">Key risks</p>
              <div className="flex flex-wrap gap-2">
                {data.keyRisks.map((r) => (
                  <span
                    key={r}
                    className="inline-flex px-3 py-1 rounded-full text-xs font-medium border border-amber-600/50 bg-amber-500/5 text-amber-800"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            {data.interpretation.opportunity} {data.interpretation.recommendation}
          </p>
        </div>
      </div>
    </section>
  );
}

export function SitePlanSection({
  result,
  report,
  address,
  siteSummary,
}: {
  result: FeasibilityResult;
  report: ADUReport;
  address: string;
  siteSummary?: string;
}) {
  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="site-plan-heading">
      <h2 id="site-plan-heading" className="font-display text-2xl mb-6">
        Site Map
      </h2>
      <SiteMapSection
        result={result}
        report={report}
        address={address}
        siteSummary={siteSummary}
      />
    </section>
  );
}

export function PropertyOverviewSection({ data }: { data: ResultsPageData["propertyOverview"] }) {
  const dims =
    data.dimensions.width != null && data.dimensions.depth != null
      ? `${data.dimensions.width} × ${data.dimensions.depth} FT`
      : "—";

  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="property-overview-heading">
      <h2 id="property-overview-heading" className="font-display text-2xl mb-6">
        2. Property Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: "Parcel ID", value: data.parcelId ?? "—" },
          { label: "Zoning", value: data.zoning ?? "—" },
          { label: "Lot size", value: data.lotSizeSqft ? `${Number(data.lotSizeSqft).toLocaleString()} SQ FT` : "—" },
          { label: "Dimensions", value: dims },
          { label: "Year built", value: data.yearBuilt ?? "—" },
          { label: "Existing ADUs", value: String(data.existingADUs) },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 border border-[var(--border)] rounded-sm bg-[var(--background)]">
            <p className="label">{label}</p>
            <p className="data-value mt-1">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BuildPotentialSection({ data }: { data: ResultsPageData["buildPotential"] }) {
  const cov = data.coverage;
  const footprint = data.daduFootprint;

  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="build-potential-heading">
      <h2 id="build-potential-heading" className="font-display text-2xl mb-6">
        3. DADU Build Potential
      </h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {cov && (
            <div className="p-4 border border-[var(--border)] rounded-sm">
              <CoverageBarChart
                usedPercent={cov.currentPercent}
                maxPercent={cov.maxPercent}
                usedSqft={cov.usedSqft}
                availableSqft={cov.availableSqft}
              />
            </div>
          )}
          {footprint && (
            <div className="p-4 border border-[var(--border)] rounded-sm">
              <p className="label">Estimated DADU</p>
              <div className="space-y-1 mt-1">
                <p className="font-display text-2xl tabular-nums text-[var(--foreground)]">
                  {footprint.livingSqft.toLocaleString()} sq ft livable
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {footprint.footprintSqft.toLocaleString()} sq ft footprint (counts toward coverage) · {footprint.suggestedWidth}×{footprint.suggestedDepth} ft · {footprint.stories} story
                </p>
              </div>
              {data.remainingBuildableSqft != null && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2 tabular-nums">
                  Remaining buildable: {data.remainingBuildableSqft.toLocaleString()} sq ft footprint
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          {data.heightLimit != null && (
            <div className="p-4 border border-[var(--border)] rounded-sm">
              <HeightBarChart
                heightLimitFt={data.heightLimit}
                lotWidthFt={data.height?.lotWidth}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function SiteConditionsSection({ data }: { data: ResultsPageData["siteConditions"] }) {
  const accessScore =
    data.access.type === "alley"
      ? 95
      : data.access.type === "corner"
        ? 90
        : data.access.type === "side" && data.access.adequate
          ? 75
          : data.access.type === "side"
            ? 45
            : 15;

  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="site-conditions-heading">
      <h2 id="site-conditions-heading" className="font-display text-2xl mb-6">
        4. Site Conditions
      </h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 border border-[var(--border)] rounded-sm">
              <p className="label">Lot type</p>
              <p className="data-value mt-1">{data.lotType ?? "—"}</p>
            </div>
            <div className="p-4 border border-[var(--border)] rounded-sm">
              <p className="label">Access</p>
              <p className="data-value mt-1">{data.accessType}</p>
            </div>
            {data.sideYardWidthFt != null && (
              <div className="p-4 border border-[var(--border)] rounded-sm col-span-2">
                <p className="label">Side yard width</p>
                <p className="data-value mt-1">~{data.sideYardWidthFt} ft</p>
              </div>
            )}
            <div className="p-4 border border-[var(--border)] rounded-sm">
              <p className="label">Garage</p>
              <p className="data-value mt-1">
                {data.garagePresence && data.garageSqft ? `${data.garageSqft.toLocaleString()} sq ft` : "None"}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {data.treeCanopyPercent != null && (
            <TreeCanopyMeter percent={data.treeCanopyPercent} />
          )}
          <div>
            <p className="label mb-2">Access</p>
            <AccessVisual
              access={data.access}
              score={
                data.access.type === "alley"
                  ? 95
                  : data.access.type === "corner"
                    ? 90
                    : data.access.type === "side" && data.access.adequate
                      ? 75
                      : data.access.type === "side"
                        ? 45
                        : 15
              }
            />
          </div>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            {data.interpretation}
          </p>
        </div>
      </div>
    </section>
  );
}

export function NeighborhoodSignalsSection({ data }: { data: ResultsPageData["neighborhoodSignals"] }) {
  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="neighborhood-signals-heading">
      <h2 id="neighborhood-signals-heading" className="font-display text-2xl mb-6">
        5. Neighborhood Signals
      </h2>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-4 p-6 border border-[var(--border)] rounded-sm min-w-[200px]">
          <div className="size-14 rounded-full border-2 border-[var(--foreground)] flex items-center justify-center shrink-0">
            <span className="font-display text-xl tabular-nums text-[var(--foreground)]">
              {data.adusWithinQuarterMile}
            </span>
          </div>
          <div>
            <p className="font-display text-lg text-[var(--foreground)]">ADUs within ¼ mile</p>
            <p className="text-xs text-[var(--muted-foreground)]">Precedent in area</p>
          </div>
        </div>
        {data.distanceToNearestFt != null && (
          <div className="flex items-center gap-4 p-6 border border-[var(--border)] rounded-sm min-w-[200px]">
            <div className="size-14 rounded-full border border-[var(--border)] flex items-center justify-center shrink-0">
              <span className="font-display text-xl tabular-nums text-[var(--foreground)]">
                ~{data.distanceToNearestFt}
              </span>
            </div>
            <div>
              <p className="font-display text-lg text-[var(--foreground)]">Nearest ADU</p>
              <p className="text-xs text-[var(--muted-foreground)]">Feet away</p>
            </div>
          </div>
        )}
        {data.nearby.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            {data.nearby.map((n) => (
              <span
                key={n.type}
                className="inline-flex px-3 py-1.5 rounded-sm border border-[var(--border)] text-sm"
              >
                {n.type}: {n.count}
                {n.nearestFeet != null && ` · ~${n.nearestFeet} ft`}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function WhatYouCanBuildSection({ data }: { data: ResultsPageData["developmentOptions"] }) {
  const options = data.options;

  return (
    <section className="p-6 md:p-8 border-b border-[var(--border)]" aria-labelledby="what-you-can-build-heading">
      <h2 id="what-you-can-build-heading" className="font-display text-2xl mb-6">
        6. What You Can Build
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.length > 0 ? (
          options.map((o) => (
            <div
              key={o.type}
              className={`p-6 border rounded-sm flex flex-col ${
                o.allowed
                  ? "border-[var(--foreground)] bg-[rgba(44,74,59,0.04)]"
                  : "border-amber-600/50 bg-amber-500/5"
              }`}
            >
              <h3 className="font-display text-xl text-[var(--foreground)]">{o.type}</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 flex-1">{o.description}</p>
              {o.note && (
                <p className="text-[11px] text-[var(--muted-foreground)] mt-2 italic">{o.note}</p>
              )}
              <div
                className={`mt-4 inline-flex w-fit px-4 py-2 rounded-sm font-display text-lg tabular-nums ${
                  o.allowed ? "border border-[var(--foreground)]" : "border border-amber-600/50"
                }`}
              >
                {o.estimatedUnits != null ? `~${o.estimatedUnits}` : "—"}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] col-span-full">
            No middle housing options available for this parcel.
          </p>
        )}
      </div>
    </section>
  );
}

export function DetailedFeasibilitySection({
  data,
}: {
  data: ResultsPageData["regulatoryDetails"];
}) {
  return (
    <section
      className="p-6 md:p-8 border-b border-[var(--border)]"
      aria-labelledby="detailed-feasibility-heading"
    >
      <h2 id="detailed-feasibility-heading" className="font-display text-2xl mb-6">
        7. Detailed Feasibility Findings
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-2xl">
        ADUniverse-based property and feasibility outputs. Seattle Land Use Code references.
      </p>

      <Accordion type="multiple" className="w-full" defaultValue={["zoning"]}>
        <AccordionItem value="zoning" className="border-b border-[var(--border)]">
          <AccordionTrigger className="hover:no-underline py-5 font-display text-lg">
            Zoning and lot basics
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.zoningChecks.map((c) => (
                <div
                  key={c.label}
                  className="flex items-start gap-3 p-4 border border-[var(--border)] rounded-sm"
                >
                  <CheckIcon status={c.status} />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--muted-foreground)]">{c.label}</p>
                    <p className="font-medium text-[var(--foreground)]" title={c.value}>
                      {c.value}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.shortNote}</p>
                  </div>
                </div>
              ))}
            </div>
            {data.stats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {data.stats.map((s) => (
                  <div key={s.label} className="p-3 border border-[var(--border)] rounded-sm">
                    <p className="label">{s.label}</p>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {s.value} {s.sub ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {(data.lotStandardsChecks.length > 0 || data.coverageChecks.length > 0) && (
          <AccordionItem value="lot" className="border-b border-[var(--border)]">
            <AccordionTrigger className="hover:no-underline py-5 font-display text-lg">
              Lot standards and coverage
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...data.lotStandardsChecks, ...data.coverageChecks].map((c) => (
                  <div
                    key={c.label}
                    className="flex items-start gap-3 p-4 border border-[var(--border)] rounded-sm"
                  >
                    <CheckIcon status={c.status} />
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">{c.label}</p>
                      <p className="font-medium text-[var(--foreground)]">{c.value}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.shortNote}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {data.heightChecks.length > 0 && (
          <AccordionItem value="height" className="border-b border-[var(--border)]">
            <AccordionTrigger className="hover:no-underline py-5 font-display text-lg">
              Height limits
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.heightChecks.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-start gap-3 p-4 border border-[var(--border)] rounded-sm"
                  >
                    <CheckIcon status={c.status} />
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">{c.label}</p>
                      <p className="font-medium text-[var(--foreground)]">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {data.eca.hasIssues && (
          <AccordionItem value="eca" className="border-b border-[var(--border)]">
            <AccordionTrigger className="hover:no-underline py-5 font-display text-lg">
              Environmental constraints
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <ul className="space-y-2">
                {data.eca.labels.map((l) => (
                  <li key={l} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    {l}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </section>
  );
}

export function DisclaimerSection() {
  return (
    <section className="p-6 md:p-8" aria-labelledby="disclaimer-heading">
      <p
        id="disclaimer-heading"
        className="text-xs text-[var(--muted-foreground)] leading-relaxed max-w-2xl"
      >
        Preliminary insights from Seattle City GIS and ADUniverse. Not a final determination. Not
        legal advice. Not a permit approval. Verify all details with qualified professionals before
        purchase or construction.
      </p>
    </section>
  );
}
