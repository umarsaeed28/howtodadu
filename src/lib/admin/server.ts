import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "@/lib/portal/server";
import { adminConfig } from "./auth";
import { ADMIN_COOKIE, verifySession, type AdminSession } from "./token";
import { ADMIN_ENV_COOKIE, availableEnvs, defaultEnv, envConnection, isAdminEnv, type AdminEnv } from "./env";

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

/** The environment the admin chose (cookie), or the default when none is chosen or it is not configured. */
export async function currentEnv(): Promise<AdminEnv | null> {
  const jar = await cookies();
  const chosen = jar.get(ADMIN_ENV_COOKIE)?.value;
  if (isAdminEnv(chosen) && availableEnvs().includes(chosen)) return chosen;
  return defaultEnv();
}

/** What the environment banner shows: the active environment, its host, and which ones can be chosen. */
export async function envState(): Promise<{ env: AdminEnv | null; host: string | null; available: AdminEnv[] }> {
  const env = await currentEnv();
  return { env, host: env ? envConnection(env)?.host ?? null : null, available: availableEnvs() };
}

const clients = new Map<string, SupabaseClient>();

/**
 * The database for admin pages, for one environment. The admin is not a Supabase user, so reads go through that
 * environment's secret key, which bypasses row-level security; only admin pages behind requireAdmin() may call this.
 */
export function adminDb(env: AdminEnv | null): SupabaseClient {
  const c = env ? envConnection(env) : null;
  if (!c) throw new Error("No admin environment is configured: set SUPABASE_URL_<ENV> and SUPABASE_SECRET_KEY_<ENV>.");
  let db = clients.get(c.url);
  if (!db) {
    db = createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false } });
    clients.set(c.url, db);
  }
  return db;
}
