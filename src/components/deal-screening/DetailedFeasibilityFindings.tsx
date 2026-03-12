"use client";

import type { ADUReport, FeasibilityCheck } from "@/lib/adu-analysis";
import type { FeasibilityResult } from "@/lib/feasibility";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Maximize2,
  MapPin,
} from "lucide-react";
import { AccessVisual } from "./AccessVisual";

interface DetailedFeasibilityFindingsProps {
  report: ADUReport;
  result: FeasibilityResult;
}

function CheckIcon({ status }: { status: FeasibilityCheck["status"] }) {
  if (status === "pass") return <CheckCircle2 className="size-4 text-[var(--aura-accent)] shrink-0" aria-hidden />;
  if (status === "fail") return <XCircle className="size-4 text-red-500 shrink-0" aria-hidden />;
  if (status === "warning") return <AlertTriangle className="size-4 text-amber-600 shrink-0" aria-hidden />;
  return <AlertTriangle className="size-4 text-[var(--aura-text-muted)] shrink-0" aria-hidden />;
}

export function DetailedFeasibilityFindings({ report, result }: DetailedFeasibilityFindingsProps) {
  return (
    <section
      className="aura-panel overflow-hidden"
      aria-labelledby="detailed-feasibility-heading"
    >
      <h2 id="detailed-feasibility-heading" className="aura-serif text-lg font-medium text-[var(--aura-text)] p-6 pb-0">
        Detailed feasibility findings
      </h2>
      <p className="text-sm text-[var(--aura-text-muted)] px-6 pt-2 pb-4">
        ADUniverse based property and feasibility outputs. All original checker content.
      </p>

      <Accordion type="multiple" className="w-full" defaultValue={["zoning", "feasibility", "dadu", "regulatory"]}>
        <AccordionItem value="zoning" className="border-b border-[var(--aura-border)] px-6">
          <AccordionTrigger className="hover:no-underline py-5 font-medium text-[var(--aura-text)] [&[data-state=open]>svg]:rotate-180">
            Zoning and lot basics
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.checks
                .filter((c) => c.label !== "Lot Width" && c.label !== "Lot Depth")
                .map((c) => (
                <div key={c.label} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--aura-border)] bg-[var(--aura-surface)]">
                  <CheckIcon status={c.status} />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--aura-text-muted)]">{c.label}</p>
                    <p className="text-sm font-medium truncate text-[var(--aura-text)]" title={c.value}>{c.value}</p>
                    <p className="text-xs text-[var(--aura-text-muted)] mt-0.5">{c.shortNote}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {report.stats
                .filter((s) => s.label !== "Lot Size" && s.label !== "Zoning")
                .map((s) => (
                  <div key={s.label} className="p-3 rounded-lg border border-[var(--aura-border)]">
                    <p className="text-[10px] uppercase text-[var(--aura-text-muted)]">{s.label}</p>
                    <p className="text-sm font-medium text-[var(--aura-text)]">{s.value} {s.sub}</p>
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="feasibility" className="border-b border-[var(--aura-border)] px-6">
          <AccordionTrigger className="hover:no-underline py-5 font-medium text-[var(--aura-text)] [&[data-state=open]>svg]:rotate-180">
            Lot coverage and build potential
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            {report.coverage && (
              <div className="mb-6">
                <p className="text-xs text-[var(--aura-text-muted)] mb-2">
                  {report.coverage.currentPercent.toFixed(1)}% used · Max {report.coverage.maxPercent}%
                </p>
                <div className="h-2 rounded-full bg-[var(--aura-border-dark)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--aura-accent)] rounded-full"
                    style={{ width: `${Math.min(100, (report.coverage.currentPercent / report.coverage.maxPercent) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--aura-text-muted)] mt-2">
                  Available: {report.coverage.availableSqft.toLocaleString()} sq ft
                </p>
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-4">
              {report.daduFootprint && (
                <div className="p-4 rounded-xl border border-[var(--aura-border)]">
                  <div className="flex items-center gap-2 text-[var(--aura-text-muted)] mb-2">
                    <Building2 className="size-4" />
                    <span className="text-xs font-medium uppercase">DADU Potential</span>
                  </div>
                  <p className="text-2xl font-light tabular-nums text-[var(--aura-text)]">{report.daduFootprint.buildableSqft} sq ft</p>
                  <p className="text-xs text-[var(--aura-text-muted)] mt-1">
                    {report.daduFootprint.suggestedWidth}×{report.daduFootprint.suggestedDepth} ft · {report.daduFootprint.stories} story
                  </p>
                  <p className="text-xs text-[var(--aura-text-muted)] mt-1">{report.daduFootprint.note}</p>
                </div>
              )}
              {report.height && (
                <div className="p-4 rounded-xl border border-[var(--aura-border)]">
                  <div className="flex items-center gap-2 text-[var(--aura-text-muted)] mb-2">
                    <Maximize2 className="size-4" />
                    <span className="text-xs font-medium uppercase">Max Height</span>
                  </div>
                  <p className="text-2xl font-light tabular-nums text-[var(--aura-text)]">{report.height.total} ft</p>
                  <p className="text-xs text-[var(--aura-text-muted)] mt-1">Lot width ~{report.height.lotWidth} ft</p>
                </div>
              )}
              <div className="p-4 rounded-xl border border-[var(--aura-border)]" title={report.access.note}>
                <div className="flex items-center gap-2 text-[var(--aura-text-muted)] mb-3">
                  <span className="text-xs font-medium uppercase">Access</span>
                </div>
                <AccessVisual
                  access={report.access}
                  score={
                    report.access.type === "alley"
                      ? 95
                      : report.access.type === "corner"
                        ? 90
                        : report.access.type === "side" && report.access.adequate
                          ? 75
                          : report.access.type === "side"
                            ? 45
                            : 15
                  }
                />
                <p className="text-xs text-[var(--aura-text-muted)] mt-3">{report.access.note}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dadu" className="border-b border-[var(--aura-border)] px-6">
          <AccordionTrigger className="hover:no-underline py-5 font-medium text-[var(--aura-text)] [&[data-state=open]>svg]:rotate-180">
            Property traits and housing options
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            {report.traits.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium uppercase text-[var(--aura-text-muted)] mb-3">Traits</p>
                <div className="flex flex-wrap gap-2">
                  {report.traits.map((t) => (
                    <span
                      key={t.title}
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.sentiment === "good" ? "bg-[var(--aura-accent)]/15 text-[var(--aura-accent)]" :
                        t.sentiment === "bad" ? "bg-amber-500/15 text-amber-700" : "bg-[var(--aura-surface-alt)] text-[var(--aura-text-muted)]"
                      }`}
                      title={t.note}
                    >
                      {t.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {report.housingOptions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-[var(--aura-text-muted)] mb-3">Middle housing options</p>
                <div className="flex flex-wrap gap-2">
                  {report.housingOptions.map((o) => (
                    <span
                      key={o.type}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        o.allowed ? "border-[var(--aura-accent)]/30 bg-[var(--aura-accent)]/10" : "border-amber-500/30 bg-amber-500/10"
                      }`}
                      title={o.note}
                    >
                      {o.type}
                      {o.estimatedUnits != null && <span className="text-[var(--aura-text-muted)]">~{o.estimatedUnits}</span>}
                      {o.allowed ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="regulatory" className="px-6">
          <AccordionTrigger className="hover:no-underline py-5 font-medium text-[var(--aura-text)] [&[data-state=open]>svg]:rotate-180">
            Regulatory and site considerations
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            {report.eca.hasIssues && (
              <div className="mb-6">
                <p className="text-xs font-medium uppercase text-[var(--aura-text-muted)] mb-2">Environmental constraints</p>
                <ul className="space-y-1 text-sm">
                  {report.eca.labels.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.nearby.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <MapPin className="size-4 text-[var(--aura-text-muted)] shrink-0" />
                {report.nearby.map((n) => (
                  <span key={n.type}>
                    {n.type} <span className="font-medium">{n.count}</span>
                    {n.nearestFeet != null && ` · ~${n.nearestFeet} ft`}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--aura-text-muted)] mt-6 pt-6 border-t border-[var(--aura-border)]">
              Preliminary insights from Seattle City GIS / ADUniverse. Not a final determination. Not legal advice. Not a permit approval.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
