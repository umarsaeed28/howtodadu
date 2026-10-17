import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { adminSessionSecret } from "@/lib/admin/gate";
import { ADMIN_COOKIE, newSession, signSession } from "@/lib/admin/token";

/**
 * Every gated API route refuses a visitor on its own, without the proxy in front (src/lib/admin/gate.ts). The data
 * sources are stubbed so an admin request proves only that the guard lets it through.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/feasibility-query", () => ({ getFeasibilityForAddress: vi.fn(async () => ({ ok: true, data: { parcel: null, feasibility: null } })) }));
vi.mock("@/lib/server/listing-for-address", () => ({ listingForAddress: vi.fn(async () => null) }));

const routes: [string, () => Promise<{ GET?: (r: NextRequest) => Promise<Response>; POST?: (r: NextRequest) => Promise<Response> }>, string][] = [
  ["/api/map-listings", () => import("../map-listings/route"), "GET"],
  ["/api/offmarket", () => import("../offmarket/route"), "GET"],
  ["/api/lot-shapes?pins=1234567890", () => import("../lot-shapes/route"), "GET"],
  ["/api/lot?pin=1234567890", () => import("../lot/route"), "GET"],
  ["/api/lots", () => import("../lots/route"), "GET"],
  ["/api/feasibility?address=1%20Test%20St", () => import("../feasibility/route"), "GET"],
  ["/api/feasibility/bulk", () => import("../feasibility/bulk/route"), "POST"],
  ["/api/feasibility/lot?pin=1234567890", () => import("../feasibility/lot/route"), "GET"],
  ["/api/parcel?pin=1234567890", () => import("../parcel/route"), "GET"],
  ["/api/assessment?mls=1", () => import("../assessment/route"), "GET"],
  ["/api/alleys", () => import("../alleys/route"), "GET"],
  ["/api/invest/top", () => import("../invest/top/route"), "GET"],
];

const request = (path: string, method: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost"), { method, headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" }, body: method === "POST" ? JSON.stringify({ addresses: [] }) : undefined });

describe("gated API routes", () => {
  for (const [path, load, method] of routes) {
    it(`${method} ${path}: 401 for a visitor`, async () => {
      const mod = await load();
      const res = await mod[method as "GET" | "POST"]!(request(path, method));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: "members_only" });
    });
    it(`${method} ${path}: past the guard for an admin`, async () => {
      const mod = await load();
      const cookie = `${ADMIN_COOKIE}=${await signSession(newSession("admin"), adminSessionSecret())}`;
      const res = await mod[method as "GET" | "POST"]!(request(path, method, cookie));
      expect(res.status).not.toBe(401);
    }, 20_000);
  }
});
