import { describe, expect, it } from "vitest";
import { runAssessment } from "../orchestrator";
import { enforceVerdict, numbersIn, validateAdjustments, validateFindings } from "../validate";
import { FACTOR_NAMES, scoreSite } from "@/lib/dadu-score";
import { ANALYZE_SCHEMA } from "../prompts";
import type { Analysis, Llm, Passage } from "../types";
import type { RawListing } from "@/lib/listings";
import type { Candidate } from "@/lib/server/candidates";

const listing: RawListing = {
  mlsId: "t", address: "5817 56th Ave NE, Seattle, WA 98105", city: "Seattle", zip: "98105", lat: 47.67, lng: -122.27,
  listPrice: 875000, lotSqft: 6800, status: "active", photos: [], hoaMonthly: 0, updatedAt: "2026-10-01T00:00:00Z",
};
const lot = { pin: "1", address: "x", zip: "98105", lat: 0, lng: 0, score: 90, zoning: "NR", lotSqft: 6800, lotType: "corner", alley: false, canopyPct: 0.63, steepPct: null, adusNearby: 14, corner: true, topPick: false, tier: 2, daduSqft: 895 } as Candidate;
const passages: Passage[] = [{ label: "P1", id: "c1", docId: "30-dadu-screening-rules", section: "No HOA", text: "A property with an HOA is never a DADU candidate.", distance: 0.2 }];

const analysis = (over: Partial<Analysis>): Analysis => ({
  reasoning: "r", verdict: "candidate", headline: "Strong candidate.",
  findings: [{ claim: "There is no HOA, so the rule does not exclude it.", cites: ["F4", "P1"] }, { claim: "A DADU of up to 895 sf fits.", cites: ["F6"] }],
  confirm: [], ...over,
});
function stub(a: Analysis, calls: string[] = []): Llm {
  return {
    async text() { calls.push("text"); return "A property with no homeowners association can be a DADU candidate under the screening rules."; },
    async json<T>() { calls.push("json"); return a as T; },
  };
}
const search = async () => passages;

describe("validation (deterministic)", () => {
  it("normalises numbers", () => expect(numbersIn("$1,000 and 895.0 sf")).toEqual(["1000", "895"]));
  it("drops findings with no or unknown citations", () => {
    const r = validateFindings([{ claim: "No cite", cites: [] }, { claim: "Bad cite", cites: ["P9"] }], passages, []);
    expect(r.kept).toHaveLength(0);
    expect(r.dropped.map((d) => d.reason)).toEqual(["no citation", "unknown citation P9"]);
  });
  it("drops a claim whose number is not in the cited source", () => {
    const r = validateFindings([{ claim: "The DADU can be 1,200 sf.", cites: ["F1"] }], [], [{ label: "F1", text: "Largest DADU: 895 sf", source: "city GIS" }]);
    expect(r.kept).toHaveLength(0);
  });
  it("keeps a claim whose numbers are in the source", () => {
    const r = validateFindings([{ claim: "The DADU can be 895 sf.", cites: ["F1"] }], [], [{ label: "F1", text: "Largest DADU: 895 sf", source: "city GIS" }]);
    expect(r.kept).toHaveLength(1);
  });
  it("never publishes candidate without a lot or without findings; no HOA reported does not hold it back", () => {
    const a = analysis({});
    expect(enforceVerdict(a, { hasLot: false, keptFindings: 2 }).verdict).toBe("unverified");
    expect(enforceVerdict(a, { hasLot: true, keptFindings: 2 }).verdict).toBe("candidate");
    expect(enforceVerdict(a, { hasLot: true, keptFindings: 0 }).verdict).toBe("unverified");
  });
});

describe("score adjustments (deterministic)", () => {
  const facts = [
    { label: "F1", text: "Listing says: shared side driveway of 12 ft to a detached garage", source: "listing feed" },
    { label: "F2", text: "Vehicle access: 45 out of 100, weight 30", source: "Site score rules" },
  ];
  const names = Object.values(FACTOR_NAMES);
  it("keeps a cited adjustment and applies it", () => {
    const v = validateAdjustments([{ factor: "Vehicle access", delta: 6, reason: "The listing describes a 12 ft side driveway.", cites: ["F1"] }], passages, facts, names, 70);
    expect(v.kept).toHaveLength(1);
    expect(v.score).toBe(76);
  });
  it("rejects uncited, unknown-factor and invented-number adjustments", () => {
    const v = validateAdjustments(
      [
        { factor: "Vehicle access", delta: 5, reason: "Feels better.", cites: [] },
        { factor: "Vibes", delta: 5, reason: "Nice street.", cites: ["F1"] },
        { factor: "Vehicle access", delta: 5, reason: "The driveway is 20 ft wide.", cites: ["F1"] },
      ],
      passages, facts, names, 70
    );
    expect(v.kept).toHaveLength(0);
    expect(v.rejected.map((r) => r.reason)).toEqual(["no citation", "unknown factor", "number 20 is not in the cited sources"]);
    expect(v.score).toBe(70);
  });
  it("caps the total change at 15 points and keeps the score in 0 to 100", () => {
    const up = validateAdjustments([{ factor: "Vehicle access", delta: 40, reason: "Driveway.", cites: ["F1"] }, { factor: "Layout fit", delta: 12, reason: "Driveway.", cites: ["F1"] }], passages, facts, names, 90);
    expect(up.score).toBe(100);
    const down = validateAdjustments([{ factor: "Tree canopy", delta: -30, reason: "Driveway.", cites: ["F1"] }], passages, facts, names, 50);
    expect(down.score).toBe(35);
  });
  it("numbers must match whole: 8 is not in 895", () => {
    const r = validateFindings([{ claim: "The DADU can be 8 sf.", cites: ["F1"] }], [], [{ label: "F1", text: "Largest DADU: 895 sf", source: "city GIS" }]);
    expect(r.kept).toHaveLength(0);
  });
  it("the prompt's factor list matches the score's factor names", () => {
    const e = (ANALYZE_SCHEMA.properties.adjustments.items.properties.factor as { enum: readonly string[] }).enum;
    expect([...e].sort()).toEqual(names.sort());
  });
});

