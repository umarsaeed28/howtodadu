import { PREAPPROVED_PLANS } from "@/lib/preapproved-dadus";
import { EMAIL_RE, cleanAddress } from "@/lib/payments";
import { isPin } from "@/lib/parcel-context";
import { recordOrder } from "@/lib/server/orders";
import { currentViewer } from "@/lib/portal/server";
import { sendMail } from "@/lib/portal/notify";

export const runtime = "nodejs";

/**
 * A request for a pre-approved plan. Recorded as a plan_request order (no charge: each firm prices its own plan),
 * confirmed to the requester by email, and copied to Pencil.
 *
 * TODO(firm-routing): send the request to the partner firm (an email address per designer, or their intake form)
 * and record the referral (gc_partners/referrals equivalents for design firms) so the referral can be tracked.
 */
export async function POST(req: Request) {
  let b: { planId?: unknown; name?: unknown; email?: unknown; phone?: unknown; message?: unknown; pin?: unknown; address?: unknown };
  try {
    b = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const plan = PREAPPROVED_PLANS.find((p) => p.id === b.planId);
  if (!plan) return Response.json({ ok: false, error: "unknown_plan" }, { status: 422 });
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!name) return Response.json({ ok: false, error: "missing_name" }, { status: 422 });
  if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: "invalid_email" }, { status: 422 });
  const phone = typeof b.phone === "string" ? b.phone.trim().slice(0, 40) : "";
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 2000) : "";
  const pin = isPin(b.pin) ? b.pin : "unknown";
  const address = cleanAddress(b.address);
  const viewer = await currentViewer().catch(() => null);

  const order = await recordOrder({
    kind: "plan_request",
    email,
    parcelPin: pin,
    address,
    ownerId: viewer?.id ?? null,
    status: "pending",
    amountCents: 0,
    planId: plan.id,
    firm: plan.designer,
    data: { name, phone, message, plan: `${plan.name} (${plan.option})` },
  });

  const summary = `${plan.name} (${plan.option}) by ${plan.designer}\nFor: ${address || `parcel ${pin}`}\nFrom: ${name} <${email}>${phone ? `, ${phone}` : ""}\n${message ? `\n${message}\n` : ""}`;
  void sendMail({ to: [email], subject: `Pencil: your request for ${plan.name}`, text: `Thank you, ${name}. We sent your request to ${plan.designer}. They will reach out within 2 business days.\n\n${summary}` });
  const admin = process.env.PORTAL_ADMIN_EMAIL;
  if (admin) void sendMail({ to: [admin], subject: `Plan request: ${plan.name} → ${plan.designer}`, text: `${summary}\nOrder ${order.id}\n\nTODO: forward to the firm until routing is automated.` });

  return Response.json({ ok: true, firm: plan.designer, orderId: order.id });
}
