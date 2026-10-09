import { NextResponse } from "next/server";
import { ADMIN_ENV_COOKIE, availableEnvs, isAdminEnv } from "@/lib/admin/env";

export const runtime = "nodejs";

/** POST form { env, next }: picks the environment the admin pages read. Gated by the proxy (admin session). */
export async function POST(req: Request) {
  const fd = await req.formData();
  const env = String(fd.get("env") ?? "");
  let next = String(fd.get("next") ?? "/admin");
  if (!next.startsWith("/admin") || next.startsWith("//")) next = "/admin";
  if (!isAdminEnv(env) || !availableEnvs().includes(env)) return NextResponse.json({ ok: false, error: "That environment is not configured." }, { status: 422 });
  console.log(`[admin] environment -> ${env}`);
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(ADMIN_ENV_COOKIE, env, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin", maxAge: 30 * 24 * 3600 });
  return res;
}
