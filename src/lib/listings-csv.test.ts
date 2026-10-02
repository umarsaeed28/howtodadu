import { describe, expect, it } from "vitest";
import { listingsToCsv } from "./listings-csv";
import type { MapListing } from "@/app/api/map-listings/route";

const row = (o: Partial<MapListing> = {}): MapListing => ({
  mlsId: "1", address: '12 "Main" St, Seattle', lat: 47.6, lng: -122.3, price: 900000, lotSqft: 5000, status: "Active", photo: null,
  pin: "123", score: 95, tier: 3, corner: true, alley: false, beds: 3, baths: null, sqft: 1500, daduSqft: 800, zip: "98103", daysOnMarket: 4, listingUrl: null, pending: false, pendingNote: null, statusVerified: true, test: false, ...o,
});

describe("listingsToCsv", () => {
  it("writes a header, quotes cells, leaves nulls empty and computes $/sqft", () => {
    const [head, line] = listingsToCsv([row()]).replace("﻿", "").split("\r\n");
    expect(head.startsWith("MLS ID,Address,ZIP")).toBe(true);
    expect(line).toContain('"12 ""Main"" St, Seattle"');
    expect(line).toContain(",600,"); // 900000 / 1500
    expect(line).toContain("Top pick,800,Yes,No,No");
  });
  it("defuses spreadsheet formulas", () => {
    expect(listingsToCsv([row({ address: "=HYPERLINK(1)" })])).toContain("'=HYPERLINK(1)");
  });
});
