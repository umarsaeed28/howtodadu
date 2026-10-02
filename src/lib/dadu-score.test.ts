import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRADE_BANDS, WEIGHTS, FACTOR_NAMES, gradeOf, scoreSite, type ScoreInput } from "./dadu-score";

const base: ScoreInput = {
  lotSqft: 5000,
  widthFt: 40,
  depthFt: 125,
  alley: false,
  corner: false,
  daduSqft: 800,
  steepPct: 0,
  canopyPct: 0.1,
  ecaFlags: [],
  existingAdus: 0,
  zoning: "NR3",
  hoaMonthly: 0,
};
const f = (s: ReturnType<typeof scoreSite>, k: keyof typeof WEIGHTS) => s.factors.find((x) => x.key === k)!.score;

describe("gates", () => {
  it("an HOA fails the lot and zeroes the score", () => {
    const s = scoreSite({ ...base, hoaMonthly: 20 });
    expect(s.eligible).toBe(false);
    expect(s.score).toBe(0);
    expect(s.grade).toBe("Not eligible");
  });
  it("a lot under 3,200 sf fails", () => expect(scoreSite({ ...base, lotSqft: 3120 }).eligible).toBe(false));
  it("two existing ADUs fail", () => expect(scoreSite({ ...base, existingAdus: 2 }).eligible).toBe(false));
  it("room for under 300 sf fails", () => expect(scoreSite({ ...base, daduSqft: 250 }).eligible).toBe(false));
  it("no HOA reported counts as no HOA (single-family listings)", () => {
    const s = scoreSite({ ...base, hoaMonthly: null });
    expect(s.eligible).toBe(true);
    expect(s.gates.find((g) => g.key === "hoa")!.status).toBe("pass");
    expect(s.gates.find((g) => g.key === "hoa")!.note).toBe("No HOA reported.");
  });
  it("zoning outside NR/SF is unknown, not a fail", () => {
    const s = scoreSite({ ...base, zoning: "LR2" });
    expect(s.eligible).toBe(true);
    expect(s.gates.find((g) => g.key === "zoning")!.status).toBe("unknown");
  });
});

describe("factors follow the team guide", () => {
  it("alley beats corner beats a wide side driveway beats a tight one beats walk-in only", () => {
    const a = [
      scoreSite({ ...base, alley: true }),
      scoreSite({ ...base, corner: true }),
      scoreSite({ ...base, widthFt: 46 }),
      scoreSite({ ...base, widthFt: 40 }),
      scoreSite({ ...base, widthFt: 33 }),
    ].map((s) => f(s, "access"));
    expect(a).toEqual([100, 90, 75, 45, 15]);
  });
  it("layout: side by side at 50 ft, staggered when deep and wide, stack risk when deep and narrow", () => {
    expect(f(scoreSite({ ...base, widthFt: 50, depthFt: 100 }), "layout")).toBe(100);
    expect(f(scoreSite({ ...base, widthFt: 46, depthFt: 125 }), "layout")).toBe(90);
    expect(f(scoreSite({ ...base, widthFt: 46, depthFt: 100 }), "layout")).toBe(80);
    expect(f(scoreSite({ ...base, widthFt: 40, depthFt: 100 }), "layout")).toBe(70);
    expect(f(scoreSite({ ...base, widthFt: 40, depthFt: 125 }), "layout")).toBe(55);
    expect(f(scoreSite({ ...base, widthFt: null, depthFt: null }), "layout")).toBe(60);
  });
  it("DADU size scales from 300 sf to 1,000 sf", () => {
    expect(f(scoreSite({ ...base, daduSqft: 300 }), "size")).toBe(30);
    expect(f(scoreSite({ ...base, daduSqft: 1000 }), "size")).toBe(100);
    expect(f(scoreSite({ ...base, daduSqft: 650 }), "size")).toBe(65);
  });
  it("each critical-area flag costs 20 points", () => {
    expect(f(scoreSite(base), "site")).toBe(100);
    expect(f(scoreSite({ ...base, ecaFlags: ["peat"] }), "site")).toBe(70);
    expect(f(scoreSite({ ...base, steepPct: 0.3, ecaFlags: ["peat", "flood-prone"] }), "site")).toBe(0);
  });
  it("tree canopy bands", () => {
    expect(f(scoreSite({ ...base, canopyPct: 8 }), "trees")).toBe(100);
    expect(f(scoreSite({ ...base, canopyPct: 20 }), "trees")).toBe(85);
    expect(f(scoreSite({ ...base, canopyPct: 30 }), "trees")).toBe(65);
    expect(f(scoreSite({ ...base, canopyPct: 40 }), "trees")).toBe(45);
    expect(f(scoreSite({ ...base, canopyPct: 50 }), "trees")).toBe(30);
    expect(f(scoreSite({ ...base, canopyPct: 0.6 }), "trees")).toBe(15);
    expect(f(scoreSite({ ...base, canopyPct: 0.7 }), "trees")).toBe(0);
  });
  it("heavy canopy caps the grade", () => {
    const best = { ...base, alley: true, widthFt: 60, depthFt: 140, daduSqft: 1000, steepPct: 0 };
    expect(scoreSite({ ...best, canopyPct: 5 }).grade).toBe("Top pick");
    expect(scoreSite({ ...best, canopyPct: 45 }).score).toBeLessThanOrEqual(92);
    expect(scoreSite({ ...best, canopyPct: 65 }).score).toBeLessThanOrEqual(81);
    expect(scoreSite({ ...best, canopyPct: 45 }).score).toBeLessThan(scoreSite({ ...best, canopyPct: 15 }).score - 10);
  });
  it("2722 NE Blakeley St (40 x 139 ft, no alley, 880 sf DADU, flat) lands in the high 60s, not 84", () => {
    const s = scoreSite({ ...base, widthFt: 40, depthFt: 139, daduSqft: 880, canopyPct: 0.2 });
    expect(s.score).toBeGreaterThanOrEqual(66);
    expect(s.score).toBeLessThanOrEqual(70);
  });
  it("a wide alley lot with a full-size DADU is a top pick", () => {
    const s = scoreSite({ ...base, alley: true, widthFt: 50, depthFt: 120, daduSqft: 1000 });
    expect(s.score).toBe(100);
    expect(s.grade).toBe("Top pick");
  });
});

