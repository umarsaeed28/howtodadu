import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/** Next.js 16 "proxy" (formerly middleware): keeps Supabase auth sessions fresh. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Pages only: skip API routes, Next internals, and static files so nothing else is touched.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|pdf|csv)$).*)"],
};
