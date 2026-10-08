import { describe, expect, it } from "vitest";
import { REPORT_PRICE_CENTS, cleanAddress, getPaymentProvider, paymentProviderName } from "./index";
import { POST } from "@/app/api/checkout/route";

describe("payments", () => {
  it("defaults to the mock provider and reserves stripe", () => {
    expect(paymentProviderName({})).toBe("mock");
    expect(paymentProviderName({ PAYMENTS_PROVIDER: "stripe" })).toBe("stripe");
    expect(paymentProviderName({ PAYMENTS_PROVIDER: "nonsense" })).toBe("mock");
    expect(getPaymentProvider({ PAYMENTS_PROVIDER: "stripe" }).name).toBe("stripe");
  });

  it("mock checkout issues a receipt for the address at the report price", async () => {
    const r = await getPaymentProvider({}).startCheckout({ address: "610 N 125th St", amountCents: REPORT_PRICE_CENTS });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.receipt).toMatchObject({ address: "610 N 125th St", amountCents: 2900, provider: "mock" });
    expect(r.receipt.id).toMatch(/^mock_/);
  });

  it("stripe refuses until it is configured", async () => {
    const r = await getPaymentProvider({ PAYMENTS_PROVIDER: "stripe" }).startCheckout({ address: "x", amountCents: 1 });
    expect(r).toEqual({ ok: false, error: "stripe_not_configured" });
  });

  it("cleans the address", () => {
    expect(cleanAddress("  610  N 125th\nSt ")).toBe("610 N 125th St");
    expect(cleanAddress(42)).toBe("");
  });
});

describe("POST /api/checkout", () => {
  const call = (body: unknown) => POST(new Request("http://x/api/checkout", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

  it("returns a mock receipt and ignores anything that looks like card data", async () => {
    const res = await call({ address: "610 N 125th St", cardNumber: "4242", cvc: "123" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.receipt).toMatchObject({ address: "610 N 125th St", amountCents: REPORT_PRICE_CENTS, provider: "mock" });
    expect(JSON.stringify(json)).not.toContain("4242");
  });

  it("rejects a missing address and bad JSON", async () => {
    expect((await call({})).status).toBe(422);
    expect((await call("{nope")).status).toBe(400);
  });
});
