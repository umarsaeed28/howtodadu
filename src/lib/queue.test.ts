import { describe, expect, it } from "vitest";
import { CAPACITY, slotFor, weekOf } from "./queue";
import { addBusinessDays, price, PRODUCTS } from "./pricing";

const at = (s: string) => new Date(`${s}T10:00:00`);

describe("drafting queue", () => {
  it("weeks start on Monday", () => {
    expect(weekOf(at("2026-10-08"))).toBe("2026-10-05"); // Thursday
    expect(weekOf(at("2026-10-05"))).toBe("2026-10-05"); // Monday
    expect(weekOf(at("2026-10-11"))).toBe("2026-10-05"); // Sunday belongs to the week that started Monday
  });

  it("joins this week when there is room, ready that Friday", () => {
    expect(slotFor(at("2026-10-07"), { "2026-10-05": 2 })).toEqual({ week: "2026-10-05", readyBy: "2026-10-09", booked: false });
  });

  it("moves to the first open week when this week is full", () => {
    expect(slotFor(at("2026-10-07"), { "2026-10-05": CAPACITY, "2026-10-12": CAPACITY })).toEqual({ week: "2026-10-19", readyBy: "2026-10-23", booked: true });
  });

  it("from the weekend, starts next Monday without calling it booked", () => {
    expect(slotFor(at("2026-10-10"), {})).toEqual({ week: "2026-10-12", readyBy: "2026-10-16", booked: false });
  });
});

describe("price list", () => {
  it("holds the four published prices", () => {
    expect(Object.values(PRODUCTS).map((p) => price(p.amountCents))).toEqual(["$200", "$600", "$3,000", "$5,000"]);
    expect(PRODUCTS.feasibility_reviewed.popular).toBe(true);
  });

  it("counts business days", () => {
    expect(addBusinessDays(at("2026-10-08"), 3).getDate()).toBe(13); // Thu + 3 business days = Tue
    expect(addBusinessDays(at("2026-10-09"), 1).getDate()).toBe(12); // Fri + 1 = Mon
  });
});