describe("assessment chain", () => {
  it("runs gate, facts, hyde, retrieve, analyze, validate in order and cites real sources", async () => {
    const a = await runAssessment(listing, lot, { llm: stub(analysis({})), search });
    expect(a.trace.map((t) => t.node)).toEqual(["gate", "facts", "extract", "hyde", "retrieve", "analyze", "validate", "decide score"]);
    expect(a.verdict).toBe("candidate");
    expect(a.findings).toHaveLength(2);
    expect(a.citations.map((c) => c.label).sort()).toEqual(["F4", "F6", "P1"]);
  });
  it("Claude's cited adjustment moves the score, and the grade follows the final score", async () => {
    const site = scoreSite({ lotSqft: 6800, widthFt: 40, depthFt: 125, alley: false, corner: false, daduSqft: 895, steepPct: 0, canopyPct: 20, ecaFlags: [], existingAdus: 0, sideClearanceFt: 11, zoning: "NR", hoaMonthly: 0 });
    const a = await runAssessment(listing, lot, { llm: stub(analysis({ adjustments: [{ factor: "Vehicle access", delta: 8, reason: "There is no HOA.", cites: ["F4"] }] })), search }, { site });
    expect(a.score!.baselineScore).toBe(site.score);
    expect(a.score!.score).toBe(site.score + 8);
    expect(a.score!.decidedBy).toBe("ai");
  });
  it("a lot that fails a gate never reaches the model", async () => {
    const calls: string[] = [];
    const site = scoreSite({ lotSqft: 8280, widthFt: 60, depthFt: 140, alley: false, corner: false, daduSqft: 1000, steepPct: 0, canopyPct: 52, ecaFlags: [], existingAdus: 0, sideClearanceFt: 6, zoning: "NR", hoaMonthly: 0 });
    const a = await runAssessment(listing, lot, { llm: stub(analysis({}), calls), search }, { site });
    expect(a.verdict).toBe("excluded");
    expect(a.headline).toMatch(/No vehicle access/);
    expect(calls).toEqual([]);
  });
  it("makes no model call when an HOA excludes the property", async () => {
    const calls: string[] = [];
    const a = await runAssessment({ ...listing, hoaMonthly: 200 }, lot, { llm: stub(analysis({}), calls), search });
    expect(a.verdict).toBe("excluded");
    expect(calls).toEqual([]);
  });
  it("strips a fabricated number and says the data is unavailable", async () => {
    const bad = analysis({ findings: [{ claim: "A DADU of up to 1,400 sf fits.", cites: ["F6"] }, { claim: "There is no HOA.", cites: ["F4"] }] });
    const a = await runAssessment(listing, lot, { llm: stub(bad), search });
    expect(a.findings.map((f) => f.claim)).toEqual(["There is no HOA."]);
    expect(a.unavailable).toEqual(["A DADU of up to 1,400 sf fits."]);
  });
  it("falls back to plain search when HyDE fails, and still answers", async () => {
    const llm: Llm = { async text() { throw new Error("overloaded"); }, async json<T>() { return analysis({}) as T; } };
    const a = await runAssessment(listing, lot, { llm, search });
    expect(a.trace.find((t) => t.node === "hyde")?.ok).toBe(false);
    expect(a.verdict).toBe("candidate");
  });
  it("answers 'Data unavailable' without calling the analysis model when retrieval is empty", async () => {
    const calls: string[] = [];
    const a = await runAssessment(listing, lot, { llm: stub(analysis({}), calls), search: async () => [] });
    expect(a.headline).toMatch(/Data unavailable in retrieved sources/);
    expect(calls).not.toContain("json");
  });
  it("a listing with no HOA reported stays a candidate, and its HOA fact says none reported", async () => {
    const a = await runAssessment({ ...listing, hoaMonthly: undefined }, lot, { llm: stub(analysis({})), search });
    expect(a.verdict).toBe("candidate");
    expect(a.confirm.join(" ")).not.toMatch(/HOA/);
    expect(a.headline).toBe("Strong candidate.");
  });
  it("when the checks change the verdict, the headline changes with it (no 'strong candidate' under a 'needs confirming' badge)", async () => {
    const a = await runAssessment(listing, null, { llm: stub(analysis({ headline: "This is a strong DADU candidate." })), search });
    expect(a.verdict).toBe("unverified");
    expect(a.headline).not.toMatch(/strong/i);
    expect(a.headline).toMatch(/needs confirming/);
  });
});
