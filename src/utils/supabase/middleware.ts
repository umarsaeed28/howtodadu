import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refreshes the Supabase auth session on a request and returns the response carrying any updated cookies.
 * It never blocks a page: without config, without a session cookie, or if Supabase is unreachable, the request
 * passes through unchanged.
 */
export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Nothing to refresh: skip the network call so ordinary visitors pay nothing.
  if (!supabaseUrl || !supabaseKey) return supabaseResponse;
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return supabaseResponse;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  try {
    // Reading the user is what refreshes an expiring session token.
    await supabase.auth.getUser();
  } catch {
    // Supabase unreachable: serve the page anyway.
  }

  return supabaseResponse;
};

/** The helper as named in the Supabase quickstart. */
export const createClient = updateSession;
