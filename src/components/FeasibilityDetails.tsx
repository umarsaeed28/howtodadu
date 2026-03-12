"use client";

import type {
  ADUReport,
  FeasibilityCheck,
} from "@/lib/adu-analysis";
import type { FeasibilityResult } from "@/lib/feasibility";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Route,
  Maximize2,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { SiteFootprintView } from "@/components/SiteFootprintView";

interface FeasibilityDetailsProps {
  report: ADUReport;
  result: FeasibilityResult;
}

function CheckIcon({ status }: { status: FeasibilityCheck["status"] }) {
  if (status === "pass") return <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden />;
  if (status === "fail") return <XCircle className="size-4 text-red-500 shrink-0" aria-hidden />;
  if (status === "warning") return <AlertTriangle className="size-4 text-amber-500 shrink-0" aria-hidden />;
  return <AlertTriangle className="size-4 text-muted-foreground shrink-0" aria-hidden />;
}

export function FeasibilityDetails({ report, result }: FeasibilityDetailsProps) {
  const pct = report.confidence / 100;
  const confColor =
    report.confidence >= 60 ? "stroke-emerald-500" :
    report.confidence >= 30 ? "stroke-amber-500" : "stroke-neutral-400";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-16 space-y-12">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ADUniverse
        </span>
        <span className="size-px flex-1 max-w-24 bg-border" aria-hidden />
      </div>

      {/* ── Hero: Feasibility gauge + headline ── */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-8" aria-labelledby="feasibility-hero">
        <div className="shrink-0" role="img" aria-label={`Feasibility ${report.confidence} out of 100`}>
          <div className="relative size-32 sm:size-36">
            <svg viewBox="0 0 120 80" className="w-full h-full">
              <path
                d="M 20 70 A 50 50 0 0 1 100 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                className="text-muted-foreground/20"
                aria-hidden
              />
              <path
                d="M 20 70 A 50 50 0 0 1 100 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={Math.PI * 50}
                strokeDashoffset={Math.PI * 50 * (1 - pct)}
                className={`${confColor} transition-all duration-700`}
                aria-hidden
              />
            </svg>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-3xl font-light tabular-nums">
              {report.confidence}
            </span>
          </div>
        </div>
        <div>
          <h2 id="feasibility-hero" className="text-xl sm:text-2xl font-light tracking-tight text-foreground">
            {report.headline}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{report.confidenceLabel}</p>
        </div>
      </section>

      {/* ── Site footprint: top view, lot boundary, structures, DADU spot ── */}
      <SiteFootprintView
        lot={result.lot}
        feasibility={result.feasibility}
        report={report}
        address={result.parcel?.address ?? "Property"}
      />

      {/* ── Checks grid: label + value + icon only ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Eligibility checks">
        {report.checks.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
          >
            <CheckIcon status={c.status} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              <p className="text-sm font-medium text-foreground truncate" title={c.value}>
                {c.value}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Coverage bar ── */}
      {report.coverage && (
        <section aria-label="Lot coverage">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Coverage</span>
            <span>
              {report.coverage.currentPercent.toFixed(0)}% used · {report.coverage.availableSqft.toLocaleString()} sq ft available
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted-foreground/15 overflow-hidden">
            <div
              className="h-full bg-foreground/80 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (report.coverage.currentPercent / report.coverage.maxPercent) * 100)}%` }}
              aria-hidden
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Max {report.coverage.maxPercent}% · {report.coverage.maxSqft.toLocaleString()} sq ft
          </p>
        </section>
      )}

      {/* ── Build potential row: footprint + height + access ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {report.daduFootprint && (
          <div className="p-4 rounded-xl border border-border bg-muted/10">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Building2 className="size-4" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider">DADU Potential</span>
            </div>
            <p className="text-2xl font-light tabular-nums text-foreground">
              {report.daduFootprint.buildableSqft}
              <span className="text-sm font-normal text-muted-foreground ml-0.5">sq ft</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {report.daduFootprint.suggestedWidth}×{report.daduFootprint.suggestedDepth} ft · {report.daduFootprint.stories} story
            </p>
          </div>
        )}

        {report.height && (
          <div className="p-4 rounded-xl border border-border bg-muted/10">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Maximize2 className="size-4" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider">Max Height</span>
            </div>
            <p className="text-2xl font-light tabular-nums text-foreground">
              {report.height.total}
              <span className="text-sm font-normal text-muted-foreground ml-0.5">ft</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Lot width ~{report.height.lotWidth} ft</p>
          </div>
        )}

        <div className="p-4 rounded-xl border border-border bg-muted/10" title={report.access.note}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Route className="size-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wider">Access</span>
          </div>
          <p className="text-lg font-medium capitalize text-foreground">{report.access.type}</p>
          {report.access.sideYardFt != null && (
            <p className="text-xs text-muted-foreground mt-1">Side yard ~{report.access.sideYardFt} ft</p>
          )}
        </div>
      </div>

      {/* ── Property stats: compact 4-col ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Property details">
        {report.stats.map((s) => (
          <div key={s.label} className="p-3 rounded-lg border border-border/60">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-base font-medium text-foreground mt-0.5">
              {s.value} {s.sub && <span className="text-muted-foreground font-normal">{s.sub}</span>}
            </p>
          </div>
        ))}
      </section>

      {/* ── Traits: badge pills ── */}
      {report.traits.length > 0 && (
        <section aria-label="Property traits">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <LayoutGrid className="size-3.5" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wider">Traits</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.traits.map((t) => (
              <span
                key={t.title}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  t.sentiment === "good"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : t.sentiment === "bad"
                      ? "bg-amber-500/15 text-amber-700"
                      : "bg-muted/40 text-muted-foreground"
                }`}
                title={t.note}
              >
                {t.title}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── ECA: warning badges if any ── */}
      {report.eca.hasIssues && (
        <section aria-label="Environmental constraints">
          <div className="flex flex-wrap gap-2">
            {report.eca.labels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-800"
              >
                {l}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Housing options: chips ── */}
      {report.housingOptions.length > 0 && (
        <section aria-label="Middle housing options">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <LayoutGrid className="size-3.5" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wider">Options</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.housingOptions.map((o) => (
              <span
                key={o.type}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  o.allowed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-800"
                }`}
                title={o.note}
              >
                {o.type}
                {o.estimatedUnits != null && (
                  <span className="text-muted-foreground font-normal">~{o.estimatedUnits}</span>
                )}
                {o.allowed ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Nearby ADUs: compact ── */}
      {report.nearby.length > 0 && (
        <section className="flex items-center gap-4" aria-label="Nearby ADUs">
          <MapPin className="size-4 text-muted-foreground shrink-0" aria-hidden />
          {report.nearby.map((n) => (
            <span key={n.type} className="text-sm text-muted-foreground">
              {n.type} <span className="font-medium text-foreground">{n.count}</span>
              {n.nearestFeet != null && <span className="text-muted-foreground"> · ~{n.nearestFeet} ft</span>}
            </span>
          ))}
        </section>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-4 border-t border-border">
        Preliminary insights from Seattle City GIS / ADUniverse. Not a final determination.
      </p>
    </div>
  );
}
