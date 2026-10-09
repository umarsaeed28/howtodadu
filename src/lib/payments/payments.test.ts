import { describe, expect, it, vi } from "vitest";

// The route reads the viewer and may send mail; neither reaches a network in tests.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/server", () => ({ currentViewer: async () => null }));
vi.mock("@/lib/portal/notify", () => ({ sendMail: async () => "logged", portalUrl: (p: string) => `http://localhost${p}` }));
vi.mock("@/lib/server/orders", () => ({
  recordOrder: async () => ({ id: "order-1", token: "tok", stored: false }),
  customPlanCounts: async () => ({}),
}));

import { cleanAddress, getPaymentProvider, isProductKind, paymentProviderName } from "./index";
import { POST } from "@/app/api/checkout/route";

describe("payments", () => {
  it("defaults to the mock provider and reserves stripe", () => {
    expect(paymentProviderName({})).toBe("mock");
    expect(paymentProviderName({ PAYMENTS_PROVIDER: "stripe" })).toBe("stripe");
    expect(getPaymentProvider({ PAYMENTS_PROVIDER: "nonsense" }).name).toBe("mock");
  });

  it("mock charges succeed, decline on request, and stripe refuses until wired", async () => {
    const ok = await getPaymentProvider({}).charge({ kind: "feasibility_instant", email: "a@b.co", orderId: "x" });
    expect(ok).toMatchObject({ ok: true, provider: "mock" });
    expect(await getPaymentProvider({}).charge({ kind: "feasibility_instant", email: "a@b.co", orderId: "x", simulate: "fail" })).toEqual({ ok: false, error: "card_declined" });
    expect(await getPaymentProvider({ PAYMENTS_PROVIDER: "stripe" }).charge({ kind: "permit", email: "a@b.co", orderId: "x" })).toEqual({ ok: false, error: "stripe_not_configured" });
  });

  it("knows the four products and cleans addresses", () => {
    expect(["feasibility_instant", "feasibility_reviewed", "custom_plan", "permit"].every(isProductKind)).toBe(true);
    expect(isProductKind("pack5")).toBe(false);
    expect(cleanAddress("  610  N 125th\nSt ")).toBe("610 N 125th St");
  });
});

describe("POST /api/checkout", () => {
  const call = (body: unknown) => POST(new Request("http://x/api/checkout", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
  const base = { email: "Owner@Example.com", pin: "0004000070", address: "610 N 125th St" };

  it("sells the instant report and never echoes card data", async () => {
    const res = await call({ ...base, kind: "feasibility_instant", cardNumber: "4242", cvc: "123" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.receipt).toMatchObject({ orderId: "order-1", token: "tok", kind: "feasibility_instant", amountCents: 20_000, provider: "mock", dueDate: null });
    expect(JSON.stringify(json)).not.toContain("4242");
  });

  it("gives the reviewed tier a due date and the custom plan a queue week", async () => {
    const reviewed = await (await call({ ...base, kind: "feasibility_reviewed" })).json();
    expect(reviewed.receipt.amountCents).toBe(60_000);
    expect(reviewed.receipt.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const custom = await (await call({ ...base, kind: "custom_plan" })).json();
    expect(custom.receipt).toMatchObject({ amountCents: 300_000, booked: false });
    expect(custom.receipt.queueWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("needs sign-in for the permit service, and answers 402 to a simulated decline", async () => {
    expect((await call({ ...base, kind: "permit" })).status).toBe(401);
    const declined = await call({ ...base, kind: "feasibility_instant", simulate: "fail" });
    expect(declined.status).toBe(402);
    expect(await declined.json()).toMatchObject({ ok: false, error: "card_declined" });
  });

  it("rejects bad input", async () => {
    expect((await call("{nope")).status).toBe(400);
    expect((await call({ ...base, kind: "pack5" })).status).toBe(422);
    expect((await call({ ...base, kind: "feasibility_instant", email: "nope" })).status).toBe(422);
    expect((await call({ kind: "feasibility_instant", email: "a@b.co" })).status).toBe(422);
  });
});
