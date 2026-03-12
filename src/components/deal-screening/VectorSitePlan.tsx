"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type {
  LotGeometry,
  FeasibilityData,
  SitePlanData,
  SitePlanBuilding,
  SitePlanTree,
  SitePlanStreet,
  SitePlanDriveway,
  SitePlanAdjacentParcel,
  ContourLine,
} from "@/lib/feasibility";
import type { ADUReport, DADUFootprint } from "@/lib/adu-analysis";
import {
  getSummerSolsticePath,
  getWinterSolsticePath,
  getSunPositionAtTime,
  sunPathToSvgD,
  SEATTLE_WIND,
} from "@/lib/sun-position";

export type MapOverlayKey =
  | "sun"
  | "wind"
  | "slope"
  | "buildableEnvelope"
  | "structures"
  | "access"
  | "trees"
  | "adjacency";

export interface MapOverlayState {
  sun?: boolean;
  wind?: boolean;
  slope?: boolean;
  buildableEnvelope?: boolean;
  structures?: boolean;
  access?: boolean;
  trees?: boolean;
  adjacency?: boolean;
}

interface VectorSitePlanProps {
  lot: LotGeometry | null;
  feasibility: FeasibilityData | null;
  report: ADUReport | null;
  sitePlan?: SitePlanData | null;
  address: string;
  className?: string;
  /** Show sun/wind overlay and enable zoom/pan */
  zoomable?: boolean;
  /** Overlay visibility. Default: structures + buildableEnvelope on; others off. */
  overlays?: MapOverlayState;
  /** Contour lines for slope overlay – GIS */
  contours?: ContourLine[];
  /** Site coordinates for accurate sun/wind – use parcel centroid or geocode */
  siteCoordinates?: { lat: number; lng: number };
}

/**
 * Map lng/lat (WGS84) to SVG x,y.
 * Bbox is [west, south, east, north] = [xmin, ymin, xmax, ymax].
 * Result: North=top (y=0), South=bottom, East=right, West=left – true north orientation.
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

/** Convert feet (from left, from front) to lng/lat. Front = street side (minLat). */
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

const STROKE = "var(--foreground)";
const FILL_LOT = "rgba(44, 74, 59, 0.04)";
const FILL_STRUCTURE = "rgba(44, 74, 59, 0.12)";
const FILL_GARAGE = "rgba(44, 74, 59, 0.08)";
const FILL_DADU = "rgba(44, 74, 59, 0.06)";
const FILL_TREE = "rgba(86, 115, 100, 0.35)";
const FILL_TREE_REMOVE = "rgba(180, 80, 60, 0.4)";
const FILL_DRIVEWAY = "rgba(120, 120, 110, 0.25)";
const HATCH = "rgba(44, 74, 59, 0.25)";

/** Architectural line weights (px): property heaviest, building medium, detail thin */
const LW_PROPERTY = 2.2;
const LW_BUILDING = 1.2;
const LW_DADU = 0.9;
const LW_DRIVEWAY = 0.5;
const LW_STREET = 0.5;
const LW_ADJACENT = 0.4;
const LW_DIMENSION = 0.45;

