import { supabaseAdmin } from "@/utils/supabase/admin";
import { EMAIL_RE } from "@/lib/payments";
import { sendMail } from "@/lib/portal/notify";
import { getOpportunity } from "@/lib/server/invest";

export const runtime = "nodejs";

/**
 * "Talk to an agent about this property": recorded as a contact sign-up and sent to Pencil's broker, Umar
 * (INVEST_AGENT_EMAIL, else PORTAL_ADMIN_EMAIL). The visitor gets a copy.
 */
export async function POST(req: Request) {
  let b: { listingId?: unknown; name?: unknown; email?: unknown; phone?: unknown; message?: unknown };
  try {
    b = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(b.name, 120);
  const email = str(b.email, 320).toLowerCase();
  const phone = str(b.phone, 40);
  const message = str(b.message, 2000);
  if (!name) return Response.json({ ok: false, error: "missing_name" }, { status: 422 });
  if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: "invalid_email" }, { status: 422 });
  const found = typeof b.listingId === "string" ? await getOpportunity(b.listingId).catch(() => null) : null;
  const o = found?.opportunity;
  const property = o ? `${o.street}, ${o.zip} (listing ${o.id}, $${o.price.toLocaleString("en-US")})` : "a listing no longer in the feed";

  const db = supabaseAdmin();
  if (db) {
    const { error } = await db.from("signups").insert({ email, kind: "contact", name, message: `[Invest] ${property}\n${phone ? `Phone: ${phone}\n` : ""}${message}`, source_path: o ? `/invest/${o.id}` : "/invest" });
    if (error) console.error("[invest/contact] signup insert failed", error.message);
  }
  const agent = process.env.INVEST_AGENT_EMAIL || process.env.PORTAL_ADMIN_EMAIL;
  const text = `${name} <${email}>${phone ? `, ${phone}` : ""} asked about ${property}.\n\n${message || "(no message)"}`;
  if (agent) void sendMail({ to: [agent], subject: `Invest inquiry: ${o?.street ?? "a listing"}`, text });
  void sendMail({ to: [email], subject: "Pencil: we got your question", text: `Thank you, ${name}. Umar, Pencil's licensed broker, will reach out about ${o?.street ?? "the property"} within one business day.\n\n${message}` });
  return Response.json({ ok: true });
}
