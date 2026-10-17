import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin/token";
import { adminSessionSecret, isGatedApi, isGatedPage } from "@/lib/admin/gate";

/**
 * Next.js 16 "proxy" (formerly middleware). Three jobs:
 *  - /admin and /api/admin: the admin's own session cookie (src/lib/admin), checked here on every request so no
 *    admin page or API route is reachable without it; the pages check again with requireAdmin().
 *  - lot intelligence (src/lib/admin/gate.ts): the map, feasibility, listing and invest pages show non-admins the
 *    members teaser at the same URL, and their APIs answer 401. The pages and routes check again on the server.
 *  - everything else: keep Supabase auth sessions fresh and send portal visitors without a session to sign in.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const admin = async () => verifySession(request.cookies.get(ADMIN_COOKIE)?.value, adminSessionSecret());

  if (isAdminPage || isAdminApi) {
    const open = pathname === "/admin/login" || pathname === "/api/admin/login";
    if (open) return NextResponse.next();
    if (await admin()) return NextResponse.next();
    if (isAdminApi) return NextResponse.json({ ok: false, error: "admin_sign_in_required" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (isGatedApi(pathname)) {
    if (await admin()) return NextResponse.next();
    return NextResponse.json({ ok: false, error: "members_only", message: "Lot intelligence is coming to members." }, { status: 401 });
  }

  if (isGatedPage(pathname) && !(await admin())) {
    // The teaser renders in place of the page; the query (an address, a tier) comes along to prefill the sign-up.
    const url = request.nextUrl.clone();
    url.pathname = "/members";
    url.searchParams.set("from", pathname);
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  return updateSession(request);
}

export const config = {
  // Pages, the admin API and the gated APIs: other API routes, Next internals and static files are not touched.
  // Literal, because Next reads it at build time; proxy.test.ts checks it lists every GATED_APIS entry.
  matcher: [
    "/api/admin/:path*",
    "/api/map-listings", "/api/map-listings/:path*",
    "/api/offmarket", "/api/offmarket/:path*",
    "/api/lot-shapes", "/api/lot-shapes/:path*",
    "/api/lot", "/api/lot/:path*",
    "/api/lots", "/api/lots/:path*",
    "/api/feasibility", "/api/feasibility/:path*",
    "/api/parcel", "/api/parcel/:path*",
    "/api/assessment", "/api/assessment/:path*",
    "/api/alleys", "/api/alleys/:path*",
    "/api/invest/top", "/api/invest/top/:path*",
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|pdf|csv)$).*)",
  ],
};
