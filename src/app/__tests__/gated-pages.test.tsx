import { describe, expect, it, vi, beforeEach } from "vitest";
import { isValidElement, type ReactElement } from "react";
import MembersTeaser from "@/components/members/MembersTeaser";

/** Each gated page checks the admin itself (src/lib/admin/gate.ts), so it never renders lot data for a visitor. */
const admin = vi.hoisted(() => ({ current: null as null | { u: string } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/server", () => ({ currentAdmin: vi.fn(async () => admin.current) }));
vi.mock("@/lib/listings", () => ({ getListingsProvider: () => ({ getById: vi.fn(async () => { throw new Error("listing data must not load for a visitor"); }) }), listingsProviderName: () => "test" }));
vi.mock("@/lib/server/invest", () => ({ getOpportunity: vi.fn(async () => { throw new Error("invest data must not load for a visitor"); }), getInvestAssumptions: vi.fn() }));

const teaserFrom = (el: unknown) => (isValidElement(el) && el.type === MembersTeaser ? (el as ReactElement<{ from: string; address?: string }>).props : null);

describe("gated pages", () => {
  beforeEach(() => {
    admin.current = null;
  });

  it("/search and /saved render the teaser for a visitor and the real page for an admin", async () => {
    const search = (await import("../search/page")).default;
    expect(teaserFrom(await search())?.from).toBe("/search");
    admin.current = { u: "admin" };
    expect(teaserFrom(await search())).toBeNull();
    admin.current = null;
    const saved = (await import("../saved/page")).default;
    expect(teaserFrom(await saved())?.from).toBe("/saved");
  });

  it("/feasibility carries the address into the teaser's sign-up", async () => {
    const page = (await import("../feasibility/page")).default;
    const el = await page({ searchParams: Promise.resolve({ address: "1234 N 45th St, Seattle, WA" }) });
    expect(teaserFrom(el)).toMatchObject({ from: "/feasibility", address: "1234 N 45th St, Seattle, WA" });
  });

  it("listing and invest pages load no data and leak nothing in their titles for a visitor", async () => {
    const listing = await import("../listing/[mlsId]/page");
    expect(teaserFrom(await listing.default({ params: Promise.resolve({ mlsId: "123" }) }))?.from).toBe("/listing");
    expect(await listing.generateMetadata({ params: Promise.resolve({ mlsId: "123" }) })).toMatchObject({ title: "Lot intelligence, coming to members — Pencil", robots: { index: false } });
    const invest = await import("../invest/[id]/page");
    expect(teaserFrom(await invest.default({ params: Promise.resolve({ id: "x" }) }))?.from).toBe("/invest");
    expect((await invest.generateMetadata({ params: Promise.resolve({ id: "x" }) })).title).toBe("Lot intelligence, coming to members — Pencil");
  });

  it("the gated pages are noindex", async () => {
    for (const p of [import("../search/page"), import("../feasibility/page"), import("../saved/page")]) {
      expect((await p).metadata.robots).toMatchObject({ index: false });
    }
  });
});
