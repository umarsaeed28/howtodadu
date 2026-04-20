import type { DaduRulesScoreResult, ParsedParcel, RatingLetter, ScoreFactorLine } from "./types";

const DADU_ELIGIBLE_PREFIXES = ["NR", "RSL", "LR"] as const;

function zoningIsEligible(zoning: string | null): boolean {
  if (!zoning?.trim()) return false;
  const z = zoning.trim().toUpperCase();
  return DADU_ELIGIBLE_PREFIXES.some((p) => z.startsWith(p));
}

/** NR (Neighborhood Residential) is the preferred DADU context; other eligible zones score lower. */
function zoningDelta(zoning: string | null): { delta: number; detail: string } {
  if (!zoning?.trim()) return { delta: -5, detail: "-5 zoning unknown" };
  const z = zoning.trim().toUpperCase();
  if (z.startsWith("NR")) {
    return { delta: 12, detail: "+12 NR (Neighborhood Residential — highest tier)" };
  }
  if (z.startsWith("RSL")) {
    return { delta: -4, detail: "-4 RSL (eligible, lower than NR for DADU)" };
  }
  if (z.startsWith("LR")) {
    return { delta: -10, detail: "-10 LR (lowrise — lower DADU score than NR)" };
  }
  return { delta: -15, detail: "-15 not NR/RSL/LR" };
}

function accessDelta(p: ParsedParcel): { delta: number; detail: string } {
  if (p.lotType === "alley_corner") {
    return { delta: 25, detail: "+25 alley corner" };
  }
  if (p.hasAlleyAccess || p.lotType === "alley") {
    return { delta: 20, detail: "+20 alley" };
  }
  if (p.hasSideAccess === true || p.lotType === "corner") {
    return { delta: 12, detail: "+12 side access" };
  }
  if (p.lotType === "interior" && p.hasSideAccess === false) {
    return { delta: 0, detail: "+0 interior (no side access)" };
  }
  if (p.lotType === "interior") {
    return { delta: 0, detail: "+0 interior" };
  }
  return { delta: 0, detail: "+0 access (unknown lot type)" };
}

function lotSizeDelta(sqft: number | null): { delta: number; detail: string } {
  if (sqft == null) return { delta: 0, detail: "0 (missing lot size)" };
  if (sqft >= 5000) return { delta: 10, detail: "+10 lot >=5000 sf" };
  if (sqft >= 3200) return { delta: 6, detail: "+6 lot 3200–4999 sf" };
  return { delta: -20, detail: "-20 lot <3200 sf" };
}

function coverageDelta(avail: number | null): { delta: number; detail: string } {
  if (avail == null) return { delta: 0, detail: "0 (missing coverage)" };
  if (avail >= 1000) return { delta: 15, detail: "+15 avail >=1000 sf" };
  if (avail >= 800) return { delta: 10, detail: "+10 avail 800–999 sf" };
  if (avail >= 600) return { delta: 4, detail: "+4 avail 600–799 sf" };
  return { delta: -15, detail: "-15 avail <600 sf" };
}

function widthDelta(ft: number | null): { delta: number; detail: string } {
  if (ft == null) return { delta: 0, detail: "0 (missing width)" };
  if (ft >= 50) return { delta: 10, detail: "+10 width >=50 ft" };
  if (ft >= 40) return { delta: 6, detail: "+6 width 40–49 ft" };
  if (ft >= 25) return { delta: 2, detail: "+2 width 25–39 ft" };
  return { delta: -20, detail: "-20 width <25 ft" };
}

function depthDelta(ft: number | null): { delta: number; detail: string } {
  if (ft == null) return { delta: 0, detail: "0 (missing depth)" };
  if (ft >= 90) return { delta: 8, detail: "+8 depth >=90 ft" };
  if (ft >= 70) return { delta: 4, detail: "+4 depth 70–89 ft" };
  return { delta: -10, detail: "-10 depth <70 ft" };
}

function garageDelta(p: ParsedParcel): { delta: number; detail: string } {
  if (!p.hasDetachedGarage) return { delta: 0, detail: "0 no garage" };
  let d = 10;
  let detail = "+10 detached garage";
  const sq = p.garageSqft ?? 0;
  if (sq > 300) {
    d += 5;
    detail += "; +5 garage >300 sf";
  }
  return { delta: d, detail };
}

function treeDelta(pct: number | null): { delta: number; detail: string } {
  if (pct == null) return { delta: 0, detail: "0 (missing canopy)" };
  if (pct <= 20) return { delta: 0, detail: "0 canopy <=20%" };
  if (pct <= 25) return { delta: -2, detail: "-2 canopy 21–25%" };
  if (pct > 35) return { delta: -15, detail: "-15 canopy >35%" };
  return { delta: -8, detail: "-8 canopy >25%" };
}

function computeHardCapCeiling(p: ParsedParcel): number {
  let cap = 100;
  if (p.hasEcaIssue) cap = Math.min(cap, 30);
  if (p.shorelineFlag === true) cap = Math.min(cap, 25);
  const av = p.availableCoverageSqft;
  if (av != null && av < 400) cap = Math.min(cap, 20);
  if (!zoningIsEligible(p.zoning)) cap = Math.min(cap, 10);
  return cap;
}

function collectMissing(p: ParsedParcel): string[] {
  const m: string[] = [];
  if (p.address == null) m.push("address");
  if (p.zoning == null) m.push("zoning");
  if (p.lotSizeSqft == null) m.push("lot_size_sqft");
  if (p.availableCoverageSqft == null) m.push("available_coverage_sqft");
  if (p.lotWidthFt == null) m.push("lot_width_ft");
  if (p.lotDepthFt == null) m.push("lot_depth_ft");
  if (p.treeCanopyPercent == null) m.push("tree_canopy_percent");
  return m;
}

