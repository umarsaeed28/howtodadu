"use client";

import type { LotGeometry, FeasibilityData, ContourLine } from "@/lib/feasibility";
import type { ADUReport, DADUFootprint } from "@/lib/adu-analysis";

interface SiteFootprintViewProps {
  lot: LotGeometry | null;
  feasibility: FeasibilityData | null;
  report: ADUReport | null;
  contours?: ContourLine[];
  address: string;
}

/**
 * Convert lng/lat to SVG coordinates within the viewBox.
 * Uses lot bbox for the aerial extent.
 */
function toSvg(
  lng: number,
  lat: number,
  bbox: [number, number, number, number],
  size: number
): { x: number; y: number } {
  const [xmin, ymin, xmax, ymax] = bbox;
  const x = ((lng - xmin) / (xmax - xmin)) * size;
  const y = (1 - (lat - ymin) / (ymax - ymin)) * size;
  return { x, y };
}

/**
 * Map physical lot dimensions (ft) to lng/lat.
 * Street assumed at south (minLat). Width runs E-W (lng), depth runs N-S (lat).
 */
function ftToLngLat(
  feetFromLeft: number,
  feetFromFront: number,
  widthFt: number,
  depthFt: number,
  minLng: number,
  minLat: number,
  ringW: number,
  ringH: number
): { lng: number; lat: number } {
  if (widthFt <= 0 || depthFt <= 0) return { lng: minLng, lat: minLat };
  const lng = minLng + (feetFromLeft / widthFt) * ringW;
  const lat = minLat + (feetFromFront / depthFt) * ringH;
  return { lng, lat };
}

