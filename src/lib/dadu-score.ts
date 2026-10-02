/**
 * The DADU site score: a rules baseline built from the knowledge base (rag/documents/31 to 36).
 * Every lot gets it, fast and deterministic. For a listing, Claude reads the retrieved passages and may move it
 * (see src/lib/ai/orchestrator.ts). Gates are hard: a lot that fails one has no score.
 *
 * Keep the weights and bands in step with rag/documents/36-site-score.md (a test checks).
 */
import { MIN_LOT_SQFT, planSite, type Layout } from "@/lib/dadu-site-plan";
import { MIN_FOOTPRINT_SQFT, type TreeStats } from "@/lib/tree-analysis";
import { GRADE_MODERATE_PCT, GRADE_STEEP_PCT, GRADE_VERY_STEEP_PCT, gradeNote, type GradeStats } from "@/lib/grade";

/** A DADU smaller than this is not worth building. */
export const MIN_DADU_SQFT = 300;
const FULL_DADU_SQFT = 1000;

export const WEIGHTS = { access: 30, layout: 20, size: 15, site: 15, trees: 20 } as const;
export type FactorKey = keyof typeof WEIGHTS;

export const FACTOR_NAMES: Record<FactorKey, string> = {
  access: "Vehicle access",
  layout: "Layout fit",
  size: "DADU size",
  site: "Slope and critical areas",
  trees: "Tree canopy",
};

/** Grade bands. Tier ids match the lot library: 3 top pick, 2 good, 1 fair, 0 marginal. */
export const GRADE_BANDS = [
  { tier: 3, label: "Top pick", min: 93 },
  { tier: 2, label: "Good", min: 82 },
  { tier: 1, label: "Fair", min: 70 },
  { tier: 0, label: "Marginal", min: 0 },
] as const;
export type Tier = 3 | 2 | 1 | 0;

/** Lots and listings scoring under this are not shown anywhere in the app (map, list, listing pages). */
export const MIN_SHOWN_SCORE = 75;

export function gradeOf(score: number): { tier: Tier; label: string } {
  const b = GRADE_BANDS.find((g) => score >= g.min) ?? GRADE_BANDS[3];
  return { tier: b.tier, label: b.label };
}

export interface ScoreInput {
  lotSqft: number;
  widthFt: number | null;
  depthFt: number | null;
  alley: boolean | null;
  corner: boolean;
  /** Largest DADU the engine fits, sq ft. Null when it found no room. */
  daduSqft: number | null;
  /** Fractions 0 to 1 or percents 0 to 100; both accepted. */
  steepPct: number | null;
  canopyPct: number | null;
  /** Critical-area flags other than steep slope: wetland, riparian, slide, flood, peat, landfill. */
  ecaFlags: string[];
  existingAdus: number | null;
  /** Room the house leaves on its wider side, feet (building outlines). Null when not measured. */
  sideClearanceFt?: number | null;
  zoning: string | null;
  /** Monthly HOA dues. Null when unknown (the lot library has no HOA data). */
  hoaMonthly: number | null;
  /** Tree-by-tree measurement from the 2021 LiDAR crowns (tree-analysis.ts). Null when not measured. */
  trees?: TreeStats | null;
  /** Slope of the ground across the DADU site, from 1 m lidar (grade.ts). Null when not measured. */
  grade?: GradeStats | null;
}

export interface Gate {
  key: "hoa" | "area" | "adus" | "dadu" | "access" | "zoning" | "trees";
  label: string;
  status: "pass" | "fail" | "unknown";
  note: string;
}

export interface Factor {
  key: FactorKey;
  name: string;
  weight: number;
  score: number;
  note: string;
}

export interface SiteScore {
  /** False when any gate fails. Such a lot cannot have a DADU and has no score. */
  eligible: boolean;
  gates: Gate[];
  factors: Factor[];
  /** 0 to 100, rounded. 0 when not eligible. */
  score: number;
  tier: Tier;
  grade: string;
}

const pct = (v: number | null) => (v == null ? null : v <= 1 ? v * 100 : v);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Side room is measured from the city's building outlines, which are traced from rooftops and include the eaves.
 * Ground clearance is usually a foot or two wider than the roofline gap. So: 12 ft or more is comfortable, 10 to 12 ft
 * fits a driveway, 8 to 10 ft may fit at ground level (confirm on site), under 8 ft is blocked.
 */
