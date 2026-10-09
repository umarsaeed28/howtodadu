/**
 * Payments for the full feasibility report.
 *
 * One provider interface, chosen by PAYMENTS_PROVIDER:
 *   - "mock" (default): no money moves. The server issues a receipt for the address and nothing else.
 *     The browser's card fields are decoration: they never leave the page and are never stored.
 *   - "stripe" (later): create a Stripe Checkout Session for REPORT_PRICE_CENTS, redirect to it, and
 *     on return verify the session server-side before issuing the receipt. Nothing in this app ever
 *     touches a card number: Stripe's hosted page collects it.
 */

/** What one full report costs. Change here and the paywall, the receipt and the API follow. */
export const REPORT_PRICE_CENTS = 2900;

export type ProductId = "single" | "pack5";

/** The two things on sale: one report, or five reports plus the weekly newsletter. */
export const PRODUCTS: Record<ProductId, { id: ProductId; name: string; amountCents: number; credits: number; newsletter: boolean }> = {
  single: { id: "single", name: "One report", amountCents: REPORT_PRICE_CENTS, credits: 1, newsletter: false },
  pack5: { id: "pack5", name: "5 reports + weekly newsletter", amountCents: 9900, credits: 5, newsletter: true },
};

export function productOf(v: unknown): ProductId {
  return v === "pack5" ? "pack5" : "single";
}

export type PaymentProviderName = "mock" | "stripe";

export type Receipt = {
  id: string;
  address: string;
  product: ProductId;
  credits: number;
  amountCents: number;
  provider: PaymentProviderName;
  at: string;
};

/** `simulate` is for the mock only: "fail" exercises the declined path without any card data crossing the wire. */
export type CheckoutRequest = { address: string; product: ProductId; simulate?: "fail" };

export type CheckoutResult = { ok: true; receipt: Receipt } | { ok: false; error: string; redirect?: string };

export interface PaymentProvider {
  name: PaymentProviderName;
  startCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}

export const mockProvider: PaymentProvider = {
  name: "mock",
  async startCheckout({ address, product, simulate }) {
    if (simulate === "fail") return { ok: false, error: "card_declined" };
    const p = PRODUCTS[product];
    const id = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return { ok: true, receipt: { id, address, product: p.id, credits: p.credits, amountCents: p.amountCents, provider: "mock", at: new Date().toISOString() } };
  },
};

/** Reserved: the Stripe provider refuses until it is wired up, so a misconfigured deploy never silently unlocks reports. */
export const stripeProvider: PaymentProvider = {
  name: "stripe",
  async startCheckout() {
    return { ok: false, error: "stripe_not_configured" };
  },
};

export function paymentProviderName(env: Record<string, string | undefined> = process.env): PaymentProviderName {
  return env.PAYMENTS_PROVIDER === "stripe" ? "stripe" : "mock";
}

export function getPaymentProvider(env: Record<string, string | undefined> = process.env): PaymentProvider {
  return paymentProviderName(env) === "stripe" ? stripeProvider : mockProvider;
}

/** The address as the receipt names it: trimmed, single-spaced, at most 200 characters. Empty when unusable. */
export function cleanAddress(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 200) : "";
}
