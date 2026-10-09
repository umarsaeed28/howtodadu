/**
 * The admin session token: a signed, expiring statement that the admin logged in. Web Crypto only, so the same
 * code verifies it in the proxy (every /admin request) and in server components. No dependency on Supabase.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
 */
export const ADMIN_COOKIE = "pencil_admin";
export const ADMIN_SESSION_HOURS = 12;

export interface AdminSession {
  /** The admin user name. */
  u: string;
  /** Expiry, ms since the epoch. */
  exp: number;
  /** Issued at, ms. */
  iat: number;
}

const enc = new TextEncoder();

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signSession(session: AdminSession, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(session)));
  const sig = b64url(await hmac(secret, body));
  return `${body}.${sig}`;
}

/** The session the token carries, or null when the signature is wrong, the token is malformed, or it has expired. */
export async function verifySession(token: string | undefined | null, secret: string, now = Date.now()): Promise<AdminSession | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot), sig = token.slice(dot + 1);
  const expected = b64url(await hmac(secret, body));
  if (expected.length !== sig.length) return null;
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as AdminSession;
    if (typeof s.u !== "string" || typeof s.exp !== "number" || s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}

export function newSession(user: string, now = Date.now()): AdminSession {
  return { u: user, iat: now, exp: now + ADMIN_SESSION_HOURS * 3_600_000 };
}
