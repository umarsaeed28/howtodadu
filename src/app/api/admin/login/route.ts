import { NextResponse } from "next/server";
import { adminConfig, checkCredentials } from "@/lib/admin/auth";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, newSession, signSession } from "@/lib/admin/token";

export const runtime = "nodejs";

/** Login attempts per IP in the window; the rest are refused with 429. In memory per instance. */
const LIMIT = 5, WINDOW_MS = 15 * 60_000;
const attempts = new Map<string, number[]>();
function tooMany(ip: string, now = Date.now()): boolean {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(ip, recent);
  return recent.length >= LIMIT;
}
function recordAttempt(ip: string, now = Date.now()) {
  attempts.set(ip, [...(attempts.get(ip) ?? []), now]);
}

/** POST { user, password, next? } (JSON or a form). Sets the admin session cookie for 12 hours. */
export async function POST(req: Request) {
  const c = adminConfig();
  if (!c.ok) return NextResponse.json({ ok: false, error: c.error }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooMany(ip)) return NextResponse.json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  const ct = req.headers.get("content-type") ?? "";
  let user = "", password = "", next = "/admin";
  if (ct.includes("application/json")) {
    const b = (await req.json().catch(() => ({}))) as { user?: unknown; password?: unknown; next?: unknown };
    user = typeof b.user === "string" ? b.user : "";
    password = typeof b.password === "string" ? b.password : "";
    if (typeof b.next === "string") next = b.next;
  } else {
    const fd = await req.formData();
    user = String(fd.get("user") ?? "");
    password = String(fd.get("password") ?? "");
    next = String(fd.get("next") ?? "/admin");
  }
  // Only same-site admin paths may be the return target.
  if (!next.startsWith("/admin") || next.startsWith("//")) next = "/admin";

  if (!checkCredentials(user, password)) {
    recordAttempt(ip);
    console.warn(`[admin] failed login for "${user.slice(0, 40)}" from ${ip}`);
    return NextResponse.json({ ok: false, error: "Wrong user name or password." }, { status: 401 });
  }
  const token = await signSession(newSession(user.trim()), c.config.sessionSecret);
  console.log(`[admin] login ${user.trim()} from ${ip}`);
  const res = ct.includes("application/json") ? NextResponse.json({ ok: true, next }) : NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  return res;
}