export const DRIVEWAY_FT = 10;
export const BLOCKED_BELOW_FT = 8;
const COMFORTABLE_DRIVEWAY_FT = 12;

function accessFactor(i: ScoreInput, w: number | null): { score: number; note: string } {
  if (i.alley) return { score: 100, note: "Alley access: cars reach the DADU from the rear, no driveway needed." };
  if (i.corner) return { score: 90, note: "Corner lot: a second street frontage can serve the DADU." };
  const side = i.sideClearanceFt;
  if (side != null) {
    const ft = Math.round(side);
    if (side >= COMFORTABLE_DRIVEWAY_FT) return { score: 75, note: `No alley. The house leaves ${ft} ft on one side, room for a driveway to the back.` };
    if (side >= DRIVEWAY_FT) return { score: 45, note: `No alley. The house leaves ${ft} ft on one side: a driveway just fits, and it is tight.` };
    if (side >= BLOCKED_BELOW_FT) return { score: 30, note: `No alley. The roofline leaves about ${ft} ft on one side. Below the eaves it may reach the ${DRIVEWAY_FT} ft a driveway needs; confirm on site.` };
    return { score: 0, note: `No alley. The house leaves only ${ft} ft on its wider side; a driveway needs ${DRIVEWAY_FT} ft.` };
  }
  if (w == null) return { score: 50, note: "Lot width unknown, so side-driveway room cannot be checked." };
  if (w >= 45) return { score: 75, note: `No alley, ${w} ft wide: a side driveway past the house is workable.` };
  if (w >= 40) return { score: 45, note: `No alley, ${w} ft wide: a side driveway is very tight.` };
  return { score: 15, note: `No alley, ${w} ft wide: too narrow for a driveway, so the DADU is likely walk-in only.` };
}

function layoutFactor(kind: Layout, w: number | null, d: number | null, stackRisk: boolean): { score: number; note: string } {
  if (w == null || d == null) return { score: 60, note: "Lot shape unknown, so the default single rear DADU is assumed." };
  if (kind === "side_by_side") return { score: 100, note: `${w} ft wide: side by side fits, the layout that resells best.` };
  if (kind === "staggered" && !stackRisk) return { score: 90, note: `${w} by ${d} ft: deep and wide enough to stagger front to back.` };
  if (kind === "staggered") return { score: 55, note: `${w} by ${d} ft: deep but narrow. Only a staggered layout works, and a straight stack must be avoided.` };
  if (w >= 45) return { score: 80, note: `${w} ft wide: a single rear DADU with room for a side driveway.` };
  if (w >= 40) return { score: 70, note: `${w} ft wide: the common Seattle lot, suited to one rear DADU.` };
  return { score: 40, note: `${w} ft wide: narrower than the common 40 ft lot, so layout options are limited.` };
}

function sizeFactor(sf: number): { score: number; note: string } {
  const s = sf >= FULL_DADU_SQFT ? 100 : 30 + ((sf - MIN_DADU_SQFT) / (FULL_DADU_SQFT - MIN_DADU_SQFT)) * 70;
  return { score: Math.round(clamp(s)), note: `The lot fits a DADU of up to ${Math.round(sf).toLocaleString("en-US")} sf.` };
}

function siteFactor(steep: number | null, flags: string[], grade?: GradeStats | null): { score: number; note: string } {
  const f = (steep ?? 0) / 100;
  const base = f < 0.05 ? 90 : f < 0.15 ? 70 : f < 0.25 ? 50 : f < 0.4 ? 30 : 10;
  let score = clamp(base + (f < 0.05 && !flags.length ? 10 : 0) - flags.length * 20);
  const slope = f < 0.05 ? "No meaningful steep slope" : `Steep slope on ${Math.round(f * 100)}% of the lot`;
  let note = flags.length ? `${slope}. Critical-area flags: ${flags.join(", ")}.` : `${slope}, and no critical-area flags.`;
  // The ground where the DADU goes: a sloped site costs more to build (foundation, retaining walls, excavation).
  if (grade) {
    if (grade.slopePct >= GRADE_VERY_STEEP_PCT) score = Math.min(score, 10);
    else if (grade.slopePct >= GRADE_STEEP_PCT) score = Math.min(score, 40);
    else if (grade.slopePct >= GRADE_MODERATE_PCT) score = clamp(score - 15);
    note = `${note} ${gradeNote(grade)}`;
  }
  return { score, note };
}