export function SiteFootprintView({
  lot,
  feasibility,
  report,
  contours = [],
  address,
}: SiteFootprintViewProps) {
  if (!lot) {
    return (
      <section
        className="rounded-xl border border-border overflow-hidden bg-muted/20"
        aria-labelledby="site-footprint-heading"
      >
        <h2 id="site-footprint-heading" className="sr-only">
          Site footprint
        </h2>
        <div className="aspect-square max-h-96 flex items-center justify-center text-muted-foreground text-sm p-6">
          Parcel geometry not available
        </div>
      </section>
    );
  }

  const { rings, bbox, aerialUrl, imageSize } = lot;
  const [xmin, ymin, xmax, ymax] = bbox;
  const ringMinLng = Math.min(...rings.map((r) => r[0]));
  const ringMaxLng = Math.max(...rings.map((r) => r[0]));
  const ringMinLat = Math.min(...rings.map((r) => r[1]));
  const ringMaxLat = Math.max(...rings.map((r) => r[1]));
  const ringW = ringMaxLng - ringMinLng;
  const ringH = ringMaxLat - ringMinLat;
  // Width runs E-W (lng), depth runs N-S (lat). Street at south (minLat).
  const lotWidth = feasibility?.lotWidth ?? 50;
  const lotDepth = feasibility?.lotDepth ?? 100;
  const totalBldgSqft = feasibility?.totalBuildingSqft ?? 0;
  const garageSqft = (feasibility?.detachedGarageCount ?? 0) > 0 ? (feasibility?.detachedGarageSqft ?? 0) : 0;
  const mainHouseSqft = Math.max(0, totalBldgSqft - garageSqft);
  const daduFootprint: DADUFootprint | null = report?.daduFootprint ?? null;

  // Main house: assume ~60% lot width, placed at front, centered. Occupies front ~45% of lot.
  const mainW = Math.min(lotWidth * 0.65, Math.max(24, Math.sqrt(mainHouseSqft * 1.2)));
  const mainD = mainHouseSqft > 0 ? mainHouseSqft / mainW : 0;
  const mainFromLeft = (lotWidth - mainW) / 2;
  const mainFromFront = 5; // ~5 ft from street

  // Garage: rear corner if detached. Assume 12x20 or sqrt-based.
  const garageW = garageSqft > 0 ? Math.min(24, Math.sqrt(garageSqft * 0.8)) : 0;
  const garageD = garageSqft > 0 ? garageSqft / garageW : 0;
  const garageFromLeft = lotWidth - garageW - 5; // 5 ft from side
  const garageFromFront = lotDepth - garageD - 5; // 5 ft from rear

  // DADU: rear, with setbacks. Centered.
  const daduW = daduFootprint?.suggestedWidth ?? 20;
  const daduD = daduFootprint?.suggestedDepth ?? 25;
  const rearSetback = daduFootprint?.rearSetback ?? 5;
  const sideSetback = daduFootprint?.sideSetback ?? 5;
  const daduFromLeft = Math.max(sideSetback, (lotWidth - daduW) / 2);
  const daduFromFront = lotDepth - daduD - rearSetback;

  const rectToPath = (
    fromLeft: number,
    fromFront: number,
    w: number,
    d: number
  ): string => {
    const bl = ftToLngLat(fromLeft, fromFront, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH);
    const br = ftToLngLat(fromLeft + w, fromFront, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH);
    const tr = ftToLngLat(fromLeft + w, fromFront + d, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH);
    const tl = ftToLngLat(fromLeft, fromFront + d, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH);
    const blS = toSvg(bl.lng, bl.lat, bbox, imageSize);
    const brS = toSvg(br.lng, br.lat, bbox, imageSize);
    const trS = toSvg(tr.lng, tr.lat, bbox, imageSize);
    const tlS = toSvg(tl.lng, tl.lat, bbox, imageSize);
    return `M ${blS.x} ${blS.y} L ${brS.x} ${brS.y} L ${trS.x} ${trS.y} L ${tlS.x} ${tlS.y} Z`;
  };

  const deduped = rings.filter((pt, i) => {
    if (i === 0) return true;
    const prev = rings[i - 1];
    return pt[0] !== prev[0] || pt[1] !== prev[1];
  });
  const lotPath =
    deduped
      .map(([lng, lat], j) => {
        const { x, y } = toSvg(lng, lat, bbox, imageSize);
        return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  const contourPaths = contours.flatMap((c) =>
    c.paths
      .filter((path) => path.length >= 2)
      .map((path) =>
        path
          .map(([lng, lat], j) => {
            const { x, y } = toSvg(lng, lat, bbox, imageSize);
            return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")
      )
  );

  return (
    <section
      className="rounded-xl border border-border overflow-hidden bg-background"
      aria-labelledby="site-footprint-heading"
    >
      <h2 id="site-footprint-heading" className="sr-only">
        Site footprint: lot boundary, existing structures, and potential DADU location
      </h2>

      <div className="relative aspect-square max-h-[28rem] md:max-h-[32rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={aerialUrl.replace("style=topo", "style=satellite")}
          alt={`Aerial top-down view of ${address}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${imageSize} ${imageSize}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {/* Elevation contours (GIS) */}
          <g className="opacity-40">
            {contourPaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
            ))}
          </g>
          {/* Lot boundary (parcel polygon from ADUniverse parcels GIS) */}
          <path
            d={lotPath}
            fill="rgba(120,111,166,0.08)"
            stroke="rgba(120,111,166,0.95)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Existing main house */}
          {mainHouseSqft > 0 && mainD > 0 && (
            <path
              d={rectToPath(mainFromLeft, mainFromFront, mainW, mainD)}
              fill="rgba(100,100,100,0.5)"
              stroke="rgba(80,80,80,0.9)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}

          {/* Detached garage */}
          {garageSqft > 0 && garageD > 0 && garageFromFront > mainFromFront + mainD && (
            <path
              d={rectToPath(garageFromLeft, garageFromFront, garageW, garageD)}
              fill="rgba(120,100,80,0.5)"
              stroke="rgba(100,80,60,0.9)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}

          {/* Potential DADU spot */}
          {daduFootprint && daduFromFront > (mainFromFront + mainD) && (
            <path
              d={rectToPath(daduFromLeft, daduFromFront, daduW, daduD)}
              fill="rgba(120,111,166,0.35)"
              stroke="rgba(120,111,166,0.95)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeDasharray="6 4"
            />
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border bg-muted/20 text-xs">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm border-2 border-[#786fa6]" aria-hidden />
          Parcel (GIS)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-neutral-600/60 border border-neutral-700" aria-hidden />
          Existing structure
        </span>
        {garageSqft > 0 && (
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-amber-800/50 border border-amber-900" aria-hidden />
            Garage
          </span>
        )}
        {daduFootprint && (
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-[#786fa6]/35 border border-[#786fa6] border-dashed" aria-hidden />
            DADU zone ({daduFootprint.suggestedWidth}×{daduFootprint.suggestedDepth} ft)
          </span>
        )}
        {contourPaths.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="size-3 border-b border-current" aria-hidden />
            Elevation contours
          </span>
        )}
      </div>
    </section>
  );
}
