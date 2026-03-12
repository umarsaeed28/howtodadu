"use client";

import {
  getSummerSolsticePath,
  getWinterSolsticePath,
  getEquinoxPath,
  sunPathToSvgD,
  SEATTLE_SOLAR,
  SEATTLE_WIND,
} from "@/lib/sun-position";

/** Seattle solar paths and wind from NOAA/Gaisma data. Lat 47.6°N, wind S/SSW. */
export function SunWindDiagram({ className = "" }: { className?: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;

  const summerPath = sunPathToSvgD(getSummerSolsticePath(), cx, cy, r);
  const winterPath = sunPathToSvgD(getWinterSolsticePath(), cx, cy, r);
  const equinoxPath = sunPathToSvgD(getEquinoxPath(), cx, cy, r);

  const fromAz = (SEATTLE_WIND.fromAzimuth * Math.PI) / 180;
  const toAz = (SEATTLE_WIND.toAzimuth * Math.PI) / 180;
  const windFromX = cx + Math.sin(fromAz) * r * 0.85;
  const windFromY = cy - Math.cos(fromAz) * r * 0.85;
  const windToX = cx + Math.sin(toAz) * r * 0.85;
  const windToY = cy - Math.cos(toAz) * r * 0.85;

  return (
    <div
      className={`border border-[var(--border)] bg-[var(--background)] rounded-sm overflow-hidden ${className}`}
      aria-labelledby="sun-wind-heading"
    >
      <h3 id="sun-wind-heading" className="sr-only">
        Solar orientation and prevailing wind for Seattle {SEATTLE_SOLAR.latitude}°N
      </h3>
      <div className="p-3 border-b border-[var(--border)]">
        <p className="label text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          Solar & Wind
        </p>
        <p className="font-display text-sm text-[var(--foreground)]">
          Site orientation context
        </p>
      </div>
      <div className="p-4 flex flex-col items-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-36 h-36"
          style={{ color: "var(--foreground)" }}
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1" />
          <text x={cx} y={14} textAnchor="middle" className="text-[9px] fill-[var(--muted-foreground)]" fontWeight="600">N</text>
          <text x={cx} y={size - 6} textAnchor="middle" className="text-[9px] fill-[var(--muted-foreground)]">S</text>
          <text x={size - 8} y={cy + 4} textAnchor="middle" className="text-[9px] fill-[var(--muted-foreground)]">E</text>
          <text x={10} y={cy + 4} textAnchor="middle" className="text-[9px] fill-[var(--muted-foreground)]">W</text>
          {summerPath && (
            <path
              id="diagram-sun-path"
              d={summerPath}
              pathLength={100}
              fill="none"
              stroke="rgba(255, 180, 50, 0.6)"
              strokeWidth="2"
              strokeDasharray="4 3"
              className="animate-sun-path"
            />
          )}
          {equinoxPath && (
            <path
              d={equinoxPath}
              pathLength={100}
              fill="none"
              stroke="rgba(255, 160, 40, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="animate-sun-path"
            />
          )}
          {winterPath && (
            <path
              d={winterPath}
              pathLength={100}
              fill="none"
              stroke="rgba(255, 140, 30, 0.5)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="animate-sun-path"
            />
          )}
          {summerPath && (
            <circle r={5} fill="rgba(255, 200, 80, 0.95)" stroke="rgba(255, 180, 50, 0.8)" strokeWidth="1">
              <animateMotion dur="6s" repeatCount="indefinite" path={summerPath} />
            </circle>
          )}
          <defs>
            <marker id="wind-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="rgba(100, 160, 200, 0.7)" />
            </marker>
          </defs>
          <line
            x1={windFromX}
            y1={windFromY}
            x2={windToX}
            y2={windToY}
            stroke="rgba(100, 160, 200, 0.6)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            className="animate-wind-flow"
            markerEnd="url(#wind-arrow)"
          />
        </svg>
        <div className="mt-3 space-y-1 text-[10px] text-[var(--muted-foreground)] text-center">
          <p>Summer: noon {SEATTLE_SOLAR.summerNoonAlt}° · Winter: noon {SEATTLE_SOLAR.winterNoonAlt}°</p>
          <p>Prevailing wind: S/SSW ({SEATTLE_WIND.fromAzimuth}°) → NNE</p>
        </div>
      </div>
    </div>
  );
}
