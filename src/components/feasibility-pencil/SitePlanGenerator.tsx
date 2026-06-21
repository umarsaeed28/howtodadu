"use client";

import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import { sitePlanGeometryStatus, validBuildingFootprints } from "@/lib/site-plan/geometry-status";
import {
  pathsToSvgPaths,
  ringToSvgPath,
  radiusFtToSvg,
  toSvgPoint,
} from "@/lib/site-plan/svg";
import { RULESET_VERSION } from "@/lib/site-plan/ruleset";

const MEASURED = {
  lot: { fill: "rgba(46, 125, 50, 0.06)", stroke: "var(--green)", width: 3 },
  building: { fill: "rgba(55, 55, 55, 0.45)", stroke: "rgba(40, 40, 40, 0.95)", width: 1.5 },
  driveway: { fill: "rgba(120, 120, 120, 0.25)", stroke: "rgba(90, 90, 90, 0.7)", width: 1 },
  adjacent: { fill: "rgba(180, 180, 180, 0.12)", stroke: "rgba(160, 160, 160, 0.5)", width: 1 },
  street: { stroke: "rgba(80, 80, 80, 0.55)", width: 2 },
  tree: { fill: "rgba(34, 139, 34, 0.35)", stroke: "rgba(34, 100, 34, 0.8)", width: 1 },
  contour: { stroke: "rgba(100, 100, 100, 0.35)", width: 1 },
};