/** A steep DADU site caps the grade: Fair at best from 10%, Marginal from 20%. */
function gradeCap(grade?: GradeStats | null): number {
  if (!grade) return 100;
  if (grade.slopePct >= GRADE_VERY_STEEP_PCT) return GRADE_BANDS[2].min - 1;
  if (grade.slopePct >= GRADE_STEEP_PCT) return GRADE_BANDS[1].min - 1;
  return 100;
}

/**
 * Trees weigh heavily: Seattle's tree protection (SMC 25.11) can take a backyard off the table, a tree review adds time
 * and arborist cost, and a DADU has to stay out of protected root zones. Canopy above these levels also caps the grade.
 */
export const CANOPY_NO_TOP_PICK = 40;
export const CANOPY_FAIR_AT_BEST = 60;

function treeFactor(canopy: number | null): { score: number; note: string } {
  if (canopy == null) return { score: 60, note: "Tree canopy unknown. Check for large trees before planning." };
  const c = Math.round(canopy);
  if (c <= 10) return { score: 100, note: `Tree canopy ${c}%: open lot, little tree review expected.` };
  if (c <= 20) return { score: 85, note: `Tree canopy ${c}%: light. A tree may still need to be worked around.` };
  if (c <= 30) return { score: 65, note: `Tree canopy ${c}%: moderate. Tree protection may limit where the DADU goes.` };
  if (c <= CANOPY_NO_TOP_PICK) return { score: 45, note: `Tree canopy ${c}%: substantial. Expect an arborist report and limits on placement.` };
  if (c <= 50) return { score: 30, note: `Tree canopy ${c}%: heavy. Tree review is likely to shrink or move the footprint, so this lot cannot be a top pick.` };
  if (c <= CANOPY_FAIR_AT_BEST) return { score: 15, note: `Tree canopy ${c}%: very heavy. Protected trees may rule out the best spots; this lot cannot be a top pick.` };
  return { score: 0, note: `Tree canopy ${c}%: dense. Protected trees may rule out a DADU entirely, so this lot is Fair at best.` };
}

/** Clear spot under this (but at least the minimum) means a tight fit: Fair at best. */
export const TIGHT_CLEAR_SQFT = 600;
/** Medium or large trees on the lot at which the grade is capped (Fair at best, then Marginal) when open ground is short. */
export const TREES_FAIR_AT_BEST = 4;
export const TREES_MARGINAL = 6;
/** Open ground behind the house at which the tree count stops capping the grade: there is room to build around them. */
export const ROOMY_CLEAR_SQFT = 1000;

/** Measured trees: the open ground behind the house decides it, then how many medium and large trees there are. */
/** True when the house itself leaves no 15 by 20 ft spot, so open ground says nothing about the trees. */
const noRoomBeforeTrees = (t: TreeStats) => t.siteSqft != null && t.siteSqft < MIN_FOOTPRINT_SQFT;

