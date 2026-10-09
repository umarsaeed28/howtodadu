/**
 * Draft block layouts for a custom DADU footprint: where the rooms go before an architect draws the plan.
 * A draft is a set of rectangles per floor, in feet, with the origin at the footprint's top-left corner
 * (x across the width, y down the depth). Claude proposes one; validateLayout checks it; ruleLayout is the
 * deterministic fallback that always passes. This is a starting point for our architects, not a plan.
 */
export const BLOCK_KINDS = ["living", "kitchen", "bedroom", "bath", "stair", "mechanical", "hall"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export type Block = { kind: BlockKind; floor: 1 | 2; x: number; y: number; w: number; h: number; label?: string; egress?: boolean };
export type Footprint = { w: number; d: number; stories: 1 | 2 };

const EPS = 0.26;
const overlapArea = (a: Block, b: Block) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
/** Two blocks on the same floor share a wall when they touch along an edge at least 2 ft long. */
function shareWall(a: Block, b: Block): boolean {
  const xOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const touchX = Math.abs(a.x + a.w - b.x) < EPS || Math.abs(b.x + b.w - a.x) < EPS;
  const touchY = Math.abs(a.y + a.h - b.y) < EPS || Math.abs(b.y + b.h - a.y) < EPS;
  return (touchX && yOverlap >= 2) || (touchY && xOverlap >= 2);
}
const onExterior = (b: Block, f: Footprint) => b.x < EPS || b.y < EPS || Math.abs(b.x + b.w - f.w) < EPS || Math.abs(b.y + b.h - f.d) < EPS;

/** Every rule a draft must meet, as plain sentences. Empty when the draft is good. */
export function validateLayout(blocks: Block[], f: Footprint): string[] {
  const errs: string[] = [];
  if (!blocks.length) return ["The layout has no rooms."];
  for (const b of blocks) {
    if (!(BLOCK_KINDS as readonly string[]).includes(b.kind)) errs.push(`Unknown room type: ${b.kind}.`);
    if (b.floor !== 1 && b.floor !== 2) errs.push(`${b.kind} is on floor ${b.floor}.`);
    if (b.floor === 2 && f.stories === 1) errs.push(`${b.kind} is on a second floor, but the cottage has one story.`);
    if ([b.x, b.y, b.w, b.h].some((n) => !Number.isFinite(n))) errs.push(`${b.kind} has a bad size.`);
    if (b.w < 2.5 || b.h < 2.5) errs.push(`${b.kind} is too small (${b.w} x ${b.h} ft).`);
    if (b.x < -EPS || b.y < -EPS || b.x + b.w > f.w + EPS || b.y + b.h > f.d + EPS) errs.push(`${b.kind} on floor ${b.floor} sticks out of the ${f.w} x ${f.d} ft footprint.`);
  }
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.floor === b.floor && !(a.kind === "stair" && b.kind === "stair") && overlapArea(a, b) > 1) errs.push(`${a.kind} and ${b.kind} overlap on floor ${a.floor}.`);
    }
  const has = (k: BlockKind, floor?: 1 | 2) => blocks.some((b) => b.kind === k && (floor == null || b.floor === floor));
  for (const k of ["living", "kitchen", "bedroom", "bath", "mechanical"] as const) if (!has(k)) errs.push(`The layout needs a ${k === "mechanical" ? "mechanical closet" : k}.`);
  if (f.stories === 2) {
    const s1 = blocks.find((b) => b.kind === "stair" && b.floor === 1);
    const s2 = blocks.find((b) => b.kind === "stair" && b.floor === 2);
    if (!s1 || !s2) errs.push("A two-story cottage needs a stair on both floors.");
    else if (overlapArea(s1, s2) < 0.5 * s1.w * s1.h) errs.push("The stair must line up between floors.");
  }
  if (!blocks.some((b) => b.kind === "bedroom" && onExterior(b, f))) errs.push("At least one bedroom needs an exterior wall for an egress window.");
  // Wet wall: each bath shares a wall with the kitchen, or sits over or under it.
  const kitchens = blocks.filter((b) => b.kind === "kitchen");
  for (const bath of blocks.filter((b) => b.kind === "bath"))
    if (!kitchens.some((k) => (k.floor === bath.floor ? shareWall(k, bath) : overlapArea(k, bath) > 2))) errs.push("Keep the plumbing together: the bath should share a wall with the kitchen or stack over it.");
  return [...new Set(errs)];
}

