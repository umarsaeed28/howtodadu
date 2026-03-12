/**
 * Solar position calculations for site-specific design use.
 * Uses standard astronomical formulas (NOAA Solar Position Calculator, NREL).
 * All angles in true north / geographic coordinates.
 */

const DEG2RAD = Math.PI / 180;
const DEFAULT_LAT = 47.6062; // Seattle

/** Solar declination in radians (obliquity ~23.44°) */
const DEC_JUNE21 = 23.44 * DEG2RAD;
const DEC_DEC21 = -23.44 * DEG2RAD;
const DEC_EQUINOX = 0;

export interface SunPoint {
  azimuth: number; // degrees, 0=N, 90=E, 180=S, 270=W
  altitude: number; // degrees above horizon
  x: number; // 0-1, for polar diagram (center=zenith)
  y: number;
}

/**
 * Compute solar altitude and azimuth for given hour angle and declination.
 * sin(alt) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(H)
 */
function solarAltitude(latRad: number, decRad: number, hourAngleRad: number): number {
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad);
  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

/**
 * Solar azimuth (degrees from North, 0=N, 90=E, 180=S, 270=W).
 * Uses: cos(az) = (sin(dec)-sin(alt)sin(lat))/(cos(alt)cos(lat)), sin(az) = cos(dec)sin(H)/cos(alt)
 */
function solarAzimuth(
  latRad: number,
  decRad: number,
  altRad: number,
  hourAngleRad: number
): number {
  const cosAz =
    (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
    (Math.cos(altRad) * Math.cos(latRad) + 1e-10);
  const sinAz = (Math.cos(decRad) * Math.sin(hourAngleRad)) / (Math.cos(altRad) + 1e-10);
  let az = (Math.atan2(sinAz, cosAz) * 180) / Math.PI;
  az = ((az + 360) % 360);
  return az;
}

/**
 * Generate sun path points for a given latitude and declination.
 * Latitude in degrees. Returns points from sunrise to sunset.
 */
export function getSunPathForLatitude(
  latitudeDeg: number,
  decRad: number,
  steps: number = 48
): SunPoint[] {
  const latRad = latitudeDeg * DEG2RAD;
  const points: SunPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const hourAngleRad = (Math.PI * (2 * i - steps)) / steps;
    const altDeg = solarAltitude(latRad, decRad, hourAngleRad);
    if (altDeg < 0) continue;
    const altRad = (altDeg * Math.PI) / 180;
    const azDeg = solarAzimuth(latRad, decRad, altRad, hourAngleRad);
    const distFromZenith = (90 - altDeg) / 90;
    const azRad = (azDeg * Math.PI) / 180;
    const x = Math.sin(azRad) * distFromZenith;
    const y = -Math.cos(azRad) * distFromZenith;
    points.push({ azimuth: azDeg, altitude: altDeg, x, y });
  }
  return points;
}

/** Sun position at a specific solar time. Hour: 0–24, returns point or null if below horizon. */
export function getSunPositionAtTime(
  latitudeDeg: number,
  decRad: number,
  hour: number
): SunPoint | null {
  const hourAngleDeg = 15 * (hour - 12);
  const hourAngleRad = hourAngleDeg * DEG2RAD;
  const latRad = latitudeDeg * DEG2RAD;
  const altDeg = solarAltitude(latRad, decRad, hourAngleRad);
  if (altDeg < 0) return null;
  const altRad = (altDeg * Math.PI) / 180;
  const azDeg = solarAzimuth(latRad, decRad, altRad, hourAngleRad);
  const distFromZenith = (90 - altDeg) / 90;
  const azRad = (azDeg * Math.PI) / 180;
  const x = Math.sin(azRad) * distFromZenith;
  const y = -Math.cos(azRad) * distFromZenith;
  return { azimuth: azDeg, altitude: altDeg, x, y };
}

/** Summer solstice (June 21) – uses default Seattle lat for backward compat */
export function getSummerSolsticePath(latitudeDeg?: number): SunPoint[] {
  return getSunPathForLatitude(latitudeDeg ?? DEFAULT_LAT, DEC_JUNE21);
}

/** Winter solstice (Dec 21) */
export function getWinterSolsticePath(latitudeDeg?: number): SunPoint[] {
  return getSunPathForLatitude(latitudeDeg ?? DEFAULT_LAT, DEC_DEC21);
}

/** Equinox */
export function getEquinoxPath(latitudeDeg?: number): SunPoint[] {
  return getSunPathForLatitude(latitudeDeg ?? DEFAULT_LAT, DEC_EQUINOX);
}

/**
 * Convert sun path points to SVG path 'd' string.
 * Polar diagram: center=zenith, radius=1 at horizon.
 * N at top, so y is flipped for SVG (y increases down).
 */
export function sunPathToSvgD(points: SunPoint[], cx: number, cy: number, r: number): string {
  if (points.length < 2) return "";
  const pts = points
    .filter((p) => p.altitude >= 0)
    .map((p) => `${cx + p.x * r},${cy - p.y * r}`);
  if (pts.length < 2) return "";
  return `M ${pts[0]} ${pts.slice(1).map((pt) => `L ${pt}`).join(" ")}`;
}

/** Get key solar values for display (approximate for Seattle 47.6°N) */
export const SEATTLE_SOLAR = {
  latitude: 47.6062,
  summerNoonAlt: 65.8,
  winterNoonAlt: 19.0,
  equinoxNoonAlt: 42.4,
  summerSunriseAz: 54,
  summerSunsetAz: 306,
  winterSunriseAz: 124,
  winterSunsetAz: 236,
} as const;

/**
 * Seattle/Puget Sound prevailing wind (NOAA NCEP/NCAR Reanalysis, regional studies).
 * Winter: Southerly flow from Aleutian Low. S/SSW dominant. FROM-direction in true north.
 */
export const SEATTLE_WIND = {
  /** Prevailing from-direction (azimuth): 195° = S/SSW */
  fromAzimuth: 195,
  /** Blows toward: 15° = NNE */
  toAzimuth: 15,
} as const;
