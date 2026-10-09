import { describe, expect, it } from "vitest";
import { MAX_ZIPS, inPriceRange, parseZips, priceLabel, readSearchParams, searchHref } from "./search-filters";

describe("search filters", () => {
  it("keeps Seattle ZIPs only, without repeats, up to five", () => {
    expect(parseZips("98103, 98107 98103 98004 abc")).toEqual({ zips: ["98103", "98107"], rejected: ["98004", "abc"], overLimit: false });
    const six = parseZips("98103 98107 98115 98117 98125 98133");
    expect(six.zips).toHaveLength(MAX_ZIPS);
    expect(six.overLimit).toBe(true);
    expect(parseZips("98117", ["98103", "98107", "98115", "98125", "98133"]).overLimit).toBe(true);
  });

  it("round-trips through the URL", () => {
    const href = searchHref({ zips: ["98103", "98107"], min: 600_000, max: 1_200_000 });
    expect(href).toBe("/search?zip=98103,98107&min=600000&max=1200000");
    expect(readSearchParams(new URLSearchParams(href.split("?")[1]))).toEqual({ zips: ["98103", "98107"], min: 600_000, max: 1_200_000 });
    expect(searchHref({})).toBe("/search");
  });

  it("swaps a reversed range and ignores junk", () => {
    expect(readSearchParams(new URLSearchParams("min=900000&max=500000&zip=11111"))).toEqual({ zips: [], min: 500_000, max: 900_000 });
    expect(readSearchParams(new URLSearchParams("min=abc"))).toEqual({ zips: [], min: 0, max: 0 });
  });

  it("filters prices with open ends and labels them", () => {
    expect(inPriceRange(700_000, 0, 0)).toBe(true);
    expect(inPriceRange(700_000, 800_000, 0)).toBe(false);
    expect(inPriceRange(700_000, 0, 600_000)).toBe(false);
    expect(priceLabel(500_000)).toBe("$500k");
    expect(priceLabel(1_000_000)).toBe("$1M");
    expect(priceLabel(1_250_000)).toBe("$1.25M");
    expect(priceLabel(1_500_000)).toBe("$1.5M");
  });
});