/**
 * A deterministic layout that always passes validateLayout for footprints from 14 x 14 ft up.
 * One story: living and kitchen on the left, the bedroom and bath on the right; the kitchen backs onto the bath.
 * Two stories: stair and mechanical along one wall, living and kitchen below, bedroom and bath above the kitchen.
 */
export function ruleLayout(f: Footprint): Block[] {
  const W = f.w, D = f.d;
  const r = (n: number) => Math.round(n * 2) / 2;
  if (f.stories === 1) {
    // The bedroom column takes about 42% of the width, but leaves at least 7 ft for the kitchen and the mechanical closet.
    const cw = r(Math.min(Math.max(9, W * 0.42), W - 7));
    const left = W - cw;
    const wetD = r(Math.min(8, Math.max(6, D * 0.32)));
    const mechW = 3;
    const kitchenW = r(Math.max(4, left - mechW));
    return [
      { kind: "living", floor: 1, x: 0, y: 0, w: left, h: D - wetD, label: "Living" },
      { kind: "mechanical", floor: 1, x: 0, y: D - wetD, w: left - kitchenW, h: wetD, label: "Mech" },
      { kind: "kitchen", floor: 1, x: left - kitchenW, y: D - wetD, w: kitchenW, h: wetD, label: "Kitchen" },
      { kind: "bedroom", floor: 1, x: left, y: 0, w: cw, h: D - wetD, label: "Bedroom", egress: true },
      { kind: "bath", floor: 1, x: left, y: D - wetD, w: cw, h: wetD, label: "Bath" },
    ];
  }
  const sw = 4;
  const sd = r(Math.min(11, D * 0.5));
  const wetD = r(Math.min(8, Math.max(6, D * 0.32)));
  const bathW = r(Math.min(9, W - sw - 3));
  return [
    { kind: "stair", floor: 1, x: 0, y: 0, w: sw, h: sd, label: "Stair" },
    { kind: "mechanical", floor: 1, x: 0, y: sd, w: sw, h: D - sd, label: "Mech" },
    { kind: "living", floor: 1, x: sw, y: 0, w: W - sw, h: D - wetD, label: "Living" },
    { kind: "kitchen", floor: 1, x: sw, y: D - wetD, w: W - sw, h: wetD, label: "Kitchen" },
    { kind: "stair", floor: 2, x: 0, y: 0, w: sw, h: sd, label: "Stair" },
    { kind: "hall", floor: 2, x: 0, y: sd, w: sw, h: D - sd, label: "Hall" },
    { kind: "bedroom", floor: 2, x: sw, y: 0, w: W - sw, h: D - wetD, label: "Bedroom", egress: true },
    { kind: "bath", floor: 2, x: W - bathW, y: D - wetD, w: bathW, h: wetD, label: "Bath" },
    { kind: "hall", floor: 2, x: sw, y: D - wetD, w: W - sw - bathW, h: wetD, label: "Closet" },
  ].filter((b) => b.w >= 2.5 && b.h >= 2.5) as Block[];
}

/** The JSON schema Claude answers in (structured output). */
export const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...BLOCK_KINDS] },
          floor: { type: "integer", enum: [1, 2] },
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
          label: { type: "string" },
          egress: { type: "boolean" },
        },
        required: ["kind", "floor", "x", "y", "w", "h", "label", "egress"],
      },
    },
  },
  required: ["blocks"],
} as const;

export const DRAFT_SYSTEM = `You lay out backyard cottages (DADUs) in Seattle as simple room blocks, the first step before an architect draws the plan.
Work in feet. The footprint is a rectangle W wide (x from 0 to W) and D deep (y from 0 to D). Every block is an axis-aligned rectangle inside it.
Rules:
- Rooms: living, kitchen, at least one bedroom, a bath, a mechanical closet (water heater and panel, about 3 x 4 ft). Use "hall" for circulation or closets.
- No two blocks on the same floor may overlap. Fill the footprint without gaps where you can.
- A two-story cottage puts a stair (about 3.5 to 4 ft wide, 10 to 11 ft long) in the same place on floor 1 and floor 2. A one-story cottage uses floor 1 only.
- At least one bedroom touches an exterior wall (x = 0, y = 0, x + w = W or y + h = D) for an egress window; mark it egress true.
- Keep plumbing together: the bath shares a wall with the kitchen on the same floor, or stacks directly over it.
- Bedrooms at least 9 x 9 ft where the footprint allows; baths at least 5 x 7 ft.
Answer only with the blocks.`;
