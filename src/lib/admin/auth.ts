/**
 * Admin credentials. Production reads ADMIN_USER and ADMIN_PASSWORD_HASH (scrypt, made with
 * `npx tsx scripts/admin-hash.ts`) and ADMIN_SESSION_SECRET from the environment, and refuses to run on the
 * development default. Development falls back to admin / admin!@#$ so the admin opens without setup.
 *
 * scrypt from node:crypto (no dependency): hash format "scrypt$<salt b64>$<hash b64>", N=16384, r=8, p=1, 64 bytes.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const DEV_ADMIN_USER = "admin";
export const DEV_ADMIN_PASSWORD = "admin!@#$";
const DEV_SESSION_SECRET = "pencil-dev-admin-session-secret-change-in-production";

const SCRYPT = { N: 16384, r: 8, p: 1, len: 64 };

export function hashPassword(password: string, salt = randomBytes(16)): string {
  const hash = scryptSync(password, salt, SCRYPT.len, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, saltB64, hashB64] = stored.split("$");
  if (kind !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const got = scryptSync(password, salt, expected.length, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export interface AdminConfig {
  user: string;
  passwordHash: string;
  sessionSecret: string;
  /** True when the development default is in use. Never true in production (config() refuses). */
  devDefault: boolean;
}

/**
 * The admin configuration for this environment, or an error message when production is missing it or is on the
 * default credentials.
 */
export function adminConfig(env: Record<string, string | undefined> = process.env): { ok: true; config: AdminConfig } | { ok: false; error: string } {
  const production = env.NODE_ENV === "production";
  const user = env.ADMIN_USER?.trim();
  const passwordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = env.ADMIN_SESSION_SECRET?.trim();
  if (user && passwordHash && sessionSecret) {
    if (production && verifyPassword(DEV_ADMIN_PASSWORD, passwordHash)) return { ok: false, error: "ADMIN_PASSWORD_HASH is the development default; set a real password." };
    return { ok: true, config: { user, passwordHash, sessionSecret, devDefault: false } };
  }
  if (production) return { ok: false, error: "Admin login is not configured: set ADMIN_USER, ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET." };
  return { ok: true, config: { user: user || DEV_ADMIN_USER, passwordHash: passwordHash || hashPassword(DEV_ADMIN_PASSWORD, Buffer.from("pencil-dev-salt-0")), sessionSecret: sessionSecret || DEV_SESSION_SECRET, devDefault: !passwordHash } };
}

/** True when the user name and password match this environment's admin. */
export function checkCredentials(user: string, password: string, env: Record<string, string | undefined> = process.env): boolean {
  const c = adminConfig(env);
  if (!c.ok) return false;
  if (user.trim() !== c.config.user) return false;
  return verifyPassword(password, c.config.passwordHash);
}
