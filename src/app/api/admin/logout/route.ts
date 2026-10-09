import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin/token";

export const runtime = "nodejs";

/** Clears the admin session and returns to the admin login. */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
