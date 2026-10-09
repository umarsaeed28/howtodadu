import { describe, expect, it } from "vitest";
import { ruleLayout, validateLayout, type Block } from "./layout";

const PRESETS = [
  { w: 16, d: 20 },
  { w: 20, d: 25 },
  { w: 24, d: 24 },
  { w: 14, d: 14 },
  { w: 34, d: 16 },
];

describe("rule layout", () => {
  for (const p of PRESETS)
    for (const stories of [1, 2] as const)
      it(`passes every rule at ${p.w} x ${p.d}, ${stories} ${stories === 1 ? "story" : "stories"}`, () => {
        const f = { ...p, stories };
        expect(validateLayout(ruleLayout(f), f)).toEqual([]);
      });
});

describe("validateLayout", () => {
  const f = { w: 20, d: 25, stories: 1 as const };
  const good = ruleLayout(f);

  it("catches rooms outside the footprint and overlaps", () => {
    const out: Block[] = good.map((b) => (b.kind === "living" ? { ...b, x: -3 } : b));
    expect(validateLayout(out, f).some((e) => e.includes("sticks out"))).toBe(true);
    const overlap: Block[] = [...good, { kind: "hall", floor: 1, x: 1, y: 1, w: 6, h: 6 }];
    expect(validateLayout(overlap, f).some((e) => e.includes("overlap"))).toBe(true);
  });

  it("needs a stair on both floors of a two-story DADU", () => {
    const two = { ...f, stories: 2 as const };
    const noStair = ruleLayout(two).filter((b) => b.kind !== "stair");
    expect(validateLayout(noStair, two)).toContain("A two-story DADU needs a stair on both floors.");
  });

  it("needs an exterior bedroom and a shared wet wall", () => {
    const inner: Block[] = [
      { kind: "living", floor: 1, x: 0, y: 0, w: 20, h: 5 },
      { kind: "bedroom", floor: 1, x: 5, y: 8, w: 9, h: 9 },
      { kind: "kitchen", floor: 1, x: 0, y: 20, w: 6, h: 5 },
      { kind: "bath", floor: 1, x: 14, y: 20, w: 6, h: 5 },
      { kind: "mechanical", floor: 1, x: 0, y: 5, w: 3, h: 4 },
    ];
    const errs = validateLayout(inner, f);
    expect(errs).toContain("At least one bedroom needs an exterior wall for an egress window.");
    expect(errs.some((e) => e.startsWith("Keep the plumbing together"))).toBe(true);
  });

  it("rejects a second floor on a one-story DADU and missing rooms", () => {
    const errs = validateLayout([{ kind: "living", floor: 2, x: 0, y: 0, w: 10, h: 10 }], f);
    expect(errs.some((e) => e.includes("one story"))).toBe(true);
    expect(errs).toContain("The layout needs a bedroom.");
  });
});
