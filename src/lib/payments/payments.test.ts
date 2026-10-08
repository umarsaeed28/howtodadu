import { describe, expect, it } from "vitest";
import { PRODUCTS, REPORT_PRICE_CENTS, cleanAddress, getPaymentProvider, paymentProviderName, productOf } from "./index";
import { POST } from "@/app/api/checkout/route";

describe("payments", () => {
  it("defaults to the mock provider and reserves stripe", () => {
    expect(paymentProviderName({})).toBe("mock");
    expect(paymentProviderName({ PAYMENTS_PROVIDER: "stripe" })).toBe("stripe");
    expect(paymentProviderName({ PAYMENTS_PROVIDER: "nonsense" })).toBe("mock");
    expect(getPaymentProvider({ PAYMENTS_PROVIDER: "stripe" }).name).toBe("stripe");
  });

  it("mock checkout issues a receipt for the address at the report price", async () => {
    const r = await getPaymentProvider({}).startCheckout({ address: "610 N 125th St", product: "single" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.receipt).toMatchObject({ address: "610 N 125th St", product: "single", credits: 1, amountCents: 2900, provider: "mock" });
    expect(r.receipt.id).toMatch(/^mock_/);
  });

  it("the five-pack is $30 for 5 credits with the newsletter", async () => {
    expect(PRODUCTS.pack5).toMatchObject({ amountCents: 3000, credits: 5, newsletter: true });
    expect(productOf("pack5")).toBe("pack5");
    expect(productOf("anything")).toBe("single");
    const r = await getPaymentProvider({}).startCheckout({ address: "x", product: "pack5" });
    expect(r.ok && r.receipt.credits).toBe(5);
  });

  it("mock declines on request so the failure path can be walked", async () => {
    const r = await getPaymentProvider({}).startCheckout({ address: "x", product: "single", simulate: "fail" });
    expect(r).toEqual({ ok: false, error: "card_declined" });
  });

  it("stripe refuses until it is configured", async () => {
    const r = await getPaymentProvider({ PAYMENTS_PROVIDER: "stripe" }).startCheckout({ address: "x", product: "single" });
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
    expect(json.receipt).toMatchObject({ address: "610 N 125th St", product: "single", amountCents: REPORT_PRICE_CENTS, provider: "mock" });
    expect(JSON.stringify(json)).not.toContain("4242");
  });

  it("sells the five-pack and answers 402 to a simulated decline", async () => {
    const pack = await (await call({ address: "A St", product: "pack5" })).json();
    expect(pack.receipt).toMatchObject({ product: "pack5", credits: 5, amountCents: 3000 });
    const declined = await call({ address: "A St", product: "single", simulate: "fail" });
    expect(declined.status).toBe(402);
    expect(await declined.json()).toEqual({ ok: false, error: "card_declined" });
  });

  it("rejects a missing address and bad JSON", async () => {
    expect((await call({})).status).toBe(422);
    expect((await call("{nope")).status).toBe(400);
  });
});
