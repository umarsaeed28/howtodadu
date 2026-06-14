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

  // TODO: wire to email provider (Resend / ConvertKit) — add the subscriber to
  // the "Daily Deals" audience here, e.g. await resend.contacts.create({ email, audienceId }).
  console.log("[subscribe] daily-deals signup:", email);

  return Response.json({ ok: true });
}
