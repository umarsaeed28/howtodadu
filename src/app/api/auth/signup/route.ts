import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PER_HOUR = 5;

/**
 * Creates an account with no confirmation email: the user is created already confirmed, and the browser signs
 * in straight after. Verifying the email is optional and lives on the Account page.
 * Abuse guard: at most PER_HOUR sign-ups an hour from one IP address, counted in the rate_limits table.
 */
export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Send a name, email and password." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name) return Response.json({ ok: false, error: "Tell us your name." }, { status: 422 });
  if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 422 });
  if (password.length < 8) return Response.json({ ok: false, error: "Use a password of at least 8 characters." }, { status: 422 });

  const admin = supabaseAdmin();
  if (!admin) return Response.json({ ok: false, error: "Accounts are not available right now." }, { status: 503 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const key = `signup:${ip}`;
  const { data: row } = await admin.from("rate_limits").select("count").eq("key", key).eq("window_start", hour.toISOString()).maybeSingle();
  if ((row?.count ?? 0) >= PER_HOUR) return Response.json({ ok: false, error: "Too many sign-ups from this network. Try again in an hour." }, { status: 429 });
  await admin.from("rate_limits").upsert({ key, window_start: hour.toISOString(), count: (row?.count ?? 0) + 1 });

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return Response.json({ ok: false, error: taken ? "An account with this email already exists. Sign in instead." : "Could not create the account. Try again." }, { status: taken ? 409 : 500 });
  }
  return Response.json({ ok: true });
}