export function VectorSitePlan({
  lot,
  feasibility,
  report,
  sitePlan,
  address,
  className = "",
  zoomable = false,
  overlays: overlayState,
  contours = [],
  siteCoordinates,
}: VectorSitePlanProps) {
  const siteLat = siteCoordinates?.lat ?? 47.6062;
  const ov = overlayState ?? {};
  const showStructures = ov.structures !== false;
  const showBuildableEnvelope = ov.buildableEnvelope !== false;
  const showTrees = ov.trees !== false;
  const showAdjacency = ov.adjacency !== false;
  const showSlope = ov.slope === true;
  const showSun = ov.sun === true;
  const showWind = ov.wind === true;
  const showAccess = ov.access === true;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!zoomable) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(4, Math.max(0.5, s * factor)));
    },
    [zoomable]
  );

  useEffect(() => {
    if (!zoomable || !containerRef.current) return;
    const el = containerRef.current;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomable, handleWheel]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomable) return;
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    },
    [zoomable, translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomable || !isPanning) return;
      setTranslate({
        x: panStart.current.tx + (e.clientX - panStart.current.x),
        y: panStart.current.ty + (e.clientY - panStart.current.y),
      });
    },
    [zoomable, isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);
  if (!lot) {
    return (
      <div
        className={`flex items-center justify-center aspect-[4/3] border border-[var(--border)] bg-[var(--background)] ${className}`}
        aria-label="Site plan not available"
      >
        <span className="label text-[var(--muted-foreground)]">
          Parcel geometry not available
        </span>
      </div>
    );
  }

  const { rings, bbox, imageSize } = lot;
  const [xmin, ymin, xmax, ymax] = bbox;
  const ringMinLng = Math.min(...rings.map((r) => r[0]));
  const ringMaxLng = Math.max(...rings.map((r) => r[0]));
  const ringMinLat = Math.min(...rings.map((r) => r[1]));
  const ringMaxLat = Math.max(...rings.map((r) => r[1]));
  const ringW = ringMaxLng - ringMinLng;
  const ringH = ringMaxLat - ringMinLat;

  const lotWidth = feasibility?.lotWidth ?? 50;
  const lotDepth = feasibility?.lotDepth ?? 100;
  const totalBldgSqft = feasibility?.totalBuildingSqft ?? 0;
  const garageSqft =
    (feasibility?.detachedGarageCount ?? 0) > 0
      ? feasibility?.detachedGarageSqft ?? 0
      : 0;
  const mainHouseSqft = Math.max(0, totalBldgSqft - garageSqft);
  const daduFootprint: DADUFootprint | null = report?.daduFootprint ?? null;

  const buildings = sitePlan?.buildings ?? [];
  const treesRaw = sitePlan?.trees ?? [];
  const streets = sitePlan?.streets ?? [];
  const driveways = sitePlan?.driveways ?? [];
  const adjacentParcels = sitePlan?.adjacentParcels ?? [];

  const garageSqftNum = garageSqft;
  const hasGarage = garageSqftNum > 0;

  const daduW = daduFootprint?.suggestedWidth ?? 20;
  const daduD = daduFootprint?.suggestedDepth ?? 25;
  const rearSetback = daduFootprint?.rearSetback ?? 5;
  const sideSetback = daduFootprint?.sideSetback ?? 5;
  const daduFromLeft = Math.max(sideSetback, (lotWidth - daduW) / 2);
  const daduFromFront = lotDepth - daduD - rearSetback;

  const daduCorners = [
    ftToLngLat(daduFromLeft, daduFromFront, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH),
    ftToLngLat(daduFromLeft + daduW, daduFromFront, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH),
    ftToLngLat(daduFromLeft + daduW, daduFromFront + daduD, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH),
    ftToLngLat(daduFromLeft, daduFromFront + daduD, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH),
  ];
  const daduMinLng = Math.min(...daduCorners.map((c) => c.lng));
  const daduMaxLng = Math.max(...daduCorners.map((c) => c.lng));
  const daduMinLat = Math.min(...daduCorners.map((c) => c.lat));
  const daduMaxLat = Math.max(...daduCorners.map((c) => c.lat));

  const trees: (SitePlanTree & { inDADUZone: boolean })[] = treesRaw.map((t) => {
    const [cx, cy] = t.centroid;
    const inDADUZone = Boolean(
      daduFootprint &&
        cx >= daduMinLng &&
        cx <= daduMaxLng &&
        cy >= daduMinLat &&
        cy <= daduMaxLat
    );
    return { ...t, inDADUZone };
  });

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

  const ringsToPath = (r: number[][]): string =>
    r
      .map(([lng, lat], j) => {
        const { x, y } = toSvg(lng, lat, bbox, imageSize);
        return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

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

  const pad = 24;
  const vbSize = imageSize + pad * 2;

  const useExactBuildings = buildings.length > 0;
  const mainW = Math.min(lotWidth * 0.65, Math.max(24, Math.sqrt(mainHouseSqft * 1.2)));
  const mainD = mainHouseSqft > 0 ? mainHouseSqft / mainW : 0;
  const mainFromLeft = (lotWidth - mainW) / 2;
  const mainFromFront = 5;
  const garageW = garageSqftNum > 0 ? Math.min(24, Math.sqrt(garageSqftNum * 0.8)) : 0;
  const garageD = garageSqftNum > 0 ? garageSqftNum / garageW : 0;
  const garageFromLeft = lotWidth - garageW - 5;
  const garageFromFront = lotDepth - garageD - 5;

  const svgEl = (
    <svg
        viewBox={`0 0 ${vbSize} ${vbSize}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ color: STROKE }}
      >
        <defs>
          <pattern
            id="dadu-hatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke={HATCH} strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Adjacent parcels – toggleable */}
        {showAdjacency &&
          adjacentParcels.map((ap, idx) => (
          <path
            key={`adj-${idx}`}
            d={ringsToPath(ap.rings)}
            fill="rgba(44, 74, 59, 0.02)"
            stroke="rgba(44, 74, 59, 0.3)"
            strokeWidth={LW_ADJACENT}
            strokeDasharray="4 3"
            strokeLinejoin="round"
            transform={`translate(${pad} ${pad})`}
          />
        ))}

        {/* Elevation contours – slope overlay (GIS) */}
        {showSlope &&
          contours.flatMap((c) => c.paths).map((path, i) => (
            <path
              key={`contour-${i}`}
              d={
                path
                  .map(([l, a], j) => {
                    const { x, y } = toSvg(l, a, bbox, imageSize);
                    return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
                  })
                  .join(" ")
              }
              fill="none"
              stroke="rgba(120, 100, 80, 0.4)"
              strokeWidth={0.6}
              strokeDasharray="2 3"
              strokeLinecap="round"
              transform={`translate(${pad} ${pad})`}
            />
          ))}

        {/* Driveways – paved surfaces */}
        {driveways.map((d, idx) => (
          <path
            key={idx}
            d={ringsToPath(d.rings)}
            fill={FILL_DRIVEWAY}
            stroke="rgba(90, 90, 85, 0.5)"
            strokeWidth={LW_DRIVEWAY}
            strokeDasharray="3 2"
            strokeLinejoin="round"
            transform={`translate(${pad} ${pad})`}
          />
        ))}

        {/* Parcel boundary – heaviest line (property line) */}
        <path
          d={lotPath}
          fill={FILL_LOT}
          stroke={STROKE}
          strokeWidth={LW_PROPERTY}
          strokeLinejoin="round"
          strokeLinecap="round"
          transform={`translate(${pad} ${pad})`}
        />

        {/* Cardinal bearings – top=North, bottom=South, left=West, right=East (true north, WGS84) */}
        <g transform={`translate(${pad} ${pad})`} fontSize={9} fontWeight="600" fill="rgba(44,74,59,0.5)">
          <text x={imageSize / 2} y={10} textAnchor="middle">N</text>
          <text x={imageSize / 2} y={imageSize - 4} textAnchor="middle">S</text>
          <text x={imageSize - 6} y={imageSize / 2 + 3} textAnchor="middle">E</text>
          <text x={10} y={imageSize / 2 + 3} textAnchor="middle">W</text>
        </g>

        {/* Streets (no labels) */}
        {streets.slice(0, 8).map((st, idx) => (
          <g key={idx} transform={`translate(${pad} ${pad})`}>
            {st.paths.map((path, pi) => (
              <path
                key={pi}
                d={
                  path
                    .map(([l, a], j) => {
                      const { x, y } = toSvg(l, a, bbox, imageSize);
                      return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
                    })
                    .join(" ")
                }
                fill="none"
                stroke="rgba(44,74,59,0.35)"
                strokeWidth={LW_STREET}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}

        {/* Trees – circles (GIS crowns) – toggleable */}
        {showTrees &&
          trees.map((t, idx) => {
          const [cx, cy] = t.centroid;
          const { x, y } = toSvg(cx, cy, bbox, imageSize);
          const rPx = Math.max(2, Math.min(12, (t.radiusFt / 30) * 20));
          return (
            <circle
              key={idx}
              cx={x + pad}
              cy={y + pad}
              r={rPx}
              fill={t.inDADUZone ? FILL_TREE_REMOVE : FILL_TREE}
              stroke={t.inDADUZone ? "rgba(180,80,60,0.8)" : STROKE}
              strokeWidth={t.inDADUZone ? 1.5 : 0.5}
            />
          );
        })}

        {/* Buildings – exact GIS or estimated – toggleable */}
        {showStructures && (
        <>
        {useExactBuildings ? (
          buildings.map((b, idx) => (
            <path
              key={idx}
              d={ringsToPath(b.rings)}
              fill={
                hasGarage && idx === 1 && b.area <= garageSqftNum * 1.5
                  ? FILL_GARAGE
                  : FILL_STRUCTURE
              }
              stroke={STROKE}
              strokeWidth={LW_BUILDING}
              strokeLinejoin="round"
              strokeDasharray={hasGarage && idx === 1 ? "4 2" : undefined}
              transform={`translate(${pad} ${pad})`}
            />
          ))
        ) : (
          <>
            {mainHouseSqft > 0 && mainD > 0 && (
              <path
                d={rectToPath(mainFromLeft, mainFromFront, mainW, mainD)}
                fill={FILL_STRUCTURE}
                stroke={STROKE}
                strokeWidth={LW_BUILDING}
                strokeLinejoin="round"
                transform={`translate(${pad} ${pad})`}
              />
            )}
            {hasGarage && garageD > 0 && garageFromFront > mainFromFront + mainD && (
              <path
                d={rectToPath(garageFromLeft, garageFromFront, garageW, garageD)}
                fill={FILL_GARAGE}
                stroke={STROKE}
                strokeWidth="1"
                strokeLinejoin="round"
                strokeDasharray="4 2"
                transform={`translate(${pad} ${pad})`}
              />
            )}
          </>
        )}
        </>
        )}

        {/* Access overlay – likely side yard / construction path */}
        {showAccess && (() => {
          const a1 = ftToLngLat(5, lotDepth * 0.2, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH);
          const a2 = ftToLngLat(5, lotDepth * 0.85, lotWidth, lotDepth, ringMinLng, ringMinLat, ringW, ringH);
          const s1 = toSvg(a1.lng, a1.lat, bbox, imageSize);
          const s2 = toSvg(a2.lng, a2.lat, bbox, imageSize);
          return (
            <g transform={`translate(${pad} ${pad})`}>
              <path
                d={`M ${s1.x} ${s1.y} L ${s2.x} ${s2.y}`}
                fill="none"
                stroke="rgba(100, 160, 200, 0.5)"
                strokeWidth={1.2}
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            </g>
          );
        })()}

        {/* Sun overlay – site-accurate solar paths, design reference, True North */}
        {showSun && (() => {
          const cx = imageSize / 2;
          const cy = imageSize / 2;
          const r = imageSize * 0.35;
          const DEC_JUNE21_RAD = (23.44 * Math.PI) / 180;
          const summerPoints = getSummerSolsticePath(siteLat);
          const winterPoints = getWinterSolsticePath(siteLat);
          const summerPath = sunPathToSvgD(summerPoints, cx, cy, r);
          const winterPath = sunPathToSvgD(winterPoints, cx, cy, r);
          const timeLabels = [9, 12, 15] as const;
          return (
            <g transform={`translate(${pad} ${pad})`} opacity={0.9}>
              {/* True North arrow */}
              <line x1={cx} y1={cy - r - 4} x2={cx} y2={cy - r - 16} stroke="rgba(44,74,59,0.6)" strokeWidth={1} strokeLinecap="round" />
              <path d={`M ${cx} ${cy - r - 16} l -3 6 l 3 -2 l 3 2 z`} fill="rgba(44,74,59,0.6)" />
              <text x={cx} y={cy - r - 22} textAnchor="middle" fontSize={8} fontWeight="600" fill="rgba(44,74,59,0.7)">
                N
              </text>
              <text x={cx} y={cy - r - 12} textAnchor="middle" fontSize={7} fill="rgba(44,74,59,0.5)">
                True North
              </text>
              {/* Summer solstice (June 21) */}
              {summerPath && (
                <path
                  d={summerPath}
                  pathLength={100}
                  fill="none"
                  stroke="rgba(255, 180, 50, 0.4)"
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                  className="animate-sun-path"
                />
              )}
              {/* Winter solstice (Dec 21) */}
              {winterPath && (
                <path
                  d={winterPath}
                  pathLength={100}
                  fill="none"
                  stroke="rgba(255, 140, 30, 0.3)"
                  strokeWidth={0.9}
                  strokeDasharray="4 3"
                  className="animate-sun-path"
                />
              )}
              {/* Animated sun position on summer path */}
              {summerPath && (
                <circle r={3} fill="rgba(255, 200, 80, 0.6)" stroke="rgba(255, 180, 50, 0.5)" strokeWidth={1}>
                  <animateMotion dur="6s" repeatCount="indefinite" path={summerPath} />
                </circle>
              )}
              {/* Design reference: time labels (9am, 12pm, 3pm) on summer path */}
              {timeLabels.map((hour) => {
                const pt = getSunPositionAtTime(siteLat, DEC_JUNE21_RAD, hour);
                if (!pt) return null;
                const sx = cx + pt.x * r;
                const sy = cy - pt.y * r;
                const label = hour === 12 ? "12" : `${hour % 12}`;
                return (
                  <g key={hour}>
                    <circle cx={sx} cy={sy} r={2} fill="rgba(255, 180, 50, 0.5)" />
                    <text x={sx} y={sy - 6} textAnchor="middle" fontSize={7} fill="rgba(44,74,59,0.6)">
                      {label}
                    </text>
                  </g>
                );
              })}
              {/* Lat annotation */}
              <text x={cx} y={cy + r + 14} textAnchor="middle" fontSize={7} fill="rgba(44,74,59,0.45)">
                {siteLat.toFixed(2)}°N · Jun 21 / Dec 21
              </text>
            </g>
          );
        })()}

        {/* Wind overlay – NOAA 195° S/SSW, true north */}
        {showWind && (() => {
          const cx = imageSize / 2;
          const cy = imageSize / 2;
          const r = imageSize * 0.42;
          const fromAz = (SEATTLE_WIND.fromAzimuth * Math.PI) / 180;
          const toAz = (SEATTLE_WIND.toAzimuth * Math.PI) / 180;
          const x1 = cx + Math.sin(fromAz) * r;
          const y1 = cy - Math.cos(fromAz) * r;
          const x2 = cx + Math.sin(toAz) * r;
          const y2 = cy - Math.cos(toAz) * r;
          return (
            <g transform={`translate(${pad} ${pad})`} opacity={0.9}>
              <defs>
                <marker
                  id="vsp-wind"
                  markerWidth="8"
                  markerHeight="8"
                  refX="4"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0 0 L8 4 L0 8 Z" fill="rgba(100, 160, 200, 0.6)" />
                </marker>
              </defs>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(100, 160, 200, 0.45)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray="8 12"
                className="animate-wind-flow"
                markerEnd="url(#vsp-wind)"
              />
              <text x={cx + r * 0.6} y={cy - r * 0.2} fontSize={7} fill="rgba(44,74,59,0.5)">
                {SEATTLE_WIND.fromAzimuth}° S/SSW
              </text>
            </g>
          );
        })()}

        {/* DADU buildable zone – toggleable */}
        {showBuildableEnvelope && daduFootprint && daduFromFront > 0 && (
          <path
            d={rectToPath(daduFromLeft, daduFromFront, daduW, daduD)}
            fill="url(#dadu-hatch)"
            stroke={STROKE}
            strokeWidth={LW_DADU}
            strokeLinejoin="round"
            strokeDasharray="5 4"
            transform={`translate(${pad} ${pad})`}
          />
        )}
      </svg>
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[280px] flex-1 border border-[var(--border)] bg-[var(--background)] overflow-hidden select-none flex items-center justify-center p-2 ${className} ${zoomable ? "cursor-grab active:cursor-grabbing" : ""}`}
      aria-labelledby="vector-site-plan-heading"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <h2 id="vector-site-plan-heading" className="sr-only">
        Site plan oriented with True North up. N at top, S at bottom, E right, W left. Parcel boundary, structures, trees, sun and wind orientation, DADU buildable zone.
      </h2>
      <div
        className="absolute inset-2 flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:object-contain"
        style={
          zoomable
            ? {
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transformOrigin: "center center",
              }
            : undefined
        }
      >
        {svgEl}
      </div>

      {/* Dimension labels */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
        <div className="w-[60%] max-w-[320px] aspect-[4/3] relative">
          <span
            className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] tabular-nums"
            style={{ color: "var(--muted-foreground)", fontWeight: 500 }}
          >
            {lotWidth}&apos;–0&quot;
          </span>
          <span
            className="absolute -right-12 top-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap tabular-nums"
            style={{
              color: "var(--muted-foreground)",
              transform: "translateY(-50%) rotate(90deg)",
              fontWeight: 500,
            }}
          >
            {lotDepth}&apos;–0&quot;
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center gap-3 px-4 py-2 border-t border-[var(--border)] bg-[var(--background)] text-[10px] uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <span className="size-2.5 border border-[var(--foreground)] bg-[rgba(44,74,59,0.04)]" />
          Parcel
        </span>
        {(useExactBuildings ? buildings.length > 0 : mainHouseSqft > 0) && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 border border-[var(--foreground)] bg-[rgba(44,74,59,0.12)]" />
            Structure
          </span>
        )}
        {hasGarage && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 border border-[var(--foreground)] border-dashed bg-[rgba(44,74,59,0.08)]" />
            Garage
          </span>
        )}
        {trees.length > 0 && (
          <>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[rgba(86,115,100,0.35)] border border-[var(--foreground)]" />
              Trees
            </span>
            {trees.some((t) => t.inDADUZone) && (
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[rgba(180,80,60,0.4)] border border-amber-700" />
                Trees (potential removal)
              </span>
            )}
          </>
        )}
        {adjacentParcels.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 border border-[var(--muted-foreground)] border-dashed opacity-50" />
            Not mapped
          </span>
        )}
        {driveways.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 border border-[var(--muted-foreground)] border-dashed bg-[rgba(120,120,110,0.25)]" />
            Driveway
          </span>
        )}
        {daduFootprint && showBuildableEnvelope && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 border border-[var(--foreground)] border-dashed bg-[rgba(44,74,59,0.15)]" />
            Buildable zone
          </span>
        )}
        {showSlope && contours.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 border border-[var(--muted-foreground)] border-dashed opacity-60" />
            Contours
          </span>
        )}
        {showAccess && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-[rgba(100,160,200,0.3)]" />
            Access
          </span>
        )}
      </div>

      {zoomable && (
        <div className="absolute top-2 left-2 flex gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={resetView}
            className="px-2 py-1 text-[10px] uppercase tracking-wider border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
