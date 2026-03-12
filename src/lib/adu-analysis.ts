import type { ParcelData, FeasibilityData } from "./feasibility";

export type CheckStatus = "pass" | "fail" | "info" | "warning";

export interface FeasibilityCheck {
  label: string;
  status: CheckStatus;
  value: string;
  shortNote: string;
}

export interface CoverageData {
  currentPercent: number;
  maxPercent: number;
  usedSqft: number;
  maxSqft: number;
  availableSqft: number;
}

export interface HeightData {
  base: number;
  pitched: number;
  shed: number;
  total: number;
  lotWidth: number;
}

export interface PropertyTrait {
  icon: "corner" | "interior" | "garage" | "tree" | "alley" | "lot" | "hazard" | "water" | "slope" | "access" | "noAccess";
  title: string;
  note: string;
  sentiment: "good" | "bad" | "neutral";
}

export interface EcaSummary {
  hasIssues: boolean;
  count: number;
  labels: string[];
  totalPenalty: number;
}

export interface AccessInfo {
  type: "alley" | "corner" | "side" | "none";
  sideYardFt: number | null;
  adequate: boolean;
  note: string;
}

export interface NearbyADU {
  type: "AADU" | "DADU";
  count: number;
  nearestFeet: number | null;
}

/* ── DADU Footprint Suggestion ── */

export interface DADUFootprint {
  maxAllowedSqft: number;
  buildableSqft: number;
  stories: 1 | 2;
  footprintSqft: number;
  livingSqft: number;
  suggestedWidth: number;
  suggestedDepth: number;
  maxHeight: number;
  rearSetback: number;
  sideSetback: number;
  garageConversion: boolean;
  garageNote: string | null;
  note: string;
}

/* ── Middle Housing Options ── */

export interface HousingOption {
  type: string;
  description: string;
  estimatedUnits: number | null;
  allowed: boolean;
  note: string;
}

/* ── Full Report ── */

export interface ADUReport {
  confidence: number;
  confidenceLabel: string;
  headline: string;
  checks: FeasibilityCheck[];
  coverage: CoverageData | null;
  height: HeightData | null;
  traits: PropertyTrait[];
  nearby: NearbyADU[];
  stats: { label: string; value: string; sub?: string }[];
  daduFootprint: DADUFootprint | null;
  housingOptions: HousingOption[];
  eca: EcaSummary;
  access: AccessInfo;
}

const ADU_ELIGIBLE_ZONES = ["NR", "RSL", "LR", "SF"];
const MIN_LOT_SIZE = 3200;
const MIN_LOT_WIDTH = 25;
const MIN_LOT_DEPTH = 70;

function zoneFamily(zoning: string | null): string | null {
  if (!zoning) return null;
  const z = zoning.toUpperCase().trim();
  if (z.startsWith("NR")) return "NR";
  if (z.startsWith("RSL")) return "RSL";
  if (z.startsWith("LR")) return "LR";
  if (z.startsWith("SF")) return "SF";
  return null;
}

function maxCoverageFrac(lotSqft: number): number {
  return (lotSqft >= 5000 ? 35 : 15 + (lotSqft / 5000) * 20) / 100;
}

function heightLimits(width: number) {
  if (width >= 50) return { base: 18, pitched: 7, shed: 4 };
  if (width >= 40) return { base: 18, pitched: 5, shed: 4 };
  if (width >= 30) return { base: 16, pitched: 7, shed: 4 };
  return { base: 14, pitched: 3, shed: 3 };
}

/* ── DADU Footprint Calculation (SMC 23.44.041) ── */