describe("measured side access (building outlines)", () => {
  it("12042 14th Ave NE: 60 ft wide but the house leaves 6 ft each side, so it fails the access gate", () => {
    const s = scoreSite({ ...base, lotSqft: 8280, widthFt: 60, depthFt: 140, daduSqft: 1000, canopyPct: 52, sideClearanceFt: 6 });
    expect(s.eligible).toBe(false);
    expect(s.gates.find((g) => g.key === "access")!.status).toBe("fail");
    expect(s.score).toBe(0);
  });
  it("a measured 16 ft side yard is a workable driveway", () => {
    const s = scoreSite({ ...base, widthFt: 50, sideClearanceFt: 16 });
    expect(s.eligible).toBe(true);
    expect(s.factors.find((f) => f.key === "access")!.score).toBe(75);
  });
  it("10 to 12 ft is tight", () => expect(scoreSite({ ...base, sideClearanceFt: 11 }).factors.find((f) => f.key === "access")!.score).toBe(45));
  it("8 to 10 ft at the roofline is kept but must be confirmed, and cannot be a top pick (6043 Princeton Ave NE, 8.7 ft)", () => {
    const s = scoreSite({ ...base, alley: false, widthFt: 55, depthFt: 110, daduSqft: 1000, canopyPct: 0, sideClearanceFt: 8.7 });
    expect(s.eligible).toBe(true);
    expect(s.gates.find((g) => g.key === "access")!.status).toBe("unknown");
    expect(s.factors.find((f) => f.key === "access")!.score).toBe(30);
    expect(s.score).toBeLessThan(93);
  });
  it("under 8 ft is excluded (3010 12th Ave W, 7.6 ft)", () => expect(scoreSite({ ...base, sideClearanceFt: 7.6 }).eligible).toBe(false));
  it("alley and corner lots pass whatever the side clearance", () => {
    expect(scoreSite({ ...base, alley: true, sideClearanceFt: 2 }).eligible).toBe(true);
    expect(scoreSite({ ...base, corner: true, sideClearanceFt: 2 }).eligible).toBe(true);
  });
  it("unmeasured access cannot be a top pick", () => {
    const s = scoreSite({ ...base, widthFt: 60, depthFt: 140, daduSqft: 1000, canopyPct: 0, sideClearanceFt: null });
    expect(s.score).toBeLessThan(93);
    expect(s.gates.find((g) => g.key === "access")!.status).toBe("unknown");
  });
});

describe("grades and weights", () => {
  it("weights sum to 100", () => expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100));
  it("bands", () => {
    expect(gradeOf(93).label).toBe("Top pick");
    expect(gradeOf(92).label).toBe("Good");
    expect(gradeOf(82).label).toBe("Good");
    expect(gradeOf(81).label).toBe("Fair");
    expect(gradeOf(70).label).toBe("Fair");
    expect(gradeOf(69).label).toBe("Marginal");
  });
  it("rag/documents/36-site-score.md states the same weights and bands as the code", () => {
    const doc = readFileSync("rag/documents/36-site-score.md", "utf8");
    for (const [k, w] of Object.entries(WEIGHTS)) expect(doc).toContain(`${FACTOR_NAMES[k as keyof typeof WEIGHTS]}, weight ${w}.`);
    for (const g of GRADE_BANDS) expect(doc).toContain(g.min === 0 ? `${g.label}: under ${GRADE_BANDS[2].min}` : `${g.label}: ${g.min}`);
  });
});
