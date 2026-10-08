import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** Where confirmation and magic-link emails land: trade the code for a session, then continue into the portal. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/portal";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/portal";
  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(target)}`, request.url));
}
