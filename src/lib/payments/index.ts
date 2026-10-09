/**
 * Payments for every Pencil product (feasibility instant / reviewed, custom plan, permit). Prices come from
 * src/lib/pricing.ts.
 *
 * One provider interface, chosen by PAYMENTS_PROVIDER:
 *   - "mock" (default): no money moves. The browser's card fields are decoration: they never leave the page and
 *     are never stored. A charge always succeeds unless the request asks the mock to decline (simulate: "fail").
 *   - "stripe": TODO(payment). Create a Stripe Checkout Session for the product's price with
 *     metadata { order_id, kind }, redirect to it, and mark the order paid from the webhook
 *     (src/app/api/stripe/webhook/route.ts). Nothing in this app ever touches a card number.
 */
import { PRODUCTS, isProductKind, type ProductKind } from "@/lib/pricing";

export { PRODUCTS, isProductKind, type ProductKind };

export type PaymentProviderName = "mock" | "stripe";

/** What the checkout route sends a provider: the product and who is buying. Never card data. */
export type ChargeRequest = { kind: ProductKind; email: string; orderId: string; simulate?: "fail" };

export type ChargeResult = { ok: true; paymentId: string; provider: PaymentProviderName } | { ok: false; error: "card_declined" | "stripe_not_configured" | "unavailable"; redirect?: string };

export interface PaymentProvider {
  name: PaymentProviderName;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/** What the browser gets back after a successful checkout. */
export type Receipt = {
  orderId: string;
  /** Lets a guest open their order without an account. */
  token: string;
  kind: ProductKind;
  amountCents: number;
  provider: PaymentProviderName;
  at: string;
  /** Reviewed feasibility: the review date. Custom plan: the day plans are ready. */
  dueDate: string | null;
  /** Custom plan: the Monday its drafting week starts. */
  queueWeek: string | null;
  /** Custom plan: true when this week was full and the order went to a later week. */
  booked: boolean;
};

export const mockProvider: PaymentProvider = {
  name: "mock",
  async charge({ simulate }) {
    if (simulate === "fail") return { ok: false, error: "card_declined" };
    return { ok: true, paymentId: `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, provider: "mock" };
  },
};

/** TODO(payment): Stripe Checkout. Refuses until wired, so a misconfigured deploy never marks an order paid. */
export const stripeProvider: PaymentProvider = {
  name: "stripe",
  async charge() {
    return { ok: false, error: "stripe_not_configured" };
  },
};

export function paymentProviderName(env: Record<string, string | undefined> = process.env): PaymentProviderName {
  return env.PAYMENTS_PROVIDER === "stripe" ? "stripe" : "mock";
}

export function getPaymentProvider(env: Record<string, string | undefined> = process.env): PaymentProvider {
  return paymentProviderName(env) === "stripe" ? stripeProvider : mockProvider;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, single-spaced, at most 200 characters. Empty when unusable. */
export function cleanAddress(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 200) : "";
}
