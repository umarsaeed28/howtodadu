import { ADMIN_COOKIE, verifySession, type AdminSession } from "./token";

/**
 * Lot intelligence is admin-only: the map, the feasibility tool, listing and invest pages, and every API that
 * returns scored lot data. One list, read by the proxy (every request) and by each API route and page (again, on
 * the server), so hiding a link is never the only protection. The public gets the members teaser instead.
 * Web Crypto only: runs in the proxy and in route handlers alike.
 */

/** Pages that show scored lot data. A prefix matches the path itself and everything under it. */
export const GATED_PAGES = ["/search", "/feasibility", "/listing", "/invest", "/saved"] as const;

/** API routes that return lot data. `/api/invest/contact` (a contact form) stays public. */
export const GATED_APIS = [
  "/api/map-listings",
  "/api/offmarket",
  "/api/lot-shapes",
  "/api/lot",
  "/api/lots",
  "/api/feasibility",
  "/api/parcel",
  "/api/assessment",
  "/api/alleys",
  "/api/invest/top",
] as const;

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export const isGatedPage = (path: string): boolean => GATED_PAGES.some((p) => under(path, p));
export const isGatedApi = (path: string): boolean => GATED_APIS.some((p) => under(path, p));

/** The secret admin sessions are signed with: the configured one, or the development default outside production. */
export function adminSessionSecret(env: Record<string, string | undefined> = process.env): string {
  return env.ADMIN_SESSION_SECRET?.trim() || (env.NODE_ENV === "production" ? "" : "pencil-dev-admin-session-secret-change-in-production");
}

/** The admin session in a Cookie header, or null. */
export async function adminFromCookieHeader(cookieHeader: string | null | undefined): Promise<AdminSession | null> {
  if (!cookieHeader) return null;
  const pair = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  const value = pair ? decodeURIComponent(pair.slice(ADMIN_COOKIE.length + 1)) : null;
  return verifySession(value, adminSessionSecret());
}

/**
 * For the top of every gated API route: null when the request carries an admin session, otherwise the 401 to
 * return. `const denied = await adminOnly(req); if (denied) return denied;`
 */
export async function adminOnly(req: Request): Promise<Response | null> {
  if (await adminFromCookieHeader(req.headers.get("cookie"))) return null;
  return Response.json({ ok: false, error: "members_only", message: "Lot intelligence is coming to members." }, { status: 401 });
}
