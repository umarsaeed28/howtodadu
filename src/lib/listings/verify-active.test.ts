import { describe, expect, it } from "vitest";
import { streetKey, verifyActive } from "./verify-active";
import type { RawListing } from "./provider";

const l = (address: string, zip: string): RawListing => ({ mlsId: address, address, city: "Seattle", zip, lat: 47.7, lng: -122.35, listPrice: 800000, lotSqft: 6000, status: "active", photos: [], updatedAt: "" });

describe("truly active check", () => {
  it("normalizes street addresses from both sources", () => {
    expect(streetKey("610 N 125TH ST, Seattle, WA 98133")).toBe(streetKey("610 N 125th St"));
    expect(streetKey("4002 12th Avenue South")).toBe(streetKey("4002 12TH AVE S, Seattle"));
  });
  it("keeps a home Redfin lists as active, and takes Redfin's link", () => {
    const r = verifyActive([l("4002 12TH AVE S, Seattle, WA 98108", "98108")], new Map([["98108", [{ street: streetKey("4002 12th Ave S"), url: "https://www.redfin.com/WA/Seattle/x/home/1", status: "Active" }]]]));
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0].listingUrl).toContain("redfin.com");
  });
  it("drops a home Redfin does not list as active: 610 N 125th St, pending on Redfin, Active on DealMachine", () => {
    const r = verifyActive([l("610 N 125TH ST, Seattle, WA 98133", "98133")], new Map([["98133", [{ street: streetKey("12000 Aurora Ave N"), url: null, status: "Active" }]]]));
    expect(r.kept).toHaveLength(0);
    expect(r.dropped[0].reason).toMatch(/not in Redfin's active listings/);
  });
  it("drops it when Redfin's own status is not active", () => {
    const r = verifyActive([l("1 A St, Seattle, WA 98103", "98103")], new Map([["98103", [{ street: "1 A ST", url: null, status: "Pending" }]]]));
    expect(r.dropped[0].reason).toMatch(/Pending/);
  });
  it("fails closed when Redfin's list for a ZIP could not be read", () => {
    const r = verifyActive([l("1 A St, Seattle, WA 98103", "98103")], new Map());
    expect(r.kept).toHaveLength(0);
  });
});
