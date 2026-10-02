import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email =
    body && typeof body === "object" && "email" in body
      ? String((body as { email: unknown }).email ?? "").trim()
      : "";

  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 422 });
  }

  const b = body as { kind?: unknown; name?: unknown; message?: unknown; source?: unknown };
  const kind = b.kind === "contact" ? "contact" : "newsletter";
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

  // TODO: also add newsletter sign-ups to the email provider (Resend / ConvertKit "Daily Deals" audience).
  console.log(`[subscribe] ${kind} signup:`, email);

  const db = supabaseAdmin();
  if (db) {
    const { error } = await db.from("signups").insert({
      email: email.slice(0, 320),
      kind,
      name: text(b.name, 200),
      message: text(b.message, 5000),
      source_path: text(b.source, 300),
    });
    if (error) {
      console.error("[subscribe] supabase insert failed", error.message);
      return Response.json({ ok: false, error: "write_failed" }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
