import { EMAIL_RE, cleanAddress, getPaymentProvider, isProductKind, type Receipt } from "@/lib/payments";
import { PRODUCTS, REVIEW_BUSINESS_DAYS, addBusinessDays } from "@/lib/pricing";
import { slotFor, ymd } from "@/lib/queue";
import { isPin } from "@/lib/parcel-context";
import { customPlanCounts, recordOrder } from "@/lib/server/orders";
import { recordPurchase } from "@/lib/server/purchases";
import { currentViewer } from "@/lib/portal/server";
import { sendMail, portalUrl } from "@/lib/portal/notify";

export const runtime = "nodejs";

/**
 * Checkout for every product. The body carries the product, the buyer's email, the parcel and (mock only) a
 * decline flag; card details are never sent here. The permit service needs a signed-in account (its intake
 * stores files); the others accept guests, whose orders are claimed when they sign up with the same email.
 *
 * TODO(payment): with Stripe, this route creates a pending order and a Checkout Session, and returns its URL;
 * the webhook marks the order paid. Today the mock provider answers at once and the order is recorded paid.
 */
export async function POST(req: Request) {
  let b: { kind?: unknown; email?: unknown; pin?: unknown; address?: unknown; simulate?: unknown; meta?: unknown };
  try {
    b = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!isProductKind(b.kind)) return Response.json({ ok: false, error: "unknown_product" }, { status: 422 });
  const kind = b.kind;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: "invalid_email" }, { status: 422 });
  const pin = isPin(b.pin) ? b.pin : "";
  const address = cleanAddress(b.address);
  if (!pin && !address) return Response.json({ ok: false, error: "missing_parcel" }, { status: 422 });

  const viewer = await currentViewer().catch(() => null);
  if (kind === "permit" && !viewer) return Response.json({ ok: false, error: "sign_in_required" }, { status: 401 });

  const product = PRODUCTS[kind];
  const now = new Date();
  let dueDate: string | null = null;
  let queueWeek: string | null = null;
  let booked = false;
  if (kind === "feasibility_reviewed") dueDate = ymd(addBusinessDays(now, REVIEW_BUSINESS_DAYS));
  if (kind === "custom_plan") {
    // Counted again here, at the moment of purchase, so two buyers cannot both take the last slot of a week.
    const slot = slotFor(now, await customPlanCounts(now));
    queueWeek = slot.week;
    dueDate = slot.readyBy;
    booked = slot.booked;
  }

  const provider = getPaymentProvider();
  const orderRef = `ord_${now.getTime().toString(36)}`;
  const charge = await provider.charge({ kind, email, orderId: orderRef, simulate: b.simulate === "fail" ? "fail" : undefined });
  if (!charge.ok) return Response.json({ ok: false, error: charge.error, redirect: charge.redirect }, { status: charge.error === "card_declined" ? 402 : 503 });

  const meta = b.meta && typeof b.meta === "object" ? (b.meta as Record<string, unknown>) : {};
  const order = await recordOrder({
    kind,
    email,
    parcelPin: pin || "unknown",
    address,
    ownerId: viewer?.id ?? null,
    status: "paid",
    amountCents: product.amountCents,
    provider: charge.provider,
    paymentId: charge.paymentId,
    dueDate,
    queueWeek,
    planId: typeof meta.planId === "string" ? meta.planId.slice(0, 60) : null,
    data: meta,
  });

  const receipt: Receipt = { orderId: order.id, token: order.token, kind, amountCents: product.amountCents, provider: charge.provider, at: now.toISOString(), dueDate, queueWeek, booked };
  console.log(`[checkout] ${charge.provider} ${kind} order ${order.id}${order.stored ? "" : " (not stored)"}`);
  // The money ledger the admin's revenue page reads: one row per payment.
  void recordPurchase({ kind: "order", product: kind, amountCents: product.amountCents, email, userId: viewer?.id ?? null, orderId: order.stored ? order.id : null, provider: charge.provider, paymentId: charge.paymentId, meta: { address, pin } });

  // The buyer's receipt email, with a link back to their purchase.
  // TODO: attach the feasibility PDF (render it on the server) instead of linking to the report.
  // Feasibility reports are read in the portal (the public /feasibility tool is admin-only).
  const link = kind.startsWith("feasibility") ? portalUrl("/portal/reports") : portalUrl("/dashboard");
  void sendMail({
    to: [email],
    subject: `Pencil: ${product.name} for ${address || `parcel ${pin}`}`,
    text: `Thank you. Your ${product.name} is confirmed.${dueDate ? `\nExpected by ${dueDate}.` : ""}\n\nOpen it any time: ${link}\n\nOrder ${order.id}`,
  });

  return Response.json({ ok: true, receipt });
}