function measuredTreeFactor(t: TreeStats): { score: number; note: string; cap: number } {
  const big = t.large + t.medium;
  const count = `${t.large} large and ${t.medium} medium tree${big === 1 ? "" : "s"} reach the lot; canopy covers ${t.canopyPct}%`;
  const where = t.site === "side" ? "past the front of the house" : "behind the house";
  if (noRoomBeforeTrees(t)) {
    // Not a tree finding: the house leaves no clear 15 by 20 ft rectangle. Score the trees on canopy and count, and keep
    // the lot out of the top grades until someone confirms where a DADU goes.
    const score = Math.max(0, (t.canopyPct <= 10 ? 100 : t.canopyPct <= 20 ? 85 : t.canopyPct <= 30 ? 65 : t.canopyPct <= 40 ? 45 : t.canopyPct <= 50 ? 30 : 15) - big * 5);
    return { score, cap: GRADE_BANDS[1].min - 1, note: `${count}. The house leaves no clear 15 by 20 ft spot for a DADU in the city outlines, so placement needs a site visit.` };
  }
  if (t.clearSqft < MIN_FOOTPRINT_SQFT)
    return { score: 5, cap: GRADE_BANDS[2].min - 1, note: `${count}. No open 15 by 20 ft spot ${where}: a DADU would mean removing medium trees, with tree review and replacement.` };
  let score = t.canopyPct <= 10 ? 100 : t.canopyPct <= 20 ? 85 : t.canopyPct <= 30 ? 65 : t.canopyPct <= 40 ? 45 : t.canopyPct <= 50 ? 30 : 15;
  score = Math.max(0, score - big * 5);
  let cap = 100;
  if (t.clearSqft < TIGHT_CLEAR_SQFT) { score = Math.min(score, 40); cap = GRADE_BANDS[1].min - 1; }
  if (t.clearSqft < ROOMY_CLEAR_SQFT) {
    if (big >= TREES_MARGINAL) cap = Math.min(cap, GRADE_BANDS[2].min - 1);
    else if (big >= TREES_FAIR_AT_BEST) cap = Math.min(cap, GRADE_BANDS[1].min - 1);
  }
  if (t.canopyPct > CANOPY_FAIR_AT_BEST) cap = Math.min(cap, GRADE_BANDS[1].min - 1);
  else if (t.canopyPct > CANOPY_NO_TOP_PICK) cap = Math.min(cap, GRADE_BANDS[0].min - 1);
  return { score, cap, note: `${count}. The largest open spot ${where} is about ${t.clearSqft.toLocaleString("en-US")} sf.` };
}

