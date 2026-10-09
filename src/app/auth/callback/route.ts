import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

/** Where confirmation and magic-link emails land: trade the code for a session, then continue into the portal. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/portal";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/portal";
  if (code) {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // The optional check from the Account page: following the emailed link proves the address.
      if (request.nextUrl.searchParams.get("verify") === "1" && data.user) {
        await supabaseAdmin()?.from("profiles").update({ email_verified_at: new Date().toISOString() }).eq("id", data.user.id);
      }
      return NextResponse.redirect(new URL(target, request.url));
    }
  }
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(target)}`, request.url));
}
