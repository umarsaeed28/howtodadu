"use client";

import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { CheckCircle2, AlertTriangle, XCircle, Trees, Home, MapPin, Building2 } from "lucide-react";

const MIN_LOT_SIZE = 3200;
const MIN_LOT_WIDTH = 25;
const MIN_LOT_DEPTH = 70;

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
    pass: "border-[var(--foreground)] bg-[rgba(44,74,59,0.04)]",
    warning: "border-amber-600/60 bg-amber-500/5",
    fail: "border-red-600/60 bg-red-500/5",
  };
  const iconStyles = {
    pass: "text-[var(--foreground)]",
    warning: "text-amber-700",
    fail: "text-red-600",
  };

  return (
    <div
      className={`p-4 border ${statusStyles[status]} rounded-sm flex flex-col gap-2`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`size-5 shrink-0 mt-0.5 ${iconStyles[status]}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="label text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="font-display text-lg font-medium text-[var(--foreground)] mt-0.5">
            {value}
          </p>
        </div>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        {explanation}
      </p>
      {subNote && (
        <p className="text-[11px] text-[var(--muted-foreground)] italic leading-relaxed">
          {subNote}
        </p>
      )}
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
  const zone = p?.zoning ?? report.stats.find((s) => s.label === "Zoning")?.value ?? null;
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

  const heightTable = [
    { width: "<30 ft", base: 14, pitched: 3, shed: 3 },
    { width: "30–40 ft", base: 16, pitched: 7, shed: 4 },
    { width: "40–50 ft", base: 18, pitched: 5, shed: 4 },
    { width: "≥50 ft", base: 18, pitched: 7, shed: 4 },
  ];

  const maxHeight = Math.max(...heightTable.map((r) => r.base + Math.max(r.pitched, r.shed)));

  return (
    <section
      className="border border-[var(--border)] bg-[var(--background)] rounded-sm overflow-hidden"
      aria-labelledby="aduniverse-property-heading"
    >
      <h2 id="aduniverse-property-heading" className="sr-only">
        ADU requirements and property characteristics
      </h2>

      <div className="p-6 md:p-8 space-y-8">
        {p?.pin && (
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            Parcel {p.pin}
          </p>
        )}

        {/* Requirements grid */}
        <div>
          <h3 className="font-display text-xl mb-4 text-[var(--foreground)]">
            Requirements for all ADUs
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
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

        {/* DADU requirements */}
        <div>
          <h3 className="font-display text-xl mb-4 text-[var(--foreground)]">
            Additional requirements for a DADU
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            See Seattle Land Use Code Section 23.44.041 for full standards.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
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
            {cov && (
              <div className="sm:col-span-2">
                <div className="p-4 border border-[var(--border)] bg-[var(--background)] rounded-sm">
                  <p className="label text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Lot coverage
                  </p>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-display text-2xl tabular-nums text-[var(--foreground)]">
                      {cov.currentPercent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      of 35% max · ~{cov.availableSqft?.toLocaleString() ?? "—"} sq ft available
                    </span>
                  </div>
                  <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        coverageOk ? "bg-[var(--foreground)]" : "bg-amber-600"
                      }`}
                      style={{ width: `${Math.min(100, cov.currentPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual height table */}
          <div className="border border-[var(--border)] rounded-sm overflow-hidden">
            <p className="label text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] p-3 border-b border-[var(--border)] bg-[var(--muted)]">
              Max DADU height by lot width
            </p>
            <div className="divide-y divide-[var(--border)]">
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
                    className={`flex items-center gap-4 p-3 ${isActive ? "bg-[rgba(44,74,59,0.04)]" : ""}`}
                  >
                    <span className="w-20 text-xs font-medium text-[var(--foreground)] shrink-0">
                      {row.width}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1 h-4 items-center">
                        <div
                          className="h-3 bg-[var(--foreground)] rounded-sm"
                          style={{ width: `${(row.base / maxHeight) * 100}%`, minWidth: 8 }}
                          title={`Base: ${row.base} ft`}
                        />
                        <div
                          className="h-2 bg-[var(--muted-foreground)] rounded-sm opacity-70"
                          style={{ width: `${(row.pitched / maxHeight) * 100}%`, minWidth: 4 }}
                          title={`+ pitched: ${row.pitched} ft`}
                        />
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-[var(--muted-foreground)] shrink-0">
                      {row.base}+{Math.max(row.pitched, row.shed)} ft
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Characteristics – visual chips */}
        <div>
          <h3 className="font-display text-xl mb-4 text-[var(--foreground)]">
            Characteristics of this property
          </h3>
          <div className="flex flex-wrap gap-2">
            {lotType && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)]"
                title={
                  lotType === "corner"
                    ? "Street access on two sides"
                    : "Neighbors on both sides"
                }
              >
                <MapPin className="size-4 text-[var(--muted-foreground)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {lotType === "corner" ? "Corner lot" : "Interior lot"}
                </span>
              </div>
            )}
            {garageSqft > 0 && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)]"
                title="Potential conversion candidate"
              >
                <Building2 className="size-4 text-[var(--muted-foreground)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {garageSqft.toLocaleString()} sq ft garage
                </span>
              </div>
            )}
            {treePct != null && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)]"
                title="Tree protection may apply"
              >
                <Trees className="size-4 text-[var(--muted-foreground)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  ~{treePct.toFixed(1)}% canopy
                </span>
              </div>
            )}
          </div>
          {(lotType || garageSqft > 0 || treePct != null) && (
            <p className="text-xs text-[var(--muted-foreground)] mt-3 leading-relaxed">
              Corner lots simplify access. Detached garages may be convertible. Tree removal may require permits.
            </p>
          )}
        </div>

        {/* Nearby ADUs – distance visualization */}
        {report.nearby.length > 0 && (
          <div>
            <h3 className="font-display text-xl mb-4 text-[var(--foreground)]">
              ADUs near you
            </h3>
            <div className="flex flex-wrap gap-4">
              {report.nearby.map((n) => (
                <div
                  key={n.type}
                  className="flex items-center gap-3 p-4 border border-[var(--border)] rounded-sm bg-[var(--background)] min-w-[200px]"
                >
                  <div className="size-10 rounded-full border border-[var(--border)] flex items-center justify-center shrink-0">
                    <Home className="size-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <p className="font-display font-medium text-[var(--foreground)]">
                      {n.count} {n.type}{n.count !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      within ¼ mile
                      {n.nearestFeet != null && (
                        <> · nearest {n.nearestFeet.toLocaleString()} ft</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-[var(--muted-foreground)] pt-6 border-t border-[var(--border)]">
          Preliminary insights from Seattle City GIS / ADUniverse. Not a final determination. Not legal advice. Not a permit approval.
        </p>
      </div>
    </section>
  );
}
