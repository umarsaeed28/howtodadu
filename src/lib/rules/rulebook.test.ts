import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADU, NR, PENCIL, RULEBOOK, meetsLotScreen, nrFarFor, type Rule } from "./seattle-adu";
import { renderRulebookDoc } from "./render";
import { nrMaxFloorArea } from "@/lib/feasibility/far";
import { DADU_MAX_GROSS_SQFT, DADU_MAX_GROSS_SQFT_3BR, NR_MAX_LOT_COVERAGE, generateADUReport } from "@/lib/adu-analysis";
import { BUY_BOX, inBuyBox } from "@/lib/buy-box";
import { scoreSite } from "@/lib/dadu-score";
import { lotFeasibility } from "@/lib/feasibility/lot-feasibility";

const DOCS = "rag/documents";
const doc = (id: string) => readFileSync(`${DOCS}/${id}.md`, "utf8");
const allRules = Object.values(RULEBOOK).flatMap((group) => Object.entries(group).map(([k, r]) => [k, r as Rule<unknown>] as const));

describe("rulebook and knowledge base agree", () => {
  for (const [key, r] of allRules) {
    for (const [id, phrases] of Object.entries(r.docs ?? {})) {
      it(`${key}: ${id} states it`, () => {
        const text = doc(id);
        for (const p of phrases) expect(text, `"${p}" missing from ${id}.md`).toContain(p);
      });
    }
  }

  it("the generated rulebook document is up to date (run npm run kb:rulebook)", () => {
    expect(doc("22-pencil-rulebook")).toBe(renderRulebookDoc());
  });

  it("no document presents the repealed 3,200 sq ft table as a current minimum", () => {
    for (const f of readdirSync(DOCS).filter((n) => n.endsWith(".md"))) {
      const text = readFileSync(`${DOCS}/${f}`, "utf8");
      expect(text, f).not.toMatch(/(at least|needs?|minimum of) 3,200 sq ?ft/i);
      expect(text, f).not.toMatch(/under (the )?3,200 sq ?ft minimum/i);
    }
  });

  it("every code rule names its section and every Pencil rule is labeled as Pencil's", () => {
    for (const [key, r] of allRules) {
      if (r.kind === "code") expect(r.citation, key).toBeTruthy();
      if (r.kind === "pencil") expect(r.citation, key).toBeUndefined();
    }
  });
});

describe("the engine uses the rulebook", () => {
  it("reads its constants from it", () => {
    expect(DADU_MAX_GROSS_SQFT).toBe(ADU.maxGrossSqft.value);
    expect(DADU_MAX_GROSS_SQFT_3BR).toBe(ADU.maxGrossSqft3br.value);
    expect(NR_MAX_LOT_COVERAGE).toBe(NR.maxLotCoverage.value);
    expect(BUY_BOX.minLotSqft).toBe(PENCIL.minLotSqft.value);
  });

  it("applies the FAR table at its edges", () => {
    expect(nrFarFor(8000, 2)).toBe(0.8); // 4,000 per unit
    expect(nrFarFor(8002, 2)).toBe(0.6);
    expect(nrFarFor(6600, 3)).toBe(1.0); // 2,200 per unit
    expect(nrFarFor(4800, 3)).toBe(1.6); // 1,600 per unit
    expect(nrMaxFloorArea(3000, 1)).toBe(2500); // FAR 0.8 = 2,400, small-lot floor wins
  });
});

describe("Pencil's 3,800 sq ft lot screen holds everywhere", () => {
  it("is a hard screen", () => {
    expect(PENCIL.minLotSqft.value).toBe(3800);
    expect(meetsLotScreen(3799)).toBe(false);
    expect(meetsLotScreen(3800)).toBe(true);
    expect(meetsLotScreen(null)).toBe(false);
  });

  it("keeps a 3,700 sq ft lot out of the buy box, the site score and the playbook", () => {
    expect(inBuyBox({ zoning: "NR3", lotSqft: 3700, coveragePct: 10, existingAdus: 0, score: 90 })).toBe(false);
    const site = scoreSite({ lotSqft: 3700, widthFt: 40, depthFt: 92, alley: true, corner: false, daduSqft: 800, steepPct: 0, canopyPct: 0, ecaFlags: [], existingAdus: 0, zoning: "NR3", hoaMonthly: null });
    expect(site.eligible).toBe(false);
    expect(site.gates.find((g) => g.key === "area")?.note).toContain("3,800");
    const out = lotFeasibility({ lotSqft: 3700, existingFootprintSqft: 900, existingChargeableSqft: 900, existingAdus: 0 });
    expect(out.playbook_options.every((o) => !o.feasible && o.design_bottleneck_notes.includes("3,800"))).toBe(true);
  });

  it("fails the report's lot size check and gives no DADU size", () => {
    const r = generateADUReport({ lotSqft: 3700, zoning: "NR3" } as Parameters<typeof generateADUReport>[0], null);
    expect(r.checks.find((c) => c.label === "Lot Size")?.status).toBe("fail");
    expect(r.daduFootprint).toBeNull();
  });
});
