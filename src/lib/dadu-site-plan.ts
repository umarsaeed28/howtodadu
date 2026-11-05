/**
 * Site-planning rules from the team's Seattle DADU guide (rag/documents/31 to 35), as code.
 * Deterministic on purpose: lot width, depth and alley decide the layout, access and marketability.
 * These are screening rules from the team guide, not Seattle Municipal Code. Numbers the guide does not give
 * (setbacks, coverage limits) are never invented here.
 */
export const MIN_LOT_SQFT = 3200;

export type Layout = "single_rear" | "side_by_side" | "staggered" | "none";
export type Rating = "High" | "Moderate" | "Low";

export interface SitePlanInput {
  lotSqft: number;
  /** Narrow side of the lot in feet, from the city's minimum bounding rectangle. */
  widthFt: number | null;
  depthFt: number | null;
  alley: boolean | null;
}

export interface SitePlan {
  area: { sqft: number; min: number; pass: boolean };
  dimensions: { widthFt: number | null; depthFt: number | null; known: boolean };
  alley: "yes" | "no" | "unknown";
  layout: { kind: Layout; label: string; why: string };
  /** A layout to avoid, when the lot's shape invites it. */
  warning: string | null;
  access: { vehicle: boolean | "tight"; summary: string };
  livability: { sunlight: string; vehicle: string; yard: string };
  marketability: { rating: Rating; why: string };
  height: string;
  nextSteps: string[];
  /** One line per finding, for the AI read to cite. */
  lines: string[];
}

const LABEL: Record<Layout, string> = { single_rear: "Single rear DADU", side_by_side: "Side by side", staggered: "Staggered front to back", none: "No layout" };

export function planSite(i: SitePlanInput): SitePlan {
  const pass = i.lotSqft >= MIN_LOT_SQFT;
  const w = i.widthFt, d = i.depthFt;
  const known = w != null && d != null;
  const alley = i.alley == null ? "unknown" : i.alley ? "yes" : "no";
  const deep = d != null && d >= 120;
  const wide45 = w != null && w >= 45;
  const wide50 = w != null && w >= 50;

  let kind: Layout = "single_rear";
  let why = "The standard split: the main house at the front, the DADU at the back, a fence between them.";
  let warning: string | null = null;
  if (!pass) {
    kind = "none";
    why = `The lot is under the ${MIN_LOT_SQFT.toLocaleString()} sq ft minimum, so a DADU is not allowed.`;
  } else if (!known) {
    why = "The lot's width and depth are not known, so the standard single rear DADU is the default to check.";
  } else if (wide50) {
    kind = "side_by_side";
    why = `At ${w} ft wide the lot can take the house and the DADU side by side, each with a street-facing door and mailbox. Buyers like it, and it resells better than a rear unit.`;
  } else if (deep && wide45) {
    kind = "staggered";
    why = `At ${w} ft by ${d} ft the lot is deep enough to offset the buildings front to back. That keeps a yard for each unit, lets in sunlight and keeps car access.`;
  } else if (wide45) {
    kind = "single_rear";
    why = `At ${w} ft wide a side driveway fits past the house, so a single rear DADU with its own car access works. Side by side is better on a lot 50 ft or wider.`;
  } else if (deep) {
    kind = "staggered";
    why = `A ${w} ft by ${d} ft lot cannot fit units side by side. A staggered front-to-back layout is the way to fit more than one unit.`;
    warning = "Do not stack units in a straight line behind the house. The interior units end up dark and cramped, with no yard, and they are hard to sell.";
  } else {
    why = `A ${w} ft wide lot, ${d} ft deep, is the common Seattle lot that suits one DADU behind the house.`;
  }

  let vehicle: boolean | "tight";
  let accessText: string;
  if (alley === "yes") {
    vehicle = true;
    accessText = "Alley access. People and cars reach the DADU from the alley, so no lot width is spent on a driveway.";
  } else if (wide45) {
    vehicle = true;
    accessText = `No alley, so a driveway comes from the front street. At ${w} ft wide, a side driveway past the house is workable. Confirm the clearance beside the house.`;
  } else if (w != null && w >= 40) {
    vehicle = "tight";
    accessText = `No alley, so a driveway comes from the front street. On a ${w} ft wide lot, fitting a side driveway past the house is very tight. The house must leave enough clearance on one side.`;
  } else if (alley === "unknown") {
    vehicle = "tight";
    accessText = "Alley access is not known. Check it first: without an alley, car access must come from the front street.";
  } else {
    vehicle = false;
    accessText = "No alley and too narrow for a side driveway, so the DADU would likely be walk-in only.";
  }

  const stackedRisk = warning != null;
  const rating: Rating = !pass ? "Low" : vehicle === false ? "Low" : vehicle === "tight" ? "Moderate" : kind === "side_by_side" || alley === "yes" ? "High" : "Moderate";
  const marketWhy =
    vehicle === false ? "A rear unit reached only on foot is legal but tends to sell poorly in Seattle."
    : vehicle === "tight" ? "Car access is possible but tight. Units with their own vehicle or garage access sell and rent for noticeably more."
    : kind === "side_by_side" ? "Side by side with car access is the strongest layout for resale."
    : "The unit has car access, which sells and rents better.";

  const plan: SitePlan = {
    area: { sqft: i.lotSqft, min: MIN_LOT_SQFT, pass },
    dimensions: { widthFt: w, depthFt: d, known },
    alley,
    layout: { kind, label: LABEL[kind], why },
    warning,
    access: { vehicle, summary: accessText },
    livability: {
      sunlight: kind === "staggered" ? "Offsetting the buildings lets sunlight reach both units. Keep them out of a straight line." : kind === "side_by_side" ? "Both units face the street or alley, so each gets light and a clear front." : "A rear unit gets its light from its own yard. Keep the main house from shading it.",
      vehicle: vehicle === true ? "Car access: alley or side driveway." : vehicle === "tight" ? "Car access is tight and needs a clearance check." : "Walk-in access only.",
      yard: pass ? (kind === "side_by_side" ? "Each unit keeps a street-facing front and its own space, but the lot is split in width." : kind === "staggered" ? "Staggering preserves a yard for each unit." : "One shared back area is split by a fence between the house and the DADU.") : "Not applicable.",
    },
    marketability: { rating, why: marketWhy },
    height: "The team guide says a DADU can be built up to 3 stories. That figure is not verified against the current code. More height packs in floor area but costs yard space, privacy and light.",
    nextSteps: [
      "Verify the exact side setbacks and where the main house sits, so you know the driveway clearance.",
      "Confirm how sewer, water and electric connect to the back of the lot.",
      "Talk to an architect or builder who specializes in Seattle DADUs.",
    ],
    lines: [],
  };
  plan.lines = [
    `Area check: ${i.lotSqft.toLocaleString("en-US")} sq ft against the ${MIN_LOT_SQFT.toLocaleString("en-US")} sq ft minimum: ${pass ? "pass" : "fail"}.`,
    `Lot shape: ${known ? `${w} ft wide by ${d} ft deep` : "width and depth unknown"}. Alley: ${alley}.`,
    `Best layout by the team guide: ${plan.layout.label}. ${why}`,
    `Access: ${accessText}`,
    `Marketability by the team guide: ${rating}. ${marketWhy}`,
    ...(warning ? [warning] : []),
  ];
  return plan;
}
