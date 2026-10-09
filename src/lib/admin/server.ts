import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/utils/supabase/admin";
import type { Viewer } from "@/lib/portal/server";
import { adminConfig } from "./auth";
import { ADMIN_COOKIE, verifySession, type AdminSession } from "./token";

/** The signed-in admin, from the session cookie. Null for everyone else. */
export async function currentAdmin(): Promise<AdminSession | null> {
  const c = adminConfig();
  if (!c.ok) return null;
  const jar = await cookies();
  return verifySession(jar.get(ADMIN_COOKIE)?.value, c.config.sessionSecret);
}

/** The admin, or a redirect to the admin login that comes back here afterwards. */
export async function requireAdmin(nextPath: string): Promise<Viewer> {
  const a = await currentAdmin();
  if (!a) redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  return { id: `admin:${a.u}`, email: process.env.PORTAL_ADMIN_EMAIL ?? "", name: a.u, role: "admin", gcId: null };
}

/**
 * The database for admin pages. The admin is not a Supabase user, so reads go through the secret key, which
 * bypasses row-level security; only admin pages behind requireAdmin() may call this.
 */
export function adminDb(): SupabaseClient {
  const db = supabaseAdmin();
  if (!db) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY).");
  return db;
}