function computeDADUFootprint(
  lot: number,
  availCov: number,
  w: number,
  hl: { base: number; pitched: number } | null
): DADUFootprint | null {
  if (lot < MIN_LOT_SIZE) return null;

  const codeMax = lot >= 4000 ? 1000 : 800;
  const buildable = Math.min(codeMax, availCov);
  if (buildable <= 0) return null;

  const maxH = hl ? hl.base + hl.pitched : 17;
  const canTwoStory = maxH >= 18 && buildable >= 400;
  const stories: 1 | 2 = canTwoStory && buildable >= 500 ? 2 : 1;

  const footprint = stories === 2 ? Math.round(buildable / 2) : buildable;
  const living = stories === 2 ? buildable : buildable;

  const dims = suggestDimensions(footprint, w);

  return {
    maxAllowedSqft: codeMax,
    buildableSqft: buildable,
    stories,
    footprintSqft: footprint,
    livingSqft: living,
    suggestedWidth: dims.w,
    suggestedDepth: dims.d,
    maxHeight: maxH,
    rearSetback: 5,
    sideSetback: 5,
    garageConversion: false,
    garageNote: null,
    note:
      buildable < codeMax
        ? `Coverage limits cap your buildable DADU at ${buildable} sq ft (code allows up to ${codeMax}).`
        : `You can build up to ${codeMax} sq ft.`,
  };
}

function suggestDimensions(
  sqft: number,
  lotWidth: number
): { w: number; d: number } {
  const maxW = Math.max(16, lotWidth - 10);
  const presets: [number, number][] = [
    [24, 24],
    [20, 25],
    [20, 30],
    [22, 28],
    [24, 30],
    [20, 40],
    [25, 32],
    [25, 40],
    [28, 36],
  ];

  let best: [number, number] = [20, Math.round(sqft / 20)];
  let bestDiff = Infinity;

  for (const [pw, pd] of presets) {
    const area = pw * pd;
    const diff = Math.abs(area - sqft);
    if (diff < bestDiff && pw <= maxW) {
      best = [pw, pd];
      bestDiff = diff;
    }
  }

  return { w: best[0], d: best[1] };
}

/* ── Middle Housing Options by Zone ── */

function computeHousingOptions(
  family: string | null,
  zone: string | null,
  lot: number,
  totalADU: number
): HousingOption[] {
  const opts: HousingOption[] = [];

  if (family === "NR" || family === "SF") {
    const canAdd = Math.max(0, 2 - totalADU);
    opts.push({
      type: "DADU",
      description: "Detached Accessory Dwelling Unit in the rear yard.",
      estimatedUnits: canAdd > 0 ? 1 : 0,
      allowed: canAdd > 0 && lot >= MIN_LOT_SIZE,
      note:
        canAdd > 0
          ? "Up to 1,000 sq ft. Must meet setback and coverage rules."
          : "Already at the 2-ADU maximum.",
    });
    opts.push({
      type: "AADU",
      description: "Attached ADU within or attached to the main house.",
      estimatedUnits: canAdd > 0 ? 1 : 0,
      allowed: canAdd > 0,
      note: "Can be a basement conversion, addition, or internal remodel.",
    });
    if (lot >= 4000) {
      opts.push({
        type: "Cottage Housing",
        description: "Cluster of small detached units around shared space.",
        estimatedUnits: lot >= 6000 ? Math.floor(lot / 2000) : 2,
        allowed: true,
        note: "Requires minimum lot size and special review.",
      });
    }
  }

  if (family === "LR") {
    const z = (zone || "").toUpperCase();
    let densityPerUnit = 1600;
    let label = "LR1";
    if (z.includes("LR3")) {
      densityPerUnit = 800;
      label = "LR3";
    } else if (z.includes("LR2")) {
      densityPerUnit = 1200;
      label = "LR2";
    }

    const estUnits = Math.max(2, Math.floor(lot / densityPerUnit));

    opts.push({
      type: "Townhouses",
      description: "Row of attached homes, each on its own lot.",
      estimatedUnits: estUnits,
      allowed: true,
      note: `${label} zoning allows townhouse development.`,
    });
    opts.push({
      type: "Apartments",
      description: "Multi-unit residential building.",
      estimatedUnits: estUnits,
      allowed: true,
      note: `${label} density allows approximately ${estUnits} units.`,
    });
    opts.push({
      type: "DADU",
      description: "Detached ADU in the rear yard.",
      estimatedUnits: 1,
      allowed: lot >= MIN_LOT_SIZE,
      note: "ADUs are also allowed in Lowrise zones.",
    });
  }

  if (family === "RSL") {
    opts.push({
      type: "Small Lot Housing",
      description: "Detached homes on smaller lots via unit lot subdivision.",
      estimatedUnits: Math.max(2, Math.floor(lot / 2500)),
      allowed: true,
      note: "RSL zoning allows small lot development.",
    });
    opts.push({
      type: "Cottage Housing",
      description: "Cluster of small homes around shared open space.",
      estimatedUnits: Math.max(2, Math.floor(lot / 2000)),
      allowed: true,
      note: "Well-suited for cottage-style development.",
    });
    opts.push({
      type: "DADU",
      description: "Detached ADU in the rear yard.",
      estimatedUnits: 1,
      allowed: lot >= MIN_LOT_SIZE,
      note: "ADUs are allowed in RSL zones.",
    });
  }

  return opts;
}

