import { describe, expect, it, vi } from "vitest";

/** Every plan library route refuses a request without an admin session, before touching storage or the database. */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/server", () => ({
  currentAdmin: vi.fn(async () => null),
  currentEnv: vi.fn(async () => null),
  adminDb: () => { throw new Error("the database must not be reached"); },
}));

const params = { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) };
const cases: [string, () => Promise<Response>][] = [
  ["GET /api/admin/plans", async () => (await import("../admin/plans/route")).GET()],
  ["POST /api/admin/plans/batch", async () => (await import("../admin/plans/batch/route")).POST(new Request("http://x", { method: "POST", body: "{}" }))],
  ["POST confirm", async () => (await import("../admin/plans/files/[id]/confirm/route")).POST(new Request("http://x"), params)],
  ["POST process", async () => (await import("../admin/plans/files/[id]/process/route")).POST(new Request("http://x"), params)],
  ["GET file url", async () => (await import("../admin/plans/files/[id]/url/route")).GET(new Request("http://x"), params)],
  ["PATCH set", async () => (await import("../admin/plans/sets/[id]/route")).PATCH(new Request("http://x", { method: "PATCH", body: "{}" }), params)],
  ["GET pins", async () => (await import("../admin/plans/pins/route")).GET()],
];

describe("plan library routes", () => {
  for (const [name, call] of cases) {
    it(`${name}: 401 without an admin session`, async () => {
      expect((await call()).status).toBe(401);
    });
  }
});
