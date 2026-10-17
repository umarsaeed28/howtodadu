import "server-only";
import { currentAdmin, currentEnv } from "./server";
import type { AdminEnv } from "./env";

/** For admin API routes: the admin's name and chosen environment, or a 401 to return. Runs after the proxy's check. */
export async function adminContext(): Promise<{ ok: true; actor: string; env: AdminEnv | null } | { ok: false; res: Response }> {
  const a = await currentAdmin();
  if (!a) return { ok: false, res: Response.json({ ok: false, error: "admin_sign_in_required" }, { status: 401 }) };
  return { ok: true, actor: a.u, env: await currentEnv() };
}

export const errorJson = (e: unknown, status = 500) => Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status });