export function scoreSite(i: ScoreInput): SiteScore {
  const w = i.widthFt != null ? Math.round(i.widthFt) : null;
  const d = i.depthFt != null ? Math.round(i.depthFt) : null;
  const zone = (i.zoning ?? "").trim().toUpperCase();
  const zoneOk = /^(NR|SF)/.test(zone);

  const gates: Gate[] = [
    i.hoaMonthly == null
      ? { key: "hoa", label: "No HOA", status: "pass", note: "No HOA reported." }
      : i.hoaMonthly > 0
        ? { key: "hoa", label: "No HOA", status: "fail", note: `HOA of $${i.hoaMonthly} per month. A property with an HOA is never a DADU candidate.` }
        : { key: "hoa", label: "No HOA", status: "pass", note: "No HOA." },
    i.lotSqft >= MIN_LOT_SQFT
      ? { key: "area", label: "Lot area", status: "pass", note: `${i.lotSqft.toLocaleString("en-US")} sf meets the ${MIN_LOT_SQFT.toLocaleString("en-US")} sf minimum.` }
      : { key: "area", label: "Lot area", status: "fail", note: `${i.lotSqft.toLocaleString("en-US")} sf is under the ${MIN_LOT_SQFT.toLocaleString("en-US")} sf minimum.` },
    (i.existingAdus ?? 0) >= 2
      ? { key: "adus", label: "ADU slots", status: "fail", note: "The lot already has two ADUs, the maximum." }
      : { key: "adus", label: "ADU slots", status: i.existingAdus == null ? "unknown" : "pass", note: i.existingAdus == null ? "Existing ADU count unknown." : `${i.existingAdus} existing ADU${i.existingAdus === 1 ? "" : "s"}, under the cap of 2.` },
    (i.daduSqft ?? 0) >= MIN_DADU_SQFT
      ? { key: "dadu", label: "Room for a DADU", status: "pass", note: `A DADU of up to ${Math.round(i.daduSqft!).toLocaleString("en-US")} sf fits.` }
      : { key: "dadu", label: "Room for a DADU", status: "fail", note: `The rules leave room for less than ${MIN_DADU_SQFT} sf.` },
    zoneOk
      ? { key: "zoning", label: "Zoning", status: "pass", note: `${zone}: single-family residential, covered by the guide.` }
      : { key: "zoning", label: "Zoning", status: zone ? "unknown" : "unknown", note: zone ? `${zone} is outside the Neighborhood Residential rules in the guide.` : "Zoning unknown." },
  ];
  // Vehicle access to the rear (team rule, rag/documents/32): no alley, no corner, and the house blocks both sides.
  const side = i.sideClearanceFt;
  if (i.alley || i.corner) gates.splice(4, 0, { key: "access", label: "Vehicle access", status: "pass", note: i.alley ? "Alley access to the rear." : "Corner lot: second street frontage." });
  else if (side == null) gates.splice(4, 0, { key: "access", label: "Vehicle access", status: "unknown", note: "Side clearance not measured. Confirm a driveway fits beside the house." });
  else if (side < BLOCKED_BELOW_FT) gates.splice(4, 0, { key: "access", label: "Vehicle access", status: "fail", note: `No vehicle access to the rear: no alley, not a corner, and the house leaves only ${Math.round(side)} ft on its wider side. A driveway needs ${DRIVEWAY_FT} ft.` });
  else if (side < DRIVEWAY_FT) gates.splice(4, 0, { key: "access", label: "Vehicle access", status: "unknown", note: `The roofline leaves about ${Math.round(side)} ft beside the house. Confirm on site that a ${DRIVEWAY_FT} ft driveway fits below the eaves.` });
  else gates.splice(4, 0, { key: "access", label: "Vehicle access", status: "pass", note: `The house leaves ${Math.round(side)} ft on one side for a driveway.` });
  if (i.trees && !noRoomBeforeTrees(i.trees)) {
    gates.push(
      i.trees.clearSqftIfMediumRemoved < MIN_FOOTPRINT_SQFT
        ? { key: "trees", label: "Room clear of large trees", status: "fail", note: `Large trees (likely protected) leave no 15 by 20 ft spot behind the house, even if smaller trees came out.` }
        : { key: "trees", label: "Room clear of large trees", status: "pass", note: `A 15 by 20 ft spot behind the house stays clear of large trees.` }
    );
  }
  const eligible = !gates.some((g) => g.status === "fail");

  const plan = planSite({ lotSqft: i.lotSqft, widthFt: w, depthFt: d, alley: i.alley });
  const parts: Record<FactorKey, { score: number; note: string }> = {
    access: accessFactor(i, w),
    layout: layoutFactor(plan.layout.kind === "none" ? "single_rear" : plan.layout.kind, w, d, plan.warning != null),
    size: sizeFactor(i.daduSqft ?? 0),
    site: siteFactor(pct(i.steepPct), i.ecaFlags, i.grade),
    trees: i.trees ? measuredTreeFactor(i.trees) : treeFactor(pct(i.canopyPct)),
  };
  const factors: Factor[] = (Object.keys(WEIGHTS) as FactorKey[]).map((k) => ({ key: k, name: FACTOR_NAMES[k], weight: WEIGHTS[k], score: parts[k].score, note: parts[k].note }));
  const raw = factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0);
  // Access not measured: cannot be a top pick until someone confirms a driveway fits.
  const accessUnknown = !i.alley && !i.corner && (side == null || side < DRIVEWAY_FT);
  // Heavy canopy caps the grade: no top pick above 40%, Fair at best above 60%.
  // Unmeasured trees cannot make a top pick: the parcel canopy figure alone has missed whole yards of trees.
  const canopy = pct(i.canopyPct);
  const treeCap = i.trees
    ? measuredTreeFactor(i.trees).cap
    : canopy == null || canopy > CANOPY_FAIR_AT_BEST ? GRADE_BANDS[1].min - 1 : GRADE_BANDS[0].min - 1;
  const score = eligible ? Math.min(Math.round(clamp(raw)), accessUnknown ? GRADE_BANDS[0].min - 1 : 100, treeCap, gradeCap(i.grade)) : 0;
  const g = eligible ? gradeOf(score) : { tier: 0 as Tier, label: "Not eligible" };
  return { eligible, gates, factors, score, tier: g.tier, grade: g.label };
}

/** Critical-area flags from the ADUniverse fields, in plain words. */
export function ecaFlagsOf(f: { wetlandPercent?: number | null; wildlifePercent?: number | null; riparianPercent?: number | null; floodProne?: boolean | null; liquefaction?: boolean | null; knownSlide?: boolean | null; potentialSlide?: boolean | null; peat?: boolean | null; landfill?: boolean | null } | null | undefined): string[] {
  if (!f) return [];
  return [
    f.wetlandPercent ? "wetland" : null,
    f.wildlifePercent ? "wildlife habitat" : null,
    f.riparianPercent ? "riparian corridor" : null,
    f.floodProne ? "flood-prone" : null,
    f.knownSlide ? "known landslide" : null,
    f.potentialSlide ? "potential landslide" : null,
    f.peat ? "peat" : null,
    f.landfill ? "landfill" : null,
  ].filter((x): x is string => !!x);
}
