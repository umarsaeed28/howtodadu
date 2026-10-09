import { describe, expect, it } from "vitest";
import { revenueTotals } from "./revenue";

describe("revenue totals", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const rows = [
    { created_at: "2026-10-08T10:00:00Z", product: "feasibility_instant", amount_cents: 20_000 },
    { created_at: "2026-10-01T10:00:00Z", product: "feasibility_reviewed", amount_cents: 60_000 },
    { created_at: "2026-09-20T10:00:00Z", product: "custom_plan", amount_cents: 300_000 },
    { created_at: "2026-08-01T10:00:00Z", product: "permit_package", amount_cents: 1_500_000 },
    { created_at: "2026-10-05T10:00:00Z", product: "feasibility_instant", amount_cents: -20_000 },
  ];
  it("sums all time, this month, the last 30 and 7 days, with refunds subtracting", () => {
    const t = revenueTotals(rows, now);
    expect(t.allTime).toBe(1_860_000);
    expect(t.thisMonth).toBe(60_000);
    expect(t.last30Days).toBe(360_000);
    expect(t.last7Days).toBe(0);
    expect(t.count).toBe(5);
  });
  it("groups by product, largest first, and by month in order", () => {
    const t = revenueTotals(rows, now);
    expect(t.byProduct[0]).toEqual({ product: "permit_package", amountCents: 1_500_000, count: 1 });
    expect(t.byProduct.find((p) => p.product === "feasibility_instant")).toEqual({ product: "feasibility_instant", amountCents: 0, count: 2 });
    expect(t.byMonth.map((m) => m.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(t.byMonth[2].amountCents).toBe(60_000);
  });
  it("handles no purchases", () => {
    expect(revenueTotals([], now)).toMatchObject({ allTime: 0, count: 0, byProduct: [], byMonth: [] });
  });
});
