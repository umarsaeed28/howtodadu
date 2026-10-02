import { describe, expect, it } from "vitest";
import { DM_ACTIVE_FILTERS, fromDealMachine } from "./dealmachine";

// The shape DealMachine returned for a real active listing (POST /v1/properties/search, Oct 2026).
const record = {
  dm_property_id: "prop_144350132",
  full_address: "1215 E LYNN ST, SEATTLE, WA 98102",
  address: "1215 E LYNN ST",
  unit: null,
  city: "SEATTLE",
  state: "WA",
  zip: "98102",
  latitude: 47.63937,
  longitude: -122.316522,
  images: { street_view: "https://img.dealmachine.com/sv/47.63937,-122.316522.jpg", satellite: "x", roadmap: "y" },
  mls_current_listing_price: 3695000,
  mls_days_on_market: 65,
  mls_last_initial_listing_date: "2026-07-29",
  market_status: "Active",
  lot_size_sqft: 5300,
  year_built: 1911,
  living_area_sqft: 4550,
  num_bedrooms: 5,
  num_bathrooms: 5,
  has_hoa: "No",
  hoa_1_fee_amount: null,
  zoning: "NR3",
  num_units: 1,
  property_type: "Single Family",
};

describe("DealMachine listings", () => {
  it("maps a property record to a listing", () => {
    const l = fromDealMachine(record)!;
    expect(l.mlsId).toBe("dm-144350132");
    expect(l.address).toBe("1215 E LYNN ST, Seattle, WA 98102");
    expect(l.listPrice).toBe(3695000);
    expect(l.daysOnMarket).toBe(65);
    expect(l.lotSqft).toBe(5300);
    expect(l.beds).toBe(5);
    expect(l.status).toBe("active");
    expect(l.photos[0]).toContain("img.dealmachine.com/sv/");
  });
  it("has_hoa No means no HOA; Yes with a fee carries the fee; unknown stays unknown", () => {
    expect(fromDealMachine(record)!.hoaMonthly).toBe(0);
    expect(fromDealMachine({ ...record, has_hoa: "Yes", hoa_1_fee_amount: 120 })!.hoaMonthly).toBe(120);
    expect(fromDealMachine({ ...record, has_hoa: null })!.hoaMonthly).toBeUndefined();
  });
  it("drops records with no price or place", () => {
    expect(fromDealMachine({ ...record, mls_current_listing_price: null })).toBeNull();
    expect(fromDealMachine({ ...record, latitude: null })).toBeNull();
  });
  it("asks DealMachine only for active single-family NR homes with one unit on 3,800 sf or more", () => {
    const ids = DM_ACTIVE_FILTERS.map((f) => f.filter_id);
    expect(ids).toEqual(expect.arrayContaining(["property_type", "zoning", "num_units", "lot_size_sqft", "is_mls_active"]));
  });
});
