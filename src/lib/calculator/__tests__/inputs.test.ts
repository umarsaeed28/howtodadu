import { describe, expect, it } from "vitest";
import { DEFAULT_FORM, calculatorHref, fromSearchParams, parseForm, parseNumber, toSearchParams, type CalcForm } from "../inputs";
import { COST_PER_SF, constructionEstimate } from "@/lib/config/costs";

const form = (o: Partial<CalcForm> = {}): CalcForm => ({ ...DEFAULT_FORM, ...o });

describe("cost constant", () => {
  it("prices 1,000 sf at $350 per sf", () => {
    expect(COST_PER_SF).toBe(350);
    expect(constructionEstimate(1000)).toBe(350_000);
    expect(constructionEstimate(0)).toBe(0);
    expect(constructionEstimate(NaN)).toBe(0);
  });
});

describe("parseNumber", () => {
  it("treats blank as not provided and strips symbols", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(" $1,250,000 ")).toBe(1_250_000);
    expect(parseNumber("7.5%")).toBe(7.5);
    expect(Number.isNaN(parseNumber("abc"))).toBe(true);
  });
});

describe("parseForm", () => {
  it("is not ready until the area is entered, and that is not an error", () => {
    const p = parseForm(form());
    expect(p.ready).toBe(false);
    expect(p.errors).toEqual([]);
    expect(p.costOnly).toBeNull();
  });

  it("gives cost-only results with no invented value", () => {
    const p = parseForm(form({ sf: "1000" }));
    expect(p.ready).toBe(true);
    expect(p.construction).toBe(350_000);
    expect(p.costOnly?.costBreakdown.total).toBe(350_000);
    expect(p.hasSale || p.hasRent).toBe(false);
    expect(p.sale).toBeNull();
    expect(p.rent).toBeNull();
    expect(p.costOnly?.equityRequired).toBe(350_000);
  });

  it("adds soft, contingency and fixed costs on top of construction", () => {
    const p = parseForm(form({ sf: "1000", softPct: "10", contingencyPct: "5", permits: "10000" }));
    // hard = 350,000 * 1.05; soft = 350,000 * 10% (on the base) + 10,000
    expect(p.costOnly?.costBreakdown.hard).toBe(367_500);
    expect(p.costOnly?.costBreakdown.soft).toBe(45_000);
  });

  it("computes profit from a sale price: net revenue minus total cost", () => {
    const p = parseForm(form({ sf: "1000", salePrice: "600000", sellingPct: "6" }));
    expect(p.sale).not.toBeNull();
    const r = p.sale!.result;
    expect(r.exits.sell?.grossRevenue).toBe(600_000);
    expect(r.exits.sell?.netRevenue).toBe(564_000);
    expect(r.exits.sell?.profit).toBe(564_000 - 350_000);
  });

  it("needs a cap rate with rent before it produces a hold case", () => {
    expect(parseForm(form({ sf: "1000", rent: "3000" })).rent).toBeNull();
    const p = parseForm(form({ sf: "1000", rent: "3000", capPct: "5.5", opexPct: "30" }));
    expect(p.rent?.result.exits.hold?.noi).toBe(Math.round(3000 * 12 * 0.7));
  });

  it("charges no selling costs on a hold, so value created is value minus cost", () => {
    const p = parseForm(form({ sf: "1000", rent: "3000", capPct: "5.5" }));
    const h = p.rent!.result.exits.hold!;
    expect(h.valueCreated).toBe(h.stabilizedValue - p.rent!.result.costBreakdown.total);
  });

  it("reports every invalid field and produces no results", () => {
    const p = parseForm(form({ sf: "abc", softPct: "150", buildMonths: "2.5" }));
    expect(p.ready).toBe(false);
    expect(p.errors.map((e) => e.field).sort()).toEqual(["buildMonths", "sf", "softPct"]);
  });

  it("never returns NaN or Infinity (null means not applicable)", () => {
    const p = parseForm(form({ sf: "800", price: "900000", ltcPct: "70", ratePct: "9", buildMonths: "10", permitMonths: "6", exitMonths: "3", salePrice: "700000" }));
    const bad: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === "number" && !Number.isFinite(v)) bad.push(path);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(p.sale?.result, "result");
    expect(bad).toEqual([]);
  });
});

describe("URL round trip", () => {
  it("serializes only non-default values and restores them", () => {
    const f = form({ sf: "900", salePrice: "650000", ltcPct: "65" });
    const q = toSearchParams(f, { addr: "1 A St" });
    expect(q.get("sf")).toBe("900");
    expect(q.get("cost")).toBeNull(); // default
    expect(q.get("addr")).toBe("1 A St");
    expect(fromSearchParams(q)).toEqual(f);
  });

  it("prefills the area from the report link", () => {
    const href = calculatorHref({ sf: 1000, address: "6202 43rd Ave NE" });
    const f = fromSearchParams(new URL(`http://x${href}`).searchParams);
    expect(f.sf).toBe("1000");
    expect(parseForm(f).construction).toBe(350_000);
  });
});
