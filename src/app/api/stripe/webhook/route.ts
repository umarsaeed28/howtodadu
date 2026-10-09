import { parseWebhook, stripeEnabled } from "@/lib/portal/stripe";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { notifyProject } from "@/lib/portal/server";
import { recordPurchase } from "@/lib/server/purchases";
import { PERMIT_PACKAGE } from "@/lib/portal/types";

export const runtime = "nodejs";

/**
 * Stripe's confirmation that a permit package was paid. The return URL marks it paid too; this catches a client
 * that closed the tab. Signature-checked, idempotent, writes with the secret key because no user is signed in.
 */
export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return new Response("Stripe not configured", { status: 503 });
  const sig = req.headers.get("stripe-signature") ?? "";
  let event;
  try {
    event = parseWebhook(await req.text(), sig);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });
  const session = event.data.object;
  const projectId = session.metadata?.project_id;
  if (!projectId || session.payment_status !== "paid") return Response.json({ received: true });

  const admin = supabaseAdmin();
  if (!admin) return new Response("Database unavailable", { status: 503 });
  const { data: pkg } = await admin.from("permit_packages").select("paid_at").eq("project_id", projectId).maybeSingle();
  if (pkg?.paid_at) return Response.json({ received: true });
  const now = new Date().toISOString();
  const paymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
  await admin.from("permit_packages").update({ payment_id: paymentId, paid_at: now, status: "kickoff", updated_at: now }).eq("project_id", projectId);
  const { data: owner } = await admin.from("projects").select("owner_id, address").eq("id", projectId).maybeSingle();
  void recordPurchase({ kind: "permit", product: "permit_package", amountCents: session.amount_total ?? PERMIT_PACKAGE.feeCents, email: session.customer_details?.email ?? session.customer_email ?? null, userId: owner?.owner_id ?? null, projectId, provider: "stripe", paymentId, meta: { address: owner?.address ?? null, stripe_event_id: event.id } });
  const { data: p } = await admin.from("projects").select("stage").eq("id", projectId).maybeSingle();
  await admin.from("projects").update({ stage: "permit", latest_update: "Permit package paid; kickoff scheduled", updated_at: now }).eq("id", projectId);
  await admin.from("activity_log").insert([
    { project_id: projectId, actor_id: null, kind: "payment", message: "Permit package paid; kickoff scheduled", meta: { payment_id: paymentId } },
    { project_id: projectId, actor_id: null, kind: "stage_change", message: "Moved to Architecture & permit", meta: { from: p?.stage ?? "feasibility", to: "permit" } },
  ]);
  await notifyProject(projectId, "Permit package started", "Thank you. Your permit package is paid and kickoff is next.", { owner: true, admins: true });
  return Response.json({ received: true });
}
