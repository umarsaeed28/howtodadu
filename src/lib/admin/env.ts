/**
 * The admin's environments: which Supabase project each page reads. Each is a URL and secret key pair from the
 * environment; an environment without both is listed as not configured. The app's own connection
 * (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY) counts as "prod" when SUPABASE_URL_PROD is not set, so the
 * one existing project shows up without extra setup.
 */
export const ADMIN_ENVS = ["local", "dev", "prod"] as const;
export type AdminEnv = (typeof ADMIN_ENVS)[number];

export const ENV_LABELS: Record<AdminEnv, string> = { local: "Local", dev: "Dev", prod: "Prod" };

export interface EnvConnection {
  env: AdminEnv;
  url: string;
  key: string;
  /** The project host, safe to show (no key). */
  host: string;
}

export function envConnection(env: AdminEnv, e: Record<string, string | undefined> = process.env): EnvConnection | null {
  const suffix = env.toUpperCase();
  let url = e[`SUPABASE_URL_${suffix}`]?.trim();
  let key = e[`SUPABASE_SECRET_KEY_${suffix}`]?.trim();
  if (env === "prod" && (!url || !key)) {
    url = e.NEXT_PUBLIC_SUPABASE_URL?.trim();
    key = e.SUPABASE_SECRET_KEY?.trim();
  }
  if (!url || !key) return null;
  let host = url;
  try { host = new URL(url).host; } catch { /* keep the raw value */ }
  return { env, url, key, host };
}

export function availableEnvs(e: Record<string, string | undefined> = process.env): AdminEnv[] {
  return ADMIN_ENVS.filter((env) => envConnection(env, e) != null);
}

export const isAdminEnv = (v: unknown): v is AdminEnv => typeof v === "string" && (ADMIN_ENVS as readonly string[]).includes(v);

/** The environment to use when none is chosen or the chosen one is not configured: dev, then local, then prod. */
export function defaultEnv(e: Record<string, string | undefined> = process.env): AdminEnv | null {
  const avail = availableEnvs(e);
  for (const pref of ["dev", "local", "prod"] as const) if (avail.includes(pref)) return pref;
  return null;
}

export const ADMIN_ENV_COOKIE = "pencil_admin_env";
