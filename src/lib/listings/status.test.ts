import { describe, expect, it } from "vitest";
import { isForSale } from "./status";

describe("only active listings are for sale", () => {
  it("keeps active", () => {
    for (const s of ["active", "Active", "ACTIVE", "for_sale", "back on market", "price change"]) expect(isForSale(s)).toBe(true);
  });
  it("drops pending and everything after it", () => {
    for (const s of ["pending", "Pending", "sale pending", "active under contract", "active contingent", "contingent", "sold", "closed", "expired", "withdrawn", "off_market", "coming_soon", "", null]) expect(isForSale(s)).toBe(false);
  });
});
