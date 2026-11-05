import { describe, expect, it } from "vitest";
import { DEFAULT_FORM, calculatorHref, fromSearchParams, parseForm, parseNumber, toSearchParams, type CalcForm } from "../inputs";
import { COST_PER_SF, constructionEstimate } from "@/lib/config/costs";

/** The team defaults (soft costs, selling costs, timeline, rate) cleared, so each test sets only what it is about. */
const BLANK: CalcForm = { ...DEFAULT_FORM, softFlat: "", sellSix: "", permitMonths: "", buildMonths: "", exitMonths: "", ratePct: "" };
const form = (o: Partial<CalcForm> = {}): CalcForm => ({ ...BLANK, ...o });

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

describe("proforma", () => {
  it("team defaults: $50,000 soft, 6% selling, 4 + 8 + 2 months, 10% rate", () => {
    expect(DEFAULT_FORM.softFlat).toBe("50000");
    expect(DEFAULT_FORM.sellSix).toBe("1");
    const p = parseForm({ ...DEFAULT_FORM, sf: "1000" });
    expect(p.sellingPct).toBe(6);
    expect(p.costOnly?.costBreakdown.soft).toBe(50_000);
    expect(p.costOnly?.timelineMonths).toBe(14);
  });
  it("rehab of the house: level rate times house area, into hard cost", () => {
    const p = parseForm(form({ sf: "1000", houseSqft: "2000", rehabLevel: "heavy" }));
    expect(p.rehab).toEqual({ rate: 120, cost: 240_000, houseSqft: 2000 });
    expect(p.costOnly?.costBreakdown.hard).toBe(350_000 + 240_000);
    expect(parseForm(form({ sf: "1000", houseSqft: "2000", rehabLevel: "custom", rehabPerSf: "50" })).rehab.cost).toBe(100_000);
  });
  it("sale price defaults to the house at break-even plus the DADU resale; your ARV replaces the house side", () => {
    const p = parseForm(form({ sf: "1000", price: "1000000", houseSqft: "2000", rehabLevel: "light" }));
    expect(p.autoSaleParts).toEqual({ house: 1_140_000, dadu: 680_000, houseIsOwn: false });
    expect(p.sale?.result.exits.sell?.grossRevenue).toBe(1_820_000);
    const own = parseForm(form({ sf: "1000", price: "1000000", houseSqft: "2000", rehabLevel: "light", houseArv: "1300000" }));
    expect(own.autoSaleParts?.house).toBe(1_300_000);
    expect(own.autoSaleParts?.houseIsOwn).toBe(true);
    const typed = parseForm(form({ sf: "1000", price: "1000000", salePrice: "2000000" }));
    expect(typed.sale?.result.exits.sell?.grossRevenue).toBe(2_000_000);
  });
  it("the 6% box sets selling costs; unticked uses the typed percent", () => {
    expect(parseForm(form({ sf: "1000", sellSix: "1", sellingPct: "3" })).sellingPct).toBe(6);
    expect(parseForm(form({ sf: "1000", sellSix: "", sellingPct: "3" })).sellingPct).toBe(3);
  });
  it("holding costs run for the whole timeline and a loan amount replaces loan to cost", () => {
    const p = parseForm(form({ sf: "1000", taxMonthly: "500", insuranceMonthly: "100", utilitiesMonthly: "200", permitMonths: "4", buildMonths: "8", exitMonths: "2", loanAmount: "200000", ratePct: "12", ltcPct: "90" }));
    const r = p.costOnly!;
    expect(r.loanAmount).toBe(200_000);
    // carry 800 a month x 14 months = 11,200; permit interest on land only (none here); build 8 months at 60% drawn; sale 2 months fully drawn
    expect(r.costBreakdown.financing).toBe(Math.round(11_200 + 200_000 * 0.12 * ((8 / 12) * 0.6 + 2 / 12)));
  });
  it("the link carries price, house area, rehab and ARV", () => {
    const href = calculatorHref({ sf: 870, address: "1 A St", price: 1_225_000, houseSqft: 2300, rehab: "heavy", houseArv: 1_500_000 });
    const f = fromSearchParams(new URLSearchParams(href.split("?")[1]));
    expect(f.price).toBe("1225000");
    expect(f.houseSqft).toBe("2300");
    expect(f.rehabLevel).toBe("heavy");
    expect(f.houseArv).toBe("1500000");
    expect(fromSearchParams(new URLSearchParams("rehab=bogus")).rehabLevel).toBe("none");
  });
});

describe("parseForm", () => {
  it("is not ready until the area is entered, and that is not an error", () => {
    const p = parseForm(form());
    expect(p.ready).toBe(false);
    expect(p.errors).toEqual([]);
    expect(p.costOnly).toBeNull();
  });

  it("gives cost results plus the DADU's own resale value when there is no purchase price (an owner adding a cottage)", () => {
    const p = parseForm(form({ sf: "1000" }));
    expect(p.ready).toBe(true);
    expect(p.construction).toBe(350_000);
    expect(p.costOnly?.costBreakdown.total).toBe(350_000);
    expect(p.hasRent).toBe(false);
    expect(p.rent).toBeNull();
    expect(p.costOnly?.equityRequired).toBe(350_000);
    // No market number is invented: the only value is the team's DADU resale rule ($680 per sf at 1,000 sf).
    expect(p.autoSaleParts).toEqual({ house: 0, dadu: 680_000, houseIsOwn: false });
    expect(p.sale?.result.exits.sell?.grossRevenue).toBe(680_000);
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
