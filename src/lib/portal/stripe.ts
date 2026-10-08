import "server-only";
import Stripe from "stripe";
import { PERMIT_PACKAGE } from "./types";

/**
 * Stripe Checkout for the permit package. Live when PAYMENTS_PROVIDER=stripe and STRIPE_SECRET_KEY is set;
 * otherwise the portal offers a test-mode button that records the payment without charging anyone, which
 * matches the mock paywall on the public report.
 */
export function stripeEnabled(): boolean {
  return process.env.PAYMENTS_PROVIDER === "stripe" && !!process.env.STRIPE_SECRET_KEY;
}

function stripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/** A hosted Checkout page for one project's permit package. Returns the URL to send the client to. */
export async function createPermitCheckout(opts: { projectId: string; address: string; email: string; origin: string }): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: opts.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PERMIT_PACKAGE.feeCents,
          product_data: { name: "Pencil permit package", description: `Design options, permit drawings and submittal for ${opts.address}` },
        },
      },
    ],
    metadata: { project_id: opts.projectId },
    success_url: `${opts.origin}/portal/projects/${opts.projectId}?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/portal/projects/${opts.projectId}?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}

/** Verifies a Checkout session on return. The project id comes from the session's metadata, never the URL. */
export async function verifyPermitCheckout(sessionId: string): Promise<{ paid: boolean; projectId: string | null; paymentId: string | null }> {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  return { paid: s.payment_status === "paid", projectId: s.metadata?.project_id ?? null, paymentId: typeof s.payment_intent === "string" ? s.payment_intent : s.id };
}

/** Reads a webhook event, checking its signature with STRIPE_WEBHOOK_SECRET. */
export function parseWebhook(rawBody: string, signature: string): Stripe.Event {
  return stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
}
