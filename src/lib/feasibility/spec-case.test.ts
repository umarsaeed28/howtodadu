import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nrMaxFloorArea } from "./far";
import { DADU_MAX_GROSS_SQFT, maxLotCoverageSqft } from "@/lib/adu-analysis";

/**
 * The validation case from the team's feasibility engine spec (v2.5): a 4,000 sq ft NR3 lot, a house with a 700 sq ft
 * footprint and 1,400 sq ft above grade, and one detached building with two DADUs. The knowledge base explains this
 * case with numbers (rag/documents/21-dadu-lot-feasibility-math.md); if the engine's rules change, this fails and the
 * document must be updated with them.
 */
describe("feasibility spec validation case", () => {
  const lot = 4000, footprint = 700, aboveGrade = 1400, units = 3;

  it("matches the engine", () => {
    expect(maxLotCoverageSqft(lot) - footprint).toBe(1300);
    expect(nrMaxFloorArea(lot, units)).toBe(6400);
    expect(nrMaxFloorArea(lot, units) - aboveGrade).toBe(5000);
    expect(2 * DADU_MAX_GROSS_SQFT).toBe(2000);
  });

  it("is what the knowledge base says", () => {
    const doc = readFileSync("rag/documents/21-dadu-lot-feasibility-math.md", "utf8");
    for (const s of ["2,000 sq ft of building coverage", "Left: 1,300 sq ft of footprint", "FAR 1.6 and 6,400 sq ft maximum", "Left: 5,000 sq ft"]) {
      expect(doc).toContain(s);
    }
  });
});
