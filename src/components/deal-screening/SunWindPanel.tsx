"use client";

import {
  getSummerSolsticePath,
  getWinterSolsticePath,
  sunPathToSvgD,
  SEATTLE_SOLAR,
  SEATTLE_WIND,
} from "@/lib/sun-position";

/**
 * Solar & wind panel using NOAA/Gaisma-accurate Seattle data.
 * Sun paths computed from latitude 47.6°N, declination ±23.44°.
 * Wind: Puget Sound prevailing S/SSW (NOAA regional studies).
 */
export function SunWindPanel({ className = "" }: { className?: string }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;

  const summerPath = sunPathToSvgD(getSummerSolsticePath(), cx, cy, r);
  const winterPath = sunPathToSvgD(getWinterSolsticePath(), cx, cy, r);

  const fromAz = (SEATTLE_WIND.fromAzimuth * Math.PI) / 180;
  const toAz = (SEATTLE_WIND.toAzimuth * Math.PI) / 180;
  const windFromX = cx + Math.sin(fromAz) * r * 0.85;
  const windFromY = cy - Math.cos(fromAz) * r * 0.85;
  const windToX = cx + Math.sin(toAz) * r * 0.85;
  const windToY = cy - Math.cos(toAz) * r * 0.85;

  return (
    <div
      className={`border border-[var(--border)] bg-[var(--background)] flex flex-col ${className}`}
      aria-label={`Solar and wind for Seattle ${SEATTLE_SOLAR.latitude}°N. Summer noon ${SEATTLE_SOLAR.summerNoonAlt}°, winter ${SEATTLE_SOLAR.winterNoonAlt}°. Prevailing wind S/SSW.`}
    >
      <div className="p-2 border-b border-[var(--border)]">
        <p className="label text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">
          Solar & wind
        </p>
        <p className="text-[10px] text-[var(--foreground)]">Seattle {SEATTLE_SOLAR.latitude}°N</p>
      </div>
      <div className="p-3 flex flex-col items-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[140px]">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--foreground)" strokeWidth="1" />
          <text x={cx} y={12} textAnchor="middle" fontSize={10} fontWeight="600" fill="var(--muted-foreground)">N</text>
          <text x={cx} y={size - 4} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">S</text>
          <text x={size - 6} y={cy + 4} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">E</text>
          <text x={8} y={cy + 4} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">W</text>
          {summerPath && (
            <path
              id="sun-path-summer"
              d={summerPath}
              pathLength={100}
              fill="none"
              stroke="rgba(255, 180, 50, 0.7)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="animate-sun-path"
            />
          )}
          {winterPath && (
            <path
              id="sun-path-winter"
              d={winterPath}
              pathLength={100}
              fill="none"
              stroke="rgba(255, 140, 30, 0.5)"
              strokeWidth="1"
              strokeDasharray="4 3"
              className="animate-sun-path"
            />
          )}
          {summerPath && (
            <circle r={4} fill="rgba(255, 200, 80, 0.95)" stroke="rgba(255, 180, 50, 0.8)" strokeWidth="1">
              <animateMotion dur="6s" repeatCount="indefinite" path={summerPath} />
            </circle>
          )}
          <defs>
            <marker id="sw-wind" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="rgba(100, 160, 200, 0.8)" />
            </marker>
          </defs>
          <line
            x1={windFromX}
            y1={windFromY}
            x2={windToX}
            y2={windToY}
            stroke="rgba(100, 160, 200, 0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            className="animate-wind-flow"
            markerEnd="url(#sw-wind)"
          />
        </svg>
        <p className="text-[9px] text-[var(--muted-foreground)] mt-2 text-center leading-tight">
          Summer: {SEATTLE_SOLAR.summerNoonAlt}° noon · Winter: {SEATTLE_SOLAR.winterNoonAlt}° noon<br />
          Wind: S/SSW prevailing (195°)
        </p>
      </div>
    </div>
  );
}
