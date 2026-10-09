import { describe, expect, it } from "vitest";
import { caseStudy, caseStudyTotals } from "./case-studies";

describe("5519 12th Ave NE", () => {
  it("adds up the deal and the room rents from the owner's figures", () => {
    const t = caseStudyTotals(caseStudy("5519-12th-ave-ne")!);
    expect(t).toMatchObject({ invested: 1_225_000, arv: 2_000_000, equity: 775_000, returnOnCostPct: 63 });
    expect(t).toMatchObject({ rooms: 12, monthlyRent: 15_600, annualRent: 187_200, grossYieldPct: 15.3, yieldOnValuePct: 9.4, paybackYears: 6.5 });
  });
});