/* ── ECA (Environmentally Critical Area) Analysis ── */

function computeEca(factors: FeasibilityData | null): EcaSummary {
  const labels: string[] = [];
  let penalty = 0;

  if (factors?.steepSlopePercent != null && factors.steepSlopePercent > 0.1) {
    const pct = Math.round(factors.steepSlopePercent * 100);
    labels.push(`Steep slope (${pct}% of lot)`);
    penalty += pct > 40 ? 10 : 5;
  }
  if (factors?.floodProne) { labels.push("Flood-prone area"); penalty += 8; }
  if (factors?.knownSlide) { labels.push("Known landslide area"); penalty += 10; }
  if (factors?.potentialSlide) { labels.push("Potential slide area"); penalty += 5; }
  if (factors?.peat) { labels.push("Peat settlement zone"); penalty += 5; }
  if (factors?.liquefaction) { labels.push("Liquefaction zone"); penalty += 4; }
  if (factors?.wetlandPercent != null && factors.wetlandPercent > 0.05) {
    labels.push(`Wetland (${Math.round(factors.wetlandPercent * 100)}% of lot)`);
    penalty += 6;
  }
  if (factors?.riparianPercent != null && factors.riparianPercent > 0.05) {
    labels.push("Riparian corridor");
    penalty += 4;
  }
  if (factors?.shoreline && factors.shoreline !== "None" && factors.shoreline !== "none") {
    labels.push(`Shoreline: ${factors.shoreline}`);
    penalty += 5;
  }

  return { hasIssues: labels.length > 0, count: labels.length, labels, totalPenalty: penalty };
}

/* ── Access Analysis ── */

const MIN_SIDE_ACCESS_FT = 10;

function estimateSideYard(lotWidth: number, coverageFrac: number, lotSqft: number): number {
  if (lotWidth <= 0 || lotSqft <= 0) return 0;
  const coverageSqft = coverageFrac * lotSqft;
  if (coverageSqft <= 0) return lotWidth;
  const houseWidth = Math.min(lotWidth * 0.6, Math.sqrt(coverageSqft * 1.3));
  return Math.round(((lotWidth - houseWidth) / 2) * 10) / 10;
}

function computeAccess(factors: FeasibilityData | null, lotWidth: number, lotSqft: number): AccessInfo {
  const lt = factors?.lotType?.toLowerCase() ?? "";
  const hasAlley = factors?.hasAlley ?? false;
  const covFrac = factors?.lotCoveragePercent ?? 0;

  const sideYard = estimateSideYard(lotWidth, covFrac, lotSqft);

  if (hasAlley) {
    return {
      type: "alley",
      sideYardFt: sideYard > 0 ? sideYard : null,
      adequate: true,
      note: "Alley provides direct rear access for DADU construction and utilities.",
    };
  }

  if (lt === "corner") {
    return {
      type: "corner",
      sideYardFt: sideYard > 0 ? sideYard : null,
      adequate: true,
      note: "Corner lot has street access on two sides — excellent for DADU entry.",
    };
  }

  if (sideYard >= MIN_SIDE_ACCESS_FT) {
    return {
      type: "side",
      sideYardFt: sideYard,
      adequate: true,
      note: `~${sideYard} ft side yard provides adequate passage for construction equipment and future access.`,
    };
  }

  if (sideYard > 0 && sideYard < MIN_SIDE_ACCESS_FT) {
    return {
      type: "side",
      sideYardFt: sideYard,
      adequate: false,
      note: `~${sideYard} ft side yard is tight. Minimum ~10 ft recommended for construction access. May need crane delivery.`,
    };
  }

  return {
    type: "none",
    sideYardFt: null,
    adequate: false,
    note: "No clear access path to rear yard. Construction logistics will be challenging and costly.",
  };
}

