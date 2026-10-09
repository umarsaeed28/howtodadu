import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin/token";

/**
 * Next.js 16 "proxy" (formerly middleware). Two jobs:
 *  - /admin and /api/admin: the admin's own session cookie (src/lib/admin), checked here on every request so no
 *    admin page or API route is reachable without it; the pages check again with requireAdmin().
 *  - everything else: keep Supabase auth sessions fresh and send portal visitors without a session to sign in.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  if (isAdminPage || isAdminApi) {
    const open = pathname === "/admin/login" || pathname === "/api/admin/login";
    if (open) return NextResponse.next();
    const secret = process.env.ADMIN_SESSION_SECRET?.trim() || (process.env.NODE_ENV === "production" ? "" : "pencil-dev-admin-session-secret-change-in-production");
    const session = await verifySession(request.cookies.get(ADMIN_COOKIE)?.value, secret);
    if (session) return NextResponse.next();
    if (isAdminApi) return NextResponse.json({ ok: false, error: "admin_sign_in_required" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  // Pages and the admin API: skip other API routes, Next internals, and static files so nothing else is touched.
  matcher: ["/api/admin/:path*", "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|pdf|csv)$).*)"],
};