function collectFlags(p: ParsedParcel): string[] {
  const flags: string[] = [];
  if (p.hasEcaIssue) flags.push("eca_flagged");
  if (p.shorelineFlag === true) flags.push("shoreline_flagged");
  if (p.treeCanopyPercent != null && p.treeCanopyPercent > 25) flags.push("tree_canopy_high");
  if (p.treeCanopyPercent != null && p.treeCanopyPercent > 35) flags.push("tree_canopy_very_high");
  if (p.availableCoverageSqft != null && p.availableCoverageSqft < 400) flags.push("coverage_under_400_hard_cap");
  if (p.availableCoverageSqft != null && p.availableCoverageSqft < 800) flags.push("coverage_under_800");
  if (!zoningIsEligible(p.zoning)) flags.push("zoning_not_nr_rsl_lr");
  else if (p.zoning?.trim()) {
    const z = p.zoning.trim().toUpperCase();
    if (z.startsWith("NR")) flags.push("nr_zoning_preferred");
    else if (z.startsWith("RSL") || z.startsWith("LR")) flags.push("zoning_not_nr_tier");
  }
  if (collectMissing(p).length > 0) flags.push("missing_data");
  return flags;
}

/** Map numeric score to A–F rating. */
export function generateRating(score: number): { letter: RatingLetter; label: string } {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 85) return { letter: "A", label: "Prime DADU Opportunity" };
  if (s >= 70) return { letter: "B", label: "Strong Candidate" };
  if (s >= 55) return { letter: "C", label: "Moderate" };
  if (s >= 40) return { letter: "D", label: "Low Feasibility" };
  return { letter: "F", label: "Poor Candidate" };
}

/**
 * Rules engine: base 50, additive adjustments, hard cap ceiling, ECA reinforcement, clamp.
 */
export function scoreParcel(p: ParsedParcel): DaduRulesScoreResult {
  let score = 50;
  const lines: ScoreFactorLine[] = [];

  const cap = computeHardCapCeiling(p);

  const acc = accessDelta(p);
  score += acc.delta;
  lines.push({ key: "access", label: "Access", delta: acc.delta, detail: acc.detail });

  const ls = lotSizeDelta(p.lotSizeSqft);
  score += ls.delta;
  lines.push({ key: "lot_size", label: "Lot size", delta: ls.delta, detail: ls.detail });

  const cov = coverageDelta(p.availableCoverageSqft);
  score += cov.delta;
  lines.push({ key: "coverage", label: "Available coverage", delta: cov.delta, detail: cov.detail });

  const w = widthDelta(p.lotWidthFt);
  score += w.delta;
  lines.push({ key: "width", label: "Lot width", delta: w.delta, detail: w.detail });

  const d = depthDelta(p.lotDepthFt);
  score += d.delta;
  lines.push({ key: "depth", label: "Lot depth", delta: d.delta, detail: d.detail });

  const g = garageDelta(p);
  score += g.delta;
  lines.push({ key: "garage", label: "Garage", delta: g.delta, detail: g.detail });

  const tr = treeDelta(p.treeCanopyPercent);
  score += tr.delta;
  lines.push({ key: "canopy", label: "Tree canopy", delta: tr.delta, detail: tr.detail });

  const zon = zoningDelta(p.zoning);
  score += zon.delta;
  lines.push({ key: "zoning", label: "Zoning tier", delta: zon.delta, detail: zon.detail });

  if (p.nearbyAdusPresent === true) {
    score += 5;
    lines.push({ key: "density", label: "Nearby ADUs", delta: 5, detail: "+5 nearby ADUs" });
  }

  score = Math.min(score, cap);

  let ecaExtra = 0;
  if (p.hasEcaIssue) {
    ecaExtra = -15;
    score += ecaExtra;
    lines.push({ key: "eca", label: "ECA reinforcement", delta: ecaExtra, detail: "-15 ECA present" });
  } else {
    lines.push({ key: "eca", label: "ECA reinforcement", delta: 0, detail: "0" });
  }

  if (p.availableCoverageSqft != null && p.availableCoverageSqft < 700) {
    score = Math.min(score, 74);
  }

  score = Math.max(0, Math.min(100, score));

  const { letter, label: ratingLabel } = generateRating(score);

  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const factors: Record<string, string> = {
    access: acc.detail,
    coverage: fmt(cov.delta),
    garage: fmt(g.delta),
    canopy: fmt(tr.delta),
    zoning: fmt(zon.delta),
    eca: p.hasEcaIssue ? String(ecaExtra) : "0",
  };

  const flags = collectFlags(p);

  return {
    score,
    rating: letter,
    ratingLabel,
    factors,
    factorLines: lines,
    flags: [...new Set(flags)],
    missingFields: collectMissing(p),
    hardCapCeiling: cap,
  };
}

/**
 * Structured breakdown for API / JSON. If `result` is omitted, scores from scratch.
 * (Spec name `buildScoreBreakdown(parcel, score)` is approximated: pass {@link DaduRulesScoreResult}
 * from {@link scoreParcel} for full factor lines; passing only parcel is equivalent to scoring once.)
 */
export function buildScoreBreakdown(
  parcel: ParsedParcel,
  result?: DaduRulesScoreResult
): Record<string, unknown> {
  const r = result ?? scoreParcel(parcel);
  return {
    baseScore: 50,
    hardCapCeiling: r.hardCapCeiling,
    factorLines: r.factorLines,
    finalScore: r.score,
    rating: r.rating,
    ratingLabel: r.ratingLabel,
    factors: r.factors,
    flags: r.flags,
    missingFields: r.missingFields,
    parcelSnapshot: parcel,
  };
}