/* ═══════════════════════════ Main Report ═══════════════════════════ */

export function generateADUReport(
  parcel: ParcelData | null,
  factors: FeasibilityData | null
): ADUReport {
  const zone = parcel?.zoning || parcel?.zoningCategory || null;
  const family = zoneFamily(zone);
  const lot = parcel?.lotSqft ?? 0;
  const w = factors?.lotWidth ?? 0;
  const d = factors?.lotDepth ?? 0;
  const covFrac = factors?.lotCoveragePercent ?? 0;
  const totalADU = factors?.totalADU ?? 0;

  const zoningOk = family !== null && ADU_ELIGIBLE_ZONES.includes(family);
  const sizeOk = lot >= MIN_LOT_SIZE;
  const widthOk = w >= MIN_LOT_WIDTH;
  const depthOk = d >= MIN_LOT_DEPTH;
  const aduOk = totalADU < 2;
  const maxCov = maxCoverageFrac(lot);
  const covOk = factors?.lotCoverageOver === false || covFrac < maxCov;

  const eca = computeEca(factors);
  const access = computeAccess(factors, w, lot);

  /* ── Confidence Score ── */

  let score = 0;

  // Core requirements (70 pts max)
  if (zoningOk) score += 25;
  if (aduOk) score += 10;
  if (sizeOk) score += 15;
  if (covOk) score += 10;
  if (widthOk) score += 5;
  if (depthOk) score += 5;

  // Access bonuses (up to +18)
  if (access.type === "alley") score += 18;
  else if (access.type === "corner") score += 15;
  else if (access.type === "side" && access.adequate) score += 15;
  else if (access.type === "side" && !access.adequate) score += 5;
  // no access: +0

  // Detached garage is a practical positive (easy to demo for DADU)
  if ((factors?.detachedGarageCount ?? 0) > 0) score += 5;

  // Tree canopy penalty (soft)
  const canopyPc = (factors?.treeCanopyPercent ?? 0) * 100;
  if (canopyPc > 25) {
    score -= Math.min(10, Math.round((canopyPc - 25) * 0.3));
  }

  // ECA penalty (hard — these are real barriers)
  score -= eca.totalPenalty;

  // No access is a significant practical concern
  if (access.type === "none" && w > 0) score -= 10;

  const confidence = Math.max(0, Math.min(100, score));

  let confidenceLabel: string;
  let headline: string;
  if (confidence >= 85) {
    confidenceLabel = "High Feasibility";
    headline = "Your lot looks great for a DADU.";
  } else if (confidence >= 60) {
    confidenceLabel = "Moderate Feasibility";
    headline = "Your lot has potential — a few things to verify.";
  } else if (confidence >= 30) {
    confidenceLabel = "Low Feasibility";
    headline = "There are some challenges with this lot.";
  } else {
    confidenceLabel = "Unlikely";
    headline = "This lot may not be eligible for a DADU.";
  }

  const checks: FeasibilityCheck[] = [
    {
      label: "Zoning",
      status: zoningOk ? "pass" : "fail",
      value: zone || "Unknown",
      shortNote: zoningOk
        ? "ADUs are allowed in this zone."
        : "This zone may not allow ADUs.",
    },
    {
      label: "Existing ADUs",
      status: aduOk ? "pass" : "warning",
      value: totalADU === 0 ? "None on record" : `${totalADU} of 2 max`,
      shortNote:
        totalADU === 0
          ? "Room for up to 2 ADUs on this lot."
          : totalADU === 1
            ? "One ADU exists — room for one more."
            : "Already at the 2-ADU maximum.",
    },
    {
      label: "Lot Size",
      status: sizeOk ? "pass" : "warning",
      value: `${lot.toLocaleString()} sq ft`,
      shortNote: sizeOk
        ? `Meets the ${MIN_LOT_SIZE.toLocaleString()} sq ft minimum.`
        : `Below the ${MIN_LOT_SIZE.toLocaleString()} sq ft minimum.`,
    },
    {
      label: "Lot Width",
      status: widthOk ? "pass" : "warning",
      value: `~${w} ft`,
      shortNote: widthOk
        ? `Meets the ${MIN_LOT_WIDTH} ft minimum.`
        : `Below the ${MIN_LOT_WIDTH} ft minimum.`,
    },
    {
      label: "Lot Depth",
      status: depthOk ? "pass" : "warning",
      value: `~${d} ft`,
      shortNote: depthOk
        ? `Meets the ${MIN_LOT_DEPTH} ft minimum.`
        : `Below the ${MIN_LOT_DEPTH} ft minimum.`,
    },
    {
      label: "Lot Coverage",
      status: covOk ? "pass" : "warning",
      value: `${(covFrac * 100).toFixed(1)}%`,
      shortNote: covOk
        ? `Under the ${(maxCov * 100).toFixed(0)}% limit — room to build.`
        : `Near or over the ${(maxCov * 100).toFixed(0)}% limit.`,
    },
  ];

  const maxCovSqft = Math.round(maxCov * lot);
  const usedSqft = Math.round(covFrac * lot);
  const availCov = Math.max(0, maxCovSqft - usedSqft);
  const coverage: CoverageData | null =
    lot > 0
      ? {
          currentPercent: covFrac * 100,
          maxPercent: maxCov * 100,
          usedSqft,
          maxSqft: maxCovSqft,
          availableSqft: availCov,
        }
      : null;

  const hl = w > 0 ? heightLimits(w) : null;
  const height: HeightData | null = hl
    ? { ...hl, total: hl.base + hl.pitched, lotWidth: w }
    : null;

  /* ── Traits (categorized as good / bad / neutral) ── */

  const traits: PropertyTrait[] = [];
  const lt = factors?.lotType?.toLowerCase() ?? "";

  // Good: Access traits
  if (lt === "corner") {
    traits.push({ icon: "corner", title: "Corner lot", note: "Street access on two sides — great for DADU entry.", sentiment: "good" });
  }
  if (factors?.hasAlley) {
    traits.push({ icon: "alley", title: "Alley access", note: "Direct rear access simplifies DADU construction and utilities.", sentiment: "good" });
  }

  // Good / Neutral: Side access measurement
  if (access.type === "side" || (lt === "interior" && !factors?.hasAlley)) {
    const sy = access.sideYardFt;
    if (sy != null && sy >= MIN_SIDE_ACCESS_FT) {
      traits.push({ icon: "access", title: `Side yard: ~${sy} ft`, note: "Adequate clearance for construction equipment access.", sentiment: "good" });
    } else if (sy != null && sy > 0) {
      traits.push({ icon: "access", title: `Side yard: ~${sy} ft`, note: `Below the ~10 ft recommended minimum. May need crane delivery for materials.`, sentiment: "bad" });
    } else if (lt === "interior") {
      traits.push({ icon: "noAccess", title: "Limited side access", note: "Interior lot with tight side yards. Construction logistics will be challenging.", sentiment: "bad" });
    }
  }

  // Good: Detached garage
  if (factors?.detachedGarageCount && factors.detachedGarageCount > 0) {
    const sq = factors.detachedGarageSqft ?? 0;
    traits.push({
      icon: "garage",
      title: "Detached garage",
      note: sq > 0 ? `${sq} sq ft — can be demolished to free coverage for DADU.` : "Can be demolished to make room for DADU.",
      sentiment: "good",
    });
  }

  // Neutral: Tree canopy
  if (factors?.treeCanopyPercent != null && factors.treeCanopyPercent > 0) {
    const pc = Math.round(factors.treeCanopyPercent * 100);
    traits.push({
      icon: "tree",
      title: "Tree canopy",
      note: `~${pc}% cover. ${pc > 25 ? "Significant removal may need a permit and adds cost." : "Removal may need a permit."}`,
      sentiment: pc > 25 ? "bad" : "neutral",
    });
  }

  // Bad: ECA traits
  if (factors?.steepSlopePercent != null && factors.steepSlopePercent > 0) {
    const pct = Math.round(factors.steepSlopePercent * 100);
    traits.push({
      icon: "slope",
      title: "Steep slope",
      note: `~${pct}% of lot.${pct > 10 ? " ECA — geotechnical study required. May limit buildable area." : " May affect building placement."}`,
      sentiment: pct > 10 ? "bad" : "neutral",
    });
  }
  if (factors?.wetlandPercent != null && factors.wetlandPercent > 0) {
    traits.push({
      icon: "water",
      title: "Wetland area",
      note: `~${Math.round(factors.wetlandPercent * 100)}% of lot. ECA — setback buffers required. Limits buildable area.`,
      sentiment: "bad",
    });
  }
  if (factors?.floodProne) {
    traits.push({ icon: "hazard", title: "Flood-prone area", note: "ECA — special flood zone regulations apply. Elevated construction likely required.", sentiment: "bad" });
  }
  if (factors?.liquefaction) {
    traits.push({ icon: "hazard", title: "Liquefaction zone", note: "ECA — geotechnical study required. Special foundation design needed.", sentiment: "bad" });
  }
  if (factors?.knownSlide) {
    traits.push({ icon: "slope", title: "Known slide area", note: "ECA — geotechnical review required for permitting. Significant cost impact.", sentiment: "bad" });
  } else if (factors?.potentialSlide) {
    traits.push({ icon: "slope", title: "Potential slide area", note: "ECA — geotechnical review likely required for permitting.", sentiment: "bad" });
  }
  if (factors?.peat) {
    traits.push({ icon: "hazard", title: "Peat settlement", note: "ECA — special foundation design needed. Adds significant cost.", sentiment: "bad" });
  }
  if (factors?.shoreline && factors.shoreline !== "None" && factors.shoreline !== "none") {
    traits.push({ icon: "water", title: "Shoreline zone", note: `${factors.shoreline}. ECA — Shoreline Master Program rules apply.`, sentiment: "bad" });
  }

  // Bad: No access
  if (access.type === "none" && w > 0) {
    traits.push({
      icon: "noAccess",
      title: "No rear access",
      note: "No alley, corner, or adequate side yard. Construction logistics will be difficult and expensive.",
      sentiment: "bad",
    });
  }

  const nearby: NearbyADU[] = [];
  if ((factors?.nearbyAADU ?? 0) > 0)
    nearby.push({ type: "AADU", count: factors!.nearbyAADU!, nearestFeet: factors!.nearestAADUDist ? Math.round(factors!.nearestAADUDist) : null });
  if ((factors?.nearbyDADU ?? 0) > 0)
    nearby.push({ type: "DADU", count: factors!.nearbyDADU!, nearestFeet: factors!.nearestDADUDist ? Math.round(factors!.nearestDADUDist) : null });

  const stats: ADUReport["stats"] = [
    { label: "Lot Size", value: `${lot.toLocaleString()}`, sub: "sq ft" },
    { label: "Zoning", value: zone || "—" },
    { label: "Dimensions", value: w && d ? `${w} x ${d}` : "—", sub: w && d ? "ft" : undefined },
    { label: "Year Built", value: parcel?.yearBuilt || "—" },
  ];

  const daduFootprint = zoningOk
    ? computeDADUFootprint(lot, availCov, w, hl)
    : null;

  const housingOptions = computeHousingOptions(family, zone, lot, totalADU);

  return {
    confidence,
    confidenceLabel,
    headline,
    checks,
    coverage,
    height,
    traits,
    nearby,
    stats,
    daduFootprint,
    housingOptions,
    eca,
    access,
  };
}
