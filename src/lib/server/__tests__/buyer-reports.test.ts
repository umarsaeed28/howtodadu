import { describe, expect, it, vi, beforeEach } from "vitest";

/** A buyer sees only the reports they paid for; a guest order counts only once the account's email is verified. */
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  orders: [] as { id: string; kind: string; address: string; parcel_pin: string; status: string; owner_id: string | null; email: string; paid_at: string; due_date: null; created_at: string }[],
  verified: null as string | null,
}));

vi.mock("@/utils/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from(table: string) {
      if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email_verified_at: state.verified } }) }) }) };
      const filters: [string, unknown][] = [];
      const q = {
        select: () => q, in: (c: string, v: unknown[]) => (filters.push([`in:${c}`, v]), q), order: () => q, limit: () => q,
        eq: (c: string, v: unknown) => (filters.push([c, v]), q),
        then: (res: (v: { data: unknown[]; error: null }) => void) =>
          res({
            data: state.orders.filter((o) => filters.every(([c, v]) => (c.startsWith("in:") ? (v as unknown[]).includes(o[c.slice(3) as keyof typeof o]) : o[c as keyof typeof o] === v))),
            error: null,
          }),
      };
      return q;
    },
  }),
}));

const viewer = { id: "u1", email: "Buyer@Example.com", name: "", role: "client" as const, gcId: null };
const order = (id: string, over: Partial<(typeof state.orders)[number]> = {}) => ({ id, kind: "feasibility_instant", address: "1234 N 45th St, Seattle, WA", parcel_pin: "unknown", status: "paid", owner_id: null, email: "buyer@example.com", paid_at: "2026-10-01", due_date: null, created_at: `2026-10-0${id.length}`, ...over });
const projects = (addresses: string[]) => ({ from: () => ({ select: () => ({ not: () => ({ limit: async () => ({ data: addresses.map((address) => ({ address })) }) }) }) }) }) as never;

describe("buyer reports", () => {
  beforeEach(() => {
    state.orders = [];
    state.verified = null;
  });

  it("matches addresses on the street part", async () => {
    const { addressKey } = await import("../buyer-reports");
    expect(addressKey("1234 N 45th St, Seattle, WA 98103")).toBe(addressKey("1234  n 45th st"));
  });

  it("lists owned orders, and guest orders only with a verified email", async () => {
    const { buyerReports } = await import("../buyer-reports");
    state.orders = [order("a", { owner_id: "u1" }), order("bb"), order("ccc", { owner_id: "someone-else", email: "other@example.com" }), order("dddd", { owner_id: "u1", status: "cancelled" })];
    expect((await buyerReports(viewer)).map((r) => r.id)).toEqual(["a"]);
    state.verified = "2026-10-02T00:00:00Z";
    expect((await buyerReports(viewer)).map((r) => r.id).sort()).toEqual(["a", "bb"]);
  });

  it("lets a buyer see only the lot they paid for or have a project on", async () => {
    const { viewerMaySeeLot } = await import("../buyer-reports");
    state.orders = [order("a", { owner_id: "u1" })];
    expect(await viewerMaySeeLot(viewer, projects([]), "1234 N 45th St")).toBe(true);
    expect(await viewerMaySeeLot(viewer, projects([]), "5519 12th Ave NE")).toBe(false);
    expect(await viewerMaySeeLot(viewer, projects(["5519 12th Ave NE, Seattle"]), "5519 12th Ave NE")).toBe(true);
  });
});
