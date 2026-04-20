"use client";

import { parcelZoningLabel, type FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trees,
  Home,
  MapPin,
  Building2,
  Waypoints,
} from "lucide-react";
import {
  COVERAGE_AVAIL_CRITICAL_BELOW,
  COVERAGE_AVAIL_GOOD_MIN,
  coverageAvailabilityBand,
  coverageAvailabilityHint,
  coverageAvailabilityPanelToneClass,
  coverageAvailabilityValueClass,
} from "@/lib/metric-health";

const MIN_LOT_SIZE = 3200;
const MIN_LOT_WIDTH = 25;
const MIN_LOT_DEPTH = 70;

/** Matches /feasibility dashboard: zinc neutrals + teal accent */
const accent = "text-[var(--feasibility-accent,#0d9488)]";
const accentBg = "bg-[var(--feasibility-accent,#0d9488)]";

interface ADUniversePropertyInfoProps {
  result: FeasibilityResult;
  report: ADUReport;
}

function StatusCard({
  label,
  value,
  status,
  explanation,
  subNote,
}: {
  label: string;
  value: string;
  status: "pass" | "warning" | "fail";
  explanation: string;
  subNote?: string;
}) {
  const Icon =
    status === "pass"
      ? CheckCircle2
      : status === "fail"
        ? XCircle
        : AlertTriangle;

  const statusStyles = {
    pass: "border-emerald-200/80 bg-emerald-50/50",
    warning: "border-amber-200/80 bg-amber-50/40",
    fail: "border-red-200/80 bg-red-50/50",
  };
  const iconStyles = {
    pass: accent,
    warning: "text-amber-700",
    fail: "text-red-600",
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-zinc-200/90 p-4 shadow-sm ${statusStyles[status]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${iconStyles[status]}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-zinc-900">{value}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-zinc-600">{explanation}</p>
      {subNote ? (
        <p className="text-[11px] italic leading-relaxed text-zinc-500">{subNote}</p>
      ) : null}
    </div>
  );
}

function getZoningExplanation(zone: string | null): string {
  if (!zone) return "Zoning data is not available.";
  const z = zone.toUpperCase();
  if (z.startsWith("NR")) return "Neighborhood Residential. ADUs allowed.";
  if (z.startsWith("RSL")) return "Residential Small Lot. ADUs allowed.";
  if (z.startsWith("LR")) return "Lowrise zone. ADUs allowed.";
  if (z.startsWith("SF")) return "Single-family zone. ADUs allowed in Seattle.";
  return "Check Seattle Land Use Code for ADU eligibility.";
}

export function ADUniversePropertyInfo({ result, report }: ADUniversePropertyInfoProps) {
  const p = result.parcel;
  const f = result.feasibility;
  const zone =
    parcelZoningLabel(p) ?? report.stats.find((s) => s.label === "Zoning")?.value ?? null;
  const lotSqft = p?.lotSqft ?? f?.shapeArea ?? 0;
  const lotWidth = f?.lotWidth ?? 0;
  const lotDepth = f?.lotDepth ?? 0;
  const totalADU = f?.totalADU ?? 0;
  const cov = report.coverage;
  const treeCanopy = f?.treeCanopyPercent;
  const treePct = treeCanopy != null ? (treeCanopy <= 1 ? treeCanopy * 100 : treeCanopy) : null;
  const garageSqft = (f?.detachedGarageCount ?? 0) > 0 ? (f?.detachedGarageSqft ?? 0) : 0;
  const lotType = f?.lotType?.toLowerCase() ?? "";

  const zoningOk = zone && ["NR", "RSL", "LR", "SF"].some((z) => (zone ?? "").toUpperCase().startsWith(z));
  const sizeOk = lotSqft >= MIN_LOT_SIZE;
  const widthOk = lotWidth >= MIN_LOT_WIDTH;
  const depthOk = lotDepth >= MIN_LOT_DEPTH;
  const coverageOk = !report.checks.find((c) => c.label === "Lot Coverage")?.status?.includes("fail");
  const availBand = cov ? coverageAvailabilityBand(cov.availableSqft) : "unknown";

  const heightTable = [
    { width: "<30 ft", base: 14, pitched: 3, shed: 3 },
    { width: "30–40 ft", base: 16, pitched: 7, shed: 4 },
    { width: "40–50 ft", base: 18, pitched: 5, shed: 4 },
    { width: "≥50 ft", base: 18, pitched: 7, shed: 4 },
  ];

  const maxHeight = Math.max(...heightTable.map((r) => r.base + Math.max(r.pitched, r.shed)));

  return (
    <section
      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm"
      aria-labelledby="aduniverse-property-heading"
    >
      <h2 id="aduniverse-property-heading" className="sr-only">
        ADU requirements and property characteristics
      </h2>

      <div className="space-y-8 p-5 md:p-6">
        {p?.pin ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Parcel {p.pin}
          </p>
        ) : null}

        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-tight text-zinc-900">
            Requirements for all ADUs
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <StatusCard
              label="Zoning"
              value={zone ?? "—"}
              status={zoningOk ? "pass" : "fail"}
              explanation={getZoningExplanation(zone)}
            />
            <StatusCard
              label="Existing ADUs"
              value={totalADU === 0 ? "None" : `${totalADU} on record`}
              status={totalADU < 2 ? "pass" : "warning"}
              explanation={
                totalADU === 0
                  ? "No ADUs on record. Lots can have up to two ADUs."
                  : `${totalADU} ADU${totalADU !== 1 ? "s" : ""} on record. Lots can have up to two.`
              }
            />
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-semibold tracking-tight text-zinc-900">
            Additional requirements for a DADU
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-zinc-600">
            See Seattle Land Use Code Section 23.44.041 for full standards.
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <StatusCard
              label="Lot size"
              value={lotSqft ? `${Number(lotSqft).toLocaleString()} sq ft` : "—"}
              status={sizeOk ? "pass" : "warning"}
              explanation={sizeOk ? "Meets 3,200 sq ft minimum." : "Below 3,200 sq ft minimum."}
              subNote="Converting an existing structure may be allowed on smaller lots."
            />
            <StatusCard
              label="Lot width"
              value={`~${lotWidth} ft`}
              status={widthOk ? "pass" : "warning"}
              explanation={widthOk ? "Wide enough for a DADU." : "May be narrow for a new DADU."}
              subNote={`Minimum ${MIN_LOT_WIDTH} ft. Height limits vary by width.`}
            />
            <StatusCard
              label="Lot depth"
              value={`~${lotDepth.toFixed(1)} ft`}
              status={depthOk ? "pass" : "warning"}
              explanation={depthOk ? "Deep enough for a DADU." : "May be too shallow."}
              subNote={`Minimum ${MIN_LOT_DEPTH} ft.`}
            />
            {cov ? (
              <div className="sm:col-span-2">
                <div
                  className={`rounded-xl border p-4 transition-colors ${coverageAvailabilityPanelToneClass(availBand)}`}
                  title={coverageAvailabilityHint(availBand)}
                >
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Lot coverage
                  </p>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
                      {cov.currentPercent.toFixed(1)}%
                    </span>
                    <span className="text-xs leading-relaxed text-zinc-600">
                      current · max {cov.maxPercent.toFixed(1)}% (
                      {cov.maxSqft.toLocaleString()} sq ft cap) ·{" "}
                      <strong
                        className={`font-semibold tabular-nums ${coverageAvailabilityValueClass(availBand)}`}
                      >
                        {cov.availableSqft.toLocaleString()} sq ft
                      </strong>{" "}
                      coverage available (est.)
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] leading-snug text-zinc-600">
                    {availBand === "good"
                      ? `${COVERAGE_AVAIL_GOOD_MIN}+ sq ft available — strong headroom for a new footprint.`
                      : availBand === "caution"
                        ? `Under ${COVERAGE_AVAIL_GOOD_MIN} sq ft available — limited headroom.`
                        : availBand === "severe"
                          ? `Under ${COVERAGE_AVAIL_CRITICAL_BELOW} sq ft available — very tight; expect design tradeoffs.`
                          : null}
                  </p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200/80">
                    <div
                      className={`h-full rounded-full transition-all ${
                        coverageOk ? `${accentBg} opacity-90` : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (cov.currentPercent / Math.max(cov.maxPercent, 0.01)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200/90">
            <p className="border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Max DADU height by lot width
            </p>
            <div className="divide-y divide-zinc-100">
              {heightTable.map((row, i) => {
                const isActive =
                  lotWidth >= 50
                    ? i === 3
                    : lotWidth >= 40
                      ? i === 2
                      : lotWidth >= 30
                        ? i === 1
                        : i === 0;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 ${
                      isActive ? "bg-teal-50/40" : "bg-white"
                    }`}
                  >
                    <span className="w-20 shrink-0 text-xs font-medium text-zinc-800">{row.width}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex h-4 items-center gap-1">
                        <div
                          className={`h-3 rounded-sm ${isActive ? accentBg : "bg-zinc-400"}`}
                          style={{ width: `${(row.base / maxHeight) * 100}%`, minWidth: 8 }}
                          title={`Base: ${row.base} ft`}
                        />
                        <div
                          className="h-2 rounded-sm bg-zinc-300 opacity-90"
                          style={{ width: `${(row.pitched / maxHeight) * 100}%`, minWidth: 4 }}
                          title={`+ pitched: ${row.pitched} ft`}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                      {row.base}+{Math.max(row.pitched, row.shed)} ft
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-tight text-zinc-900">
            Characteristics of this property
          </h3>
          <div className="flex flex-wrap gap-2">
            {lotType ? (
              <div
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm shadow-sm"
                title={
                  lotType === "corner"
                    ? "Street access on two sides"
                    : "Neighbors on both sides"
                }
              >
                <MapPin className="size-4 text-zinc-500" aria-hidden />
                <span className="font-medium text-zinc-900">
                  {lotType === "corner" ? "Corner lot" : "Interior lot"}
                </span>
              </div>
            ) : null}
            {f?.hasAlley ? (
              <div
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm shadow-sm"
                title="Alley access can simplify DADU entry and utilities"
              >
                <Waypoints className="size-4 text-zinc-500" aria-hidden />
                <span className="font-medium text-zinc-900">Alley access</span>
              </div>
            ) : null}
            {garageSqft > 0 ? (
              <div
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm shadow-sm"
                title="Potential conversion candidate"
              >
                <Building2 className="size-4 text-zinc-500" aria-hidden />
                <span className="font-medium text-zinc-900">
                  {garageSqft.toLocaleString()} sq ft garage
                </span>
              </div>
            ) : null}
            {treePct != null ? (
              <div
                className={
                  treePct > 35
                    ? "inline-flex items-center gap-2 rounded-lg border border-amber-300/90 bg-amber-50/80 px-3 py-2 text-sm shadow-sm ring-1 ring-amber-200/60"
                    : "inline-flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm shadow-sm"
                }
                title={
                  treePct > 35
                    ? "Heavy canopy — arborist visit likely; tree rules may constrain clearing"
                    : "Tree protection may apply"
                }
              >
                <Trees className={treePct > 35 ? "size-4 text-amber-700" : "size-4 text-zinc-500"} aria-hidden />
                <span className={`font-medium ${treePct > 35 ? "text-amber-950" : "text-zinc-900"}`}>
                  ~{treePct.toFixed(1)}% canopy
                  {treePct > 35 ? " — review likely" : ""}
                </span>
              </div>
            ) : null}
          </div>
          {(lotType || f?.hasAlley || garageSqft > 0 || treePct != null) ? (
            <p className="mt-3 text-xs leading-relaxed text-zinc-600">
              Corner lots and alleys simplify access. Detached garages may be convertible. Tree removal
              may require permits.
            </p>
          ) : null}
        </div>

        {report.nearby.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-zinc-900">ADUs near you</h3>
            <div className="flex flex-wrap gap-3">
              {report.nearby.map((n) => (
                <div
                  key={n.type}
                  className="flex min-w-[200px] items-center gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-zinc-50/80">
                    <Home className="size-5 text-zinc-500" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {n.count} {n.type}
                      {n.count !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-zinc-600">
                      within ¼ mile
                      {n.nearestFeet != null ? (
                        <> · nearest {n.nearestFeet.toLocaleString()} ft</>
                      ) : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="border-t border-zinc-200/80 pt-6 text-[11px] leading-relaxed text-zinc-500">
          Preliminary insights from Seattle City GIS / ADUniverse layers (
          <a
            href="https://aduniverse-seattlecitygis.hub.arcgis.com/pages/feasibility"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium ${accent} underline-offset-2 hover:underline`}
          >
            city feasibility page
          </a>
          ). Not a final determination. Not legal advice. Not a permit approval.
        </p>
      </div>
    </section>
  );
}
