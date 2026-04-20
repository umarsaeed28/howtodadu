import type { LotTypeKind, ParsedParcel } from "./types";

const WS = /\s+/;

function trimLine(s: string): string {
  return s.replace(WS, " ").trim();
}

/** Normalize "20.2%" or "0.202" to 0–100 scale percent */
function parsePercent(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().replace(/%/g, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const n = Number.parseFloat(String(raw).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseBoolLoose(raw: string | null | undefined): boolean | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().toLowerCase();
  if (["true", "yes", "1", "y"].includes(s)) return true;
  if (["false", "no", "0", "n"].includes(s)) return false;
  return null;
}

/**
 * Infer lot type and access flags from free text (whole blob + lines).
 */
function inferLotTypeAndAccess(
  fullText: string,
  lines: string[]
): {
  lotType: LotTypeKind;
  hasAlleyAccess: boolean;
  hasSideAccess: boolean | null;
} {
  const blob = fullText.toLowerCase();
  const joined = lines.join(" ").toLowerCase();

  let lotType: LotTypeKind = "unknown";
  let hasAlleyAccess = false;
  let hasSideAccess: boolean | null = null;

  if (/\balley\s*corner\b|\bcorner\s*alley\b/.test(blob)) {
    lotType = "alley_corner";
    hasAlleyAccess = true;
  } else if (/\balley\b/.test(blob) && /\bcorner\b/.test(blob) && !/\balley\s*corner\b/.test(blob)) {
    lotType = "alley_corner";
    hasAlleyAccess = true;
  } else if (/\balley\b/.test(blob)) {
    lotType = "alley";
    hasAlleyAccess = true;
  } else if (/\bcorner\b/.test(blob)) {
    lotType = "corner";
  } else if (/\binterior\b/.test(blob)) {
    lotType = "interior";
  }

  if (/\bside\s*access\b|\badequate\s*side\b/.test(joined)) hasSideAccess = true;
  if (/\bno\s*side\s*access\b|\bno\s*rear\s*access\b/.test(joined)) hasSideAccess = false;

  return { lotType, hasAlleyAccess, hasSideAccess };
}

/**
 * Extract key: value pairs and narrative lines from ADUniverse-style text.
 */
export function parseParcelText(input: string): ParsedParcel {
  const raw = input.replace(/\r\n/g, "\n").trim();
  const lines = raw.split("\n").map(trimLine).filter(Boolean);

  let address: string | null = null;
  let parcelId: string | null = null;
  let zoning: string | null = null;
  let lotSizeSqft: number | null = null;
  let lotCoveragePercent: number | null = null;
  let availableCoverageSqft: number | null = null;
  let lotWidthFt: number | null = null;
  let lotDepthFt: number | null = null;
  let hasDetachedGarage = false;
  let garageSqft: number | null = null;
  let treeCanopyPercent: number | null = null;
  let hasEcaIssue = false;
  let shorelineFlag: boolean | null = null;
  let nearbyAdusPresent: boolean | null = null;
  let explicitAlley = false;
  let explicitInterior = false;
  let explicitSideAccess: boolean | null = null;

  const kv = /^([^:]+):\s*(.+)$/i;

  for (const line of lines) {
    const m = line.match(kv);
    if (m) {
      const key = m[1].trim().toLowerCase();
      const val = m[2].trim();

      if (key === "zoning") zoning = val;
      else if (key === "lot size" || key === "lot_size_sqft" || key === "lot size (sqft)")
        lotSizeSqft = parseNumber(val);
      else if (key === "lot coverage" || key === "lot_coverage_percent")
        lotCoveragePercent = parsePercent(val);
      else if (key === "available coverage" || key === "available_coverage_sqft")
        availableCoverageSqft = parseNumber(val);
      else if (key === "lot width" || key === "lot_width_ft") {
        const n = parseNumber(val.replace(/\s*ft\s*$/i, ""));
        lotWidthFt = n;
      } else if (key === "lot depth" || key === "lot_depth_ft") {
        const n = parseNumber(val.replace(/\s*ft\s*$/i, ""));
        lotDepthFt = n;
      } else if (key === "tree canopy" || key === "tree_canopy_percent")
        treeCanopyPercent = parsePercent(val);
      else if (key === "eca" || key === "has_eca" || key === "eca issue") {
        const b = parseBoolLoose(val);
        if (b !== null) hasEcaIssue = b;
      } else if (key === "shoreline" || key === "shoreline_flag") {
        const b = parseBoolLoose(val);
        shorelineFlag = b ?? /yes|true|flag/i.test(val);
      } else if (key === "detached garage" || key === "garage") {
        const sq = val.match(/([\d,.]+)\s*sq\s*ft/i);
        if (sq) {
          hasDetachedGarage = true;
          garageSqft = parseNumber(sq[1]);
        } else {
          hasDetachedGarage = /yes|true|\d/i.test(val);
          garageSqft = parseNumber(val) ?? garageSqft;
        }
      } else if (key === "garage sqft" || key === "garage_sqft") {
        garageSqft = parseNumber(val);
        if (garageSqft != null && garageSqft > 0) hasDetachedGarage = true;
      } else if (key === "nearby adus" || key === "nearby adu" || key === "density")
        nearbyAdusPresent = parseBoolLoose(val) ?? /yes|present|\d/.test(val.toLowerCase());
      else if (key === "side access" || key === "has_side_access") {
        explicitSideAccess = parseBoolLoose(val) ?? /yes|true/i.test(val);
      }
      continue;
    }

    if (/^parcel\s+/i.test(line)) {
      const id = line.replace(/^parcel\s+/i, "").trim();
      if (id) parcelId = id.replace(/\s+/g, "");
    } else if (!kv.test(line) && line.length > 5 && !address && !line.includes(":")) {
      if (/^\d+/.test(line) || /(st|ave|rd|blvd|way|dr|ln|ct)\b/i.test(line)) address = line;
    }

    if (/\binterior\s+lot\b/i.test(line)) explicitInterior = true;
    if (/\balley\s+access\b/i.test(line)) explicitAlley = true;
  }

  const { lotType, hasAlleyAccess: inferredAlley, hasSideAccess: inferredSide } =
    inferLotTypeAndAccess(raw, lines);

  let hasAlleyAccess = explicitAlley || inferredAlley || lotType === "alley" || lotType === "alley_corner";
  let lotTypeOut: LotTypeKind = lotType;
  if (explicitInterior && lotTypeOut === "unknown") lotTypeOut = "interior";

  let hasSideAccess = explicitSideAccess ?? inferredSide;
  if (hasSideAccess == null) {
    if (lotTypeOut === "interior" && !hasAlleyAccess) hasSideAccess = false;
    else if (lotTypeOut === "corner" || lotTypeOut === "alley_corner") hasSideAccess = true;
  }

  if (!address && lines[0] && !lines[0].includes(":")) address = lines[0];

  return {
    address,
    parcelId,
    zoning,
    lotSizeSqft,
    lotCoveragePercent,
    availableCoverageSqft,
    lotWidthFt,
    lotDepthFt,
    lotType: lotTypeOut,
    hasAlleyAccess,
    hasSideAccess,
    hasDetachedGarage,
    garageSqft,
    treeCanopyPercent,
    hasEcaIssue,
    shorelineFlag,
    nearbyAdusPresent,
  };
}
