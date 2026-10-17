import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GATED_APIS, adminOnly, adminSessionSecret, isGatedApi, isGatedPage } from "../gate";
import { ADMIN_COOKIE, newSession, signSession } from "../token";

vi.mock("@/utils/supabase/middleware", () => ({ updateSession: vi.fn(async () => new Response(null, { status: 200, headers: { "x-session": "refreshed" } })) }));

const adminCookie = async () => `${ADMIN_COOKIE}=${await signSession(newSession("admin"), adminSessionSecret())}`;
const req = (path: string, cookie?: string) => new NextRequest(new URL(path, "http://localhost"), { headers: cookie ? { cookie } : {} });

describe("what is gated", () => {
  it("covers the lot pages and their APIs, and nothing public", () => {
    for (const p of ["/search", "/search?top=1".split("?")[0], "/feasibility", "/listing/123", "/invest/abc", "/saved"]) expect(isGatedPage(p), p).toBe(true);
    for (const p of ["/", "/calculator", "/plans", "/members", "/listings", "/investors", "/portal/reports"]) expect(isGatedPage(p), p).toBe(false);
    for (const p of ["/api/lot", "/api/lot-shapes", "/api/feasibility/bulk", "/api/feasibility/lot", "/api/invest/top", "/api/parcel"]) expect(isGatedApi(p), p).toBe(true);
    for (const p of ["/api/invest/contact", "/api/subscribe", "/api/checkout", "/api/geocode", "/api/portal/feasibility", "/api/lots-x"]) expect(isGatedApi(p), p).toBe(false);
  });

  it("the proxy matcher lists every gated API (Next needs it literal)", () => {
    const src = readFileSync("src/proxy.ts", "utf8");
    for (const a of GATED_APIS) {
      expect(src, a).toContain(`"${a}"`);
      expect(src, a).toContain(`"${a}/:path*"`);
    }
  });
});

describe("adminOnly", () => {
  it("refuses a request without a valid admin session", async () => {
    expect((await adminOnly(new Request("http://localhost/api/lot")))?.status).toBe(401);
    expect((await adminOnly(new Request("http://localhost/api/lot", { headers: { cookie: `${ADMIN_COOKIE}=forged.token` } })))?.status).toBe(401);
  });
  it("lets an admin through", async () => {
    expect(await adminOnly(new Request("http://localhost/api/lot", { headers: { cookie: await adminCookie() } }))).toBeNull();
  });
});

describe("the proxy", () => {
  it("shows a visitor the members teaser in place of a gated page, with the query kept", async () => {
    const { proxy } = await import("@/proxy");
    const res = await proxy(req("/feasibility?address=1234%20N%2045th%20St"));
    const rewrite = new URL(res.headers.get("x-middleware-rewrite") ?? "http://x/none");
    expect(rewrite.pathname).toBe("/members");
    expect(rewrite.searchParams.get("from")).toBe("/feasibility");
    expect(rewrite.searchParams.get("address")).toBe("1234 N 45th St");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });
  it("answers 401 on a gated API for a visitor", async () => {
    const { proxy } = await import("@/proxy");
    const res = await proxy(req("/api/map-listings?zip=98105"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "members_only" });
  });
  it("lets an admin through to pages and APIs", async () => {
    const { proxy } = await import("@/proxy");
    const cookie = await adminCookie();
    const page = await proxy(req("/search", cookie));
    expect(page.headers.get("x-middleware-rewrite")).toBeNull();
    const api = await proxy(req("/api/lot?pin=1234567890", cookie));
    expect(api.status).toBe(200);
  });
  it("leaves public pages alone", async () => {
    const { proxy } = await import("@/proxy");
    const res = await proxy(req("/calculator"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("x-session")).toBe("refreshed");
  });
});