export default function SitePlanGenerator({
  result,
  report,
  address,
}: {
  result: FeasibilityResult;
  report: ADUReport;
  address: string;
}) {
  const status = sitePlanGeometryStatus(result);

  if (!status.ok) {
    return (
      <section aria-labelledby="site-plan-heading" className="px-4 pt-6 sm:px-5">
        <h3 id="site-plan-heading" className="pa-display text-base" style={{ color: "var(--ink)" }}>
          2D site plan
        </h3>
        <div
          className="mt-3 rounded-[10px] border px-4 py-8 text-center"
          style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}
          role="alert"
        >
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            Geometry unavailable — cannot produce an accurate site plan
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--slate)" }}>
            {status.reason} A missing plan is correct; a fabricated one would be a defect. Confirm
            parcel and building outlines in Seattle GIS / ADUniverse before relying on any layout.
          </p>
        </div>
      </section>
    );
  }

  const lot = result.lot!;
  const { rings, bbox, aerialUrl, imageSize } = lot;
  const sitePlan = result.sitePlan!;
  const buildings = validBuildingFootprints(result);
  const lotWidthFt = result.feasibility?.lotWidth ?? null;

  const contourPaths = (result.contours ?? []).flatMap((c) =>
    pathsToSvgPaths(c.paths, bbox, imageSize)
  );

  return (
    <section aria-labelledby="site-plan-heading" className="px-4 pt-6 sm:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="site-plan-heading" className="pa-display text-base" style={{ color: "var(--ink)" }}>
            2D site plan
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
            Measured from Seattle GIS · ruleset {RULESET_VERSION}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: "var(--green-tint)", color: "var(--green)" }}
        >
          Measured geometry only
        </span>
      </div>

      <div
        className="overflow-hidden rounded-[10px] border"
        style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
      >
        <div className="relative aspect-square max-h-[28rem] w-full md:max-h-[32rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aerialUrl.replace("style=topo", "style=satellite")}
            alt={`Aerial view of ${address}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${imageSize} ${imageSize}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Site plan for ${address}: parcel boundary and ${buildings.length} GIS building footprint${buildings.length === 1 ? "" : "s"}`}
          >
            {/* Adjacent parcels — measured GIS */}
            <g aria-label="Adjacent parcel boundaries">
              {sitePlan.adjacentParcels.map((p, i) => {
                const d = ringToSvgPath(p.rings, bbox, imageSize);
                if (!d) return null;
                return (
                  <path
                    key={`adj-${i}`}
                    d={d}
                    fill={MEASURED.adjacent.fill}
                    stroke={MEASURED.adjacent.stroke}
                    strokeWidth={MEASURED.adjacent.width}
                  />
                );
              })}
            </g>

            {/* Driveways — measured GIS */}
            <g aria-label="Driveways and parking">
              {sitePlan.driveways.map((d, i) => {
                const path = ringToSvgPath(d.rings, bbox, imageSize);
                if (!path) return null;
                return (
                  <path
                    key={`dw-${i}`}
                    d={path}
                    fill={MEASURED.driveway.fill}
                    stroke={MEASURED.driveway.stroke}
                    strokeWidth={MEASURED.driveway.width}
                  />
                );
              })}
            </g>

            {/* Contours — measured GIS */}
            {contourPaths.length > 0 && (
              <g aria-label="Elevation contours" opacity={0.5}>
                {contourPaths.map((d, i) => (
                  <path
                    key={`ctr-${i}`}
                    d={d}
                    fill="none"
                    stroke={MEASURED.contour.stroke}
                    strokeWidth={MEASURED.contour.width}
                  />
                ))}
              </g>
            )}

            {/* Streets — measured GIS */}
            <g aria-label="Street centerlines">
              {sitePlan.streets.flatMap((s, si) =>
                pathsToSvgPaths(s.paths, bbox, imageSize).map((d, pi) => (
                  <path
                    key={`st-${si}-${pi}`}
                    d={d}
                    fill="none"
                    stroke={MEASURED.street.stroke}
                    strokeWidth={MEASURED.street.width}
                  />
                ))
              )}
            </g>

            {/* Parcel boundary — measured GIS */}
            <path
              d={ringToSvgPath(rings, bbox, imageSize)}
              fill={MEASURED.lot.fill}
              stroke={MEASURED.lot.stroke}
              strokeWidth={MEASURED.lot.width}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Building footprints — measured GIS (never synthesized) */}
            <g aria-label="Existing building footprints">
              {buildings.map((b, i) => {
                const d = ringToSvgPath(b.rings, bbox, imageSize);
                if (!d) return null;
                return (
                  <path
                    key={`bldg-${i}`}
                    d={d}
                    fill={MEASURED.building.fill}
                    stroke={MEASURED.building.stroke}
                    strokeWidth={MEASURED.building.width}
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>

            {/* Trees — measured GIS crown centroids */}
            <g aria-label="Tree crowns">
              {sitePlan.trees.map((t, i) => {
                const { x, y } = toSvgPoint(t.centroid[0], t.centroid[1], bbox, imageSize);
                const r = radiusFtToSvg(t.radiusFt, bbox, imageSize, lotWidthFt);
                return (
                  <circle
                    key={`tree-${i}`}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={MEASURED.tree.fill}
                    stroke={MEASURED.tree.stroke}
                    strokeWidth={MEASURED.tree.width}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        <Legend buildingCount={buildings.length} hasSchematic={Boolean(report.daduFootprint)} />

        {report.daduFootprint && (
          <SchematicNote footprint={report.daduFootprint} />
        )}
      </div>
    </section>
  );
}

function Legend({
  buildingCount,
  hasSchematic,
}: {
  buildingCount: number;
  hasSchematic: boolean;
}) {
  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-2 border-t px-4 py-3 text-xs"
      style={{ borderColor: "var(--hairline)", color: "var(--slate)" }}
    >
      <LegendItem color="var(--green)" label="Parcel boundary (GIS)" line />
      <LegendItem color="rgba(55,55,55,0.7)" label={`Building footprint ×${buildingCount} (GIS)`} filled />
      <LegendItem color="rgba(34,139,34,0.6)" label="Tree crown (GIS)" filled />
      <LegendItem color="rgba(80,80,80,0.5)" label="Street (GIS)" line />
      {hasSchematic && (
        <span className="w-full text-[11px] italic" style={{ color: "var(--slate)" }}>
          Proposed units are not drawn on this plan. See schematic fit study below.
        </span>
      )}
    </div>
  );
}

function LegendItem({
  color,
  label,
  line,
  filled,
}: {
  color: string;
  label: string;
  line?: boolean;
  filled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-3 rounded-sm"
        style={{
          background: filled ? color : "transparent",
          border: line ? `2px solid ${color}` : `1px solid ${color}`,
        }}
      />
      {label}
    </span>
  );
}

function SchematicNote({
  footprint,
}: {
  footprint: NonNullable<ADUReport["daduFootprint"]>;
}) {
  return (
    <div
      className="border-t px-4 py-3"
      style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}
    >
      <p className="pa-eyebrow" style={{ color: "var(--amber)" }}>
        Schematic fit study · not shown on plan
      </p>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        A rear DADU of up to {footprint.buildableSqft.toLocaleString()} sq ft (
        {footprint.suggestedWidth}×{footprint.suggestedDepth} ft schematic module) may fit by code.
        Placement requires field survey and SDCI review — not a design or permit document.
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
        {footprint.note}
      </p>
    </div>
  );
}
