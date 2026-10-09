import { describe, expect, it } from "vitest";
import { adminConfig, checkCredentials, DEV_ADMIN_PASSWORD, DEV_ADMIN_USER, hashPassword, verifyPassword } from "../auth";
import { ADMIN_SESSION_HOURS, newSession, signSession, verifySession } from "../token";

describe("admin passwords", () => {
  it("hashes with scrypt and verifies only the right password", () => {
    const h = hashPassword("correct horse battery staple");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery staple", h)).toBe(true);
    expect(verifyPassword("correct horse battery stapl", h)).toBe(false);
    expect(verifyPassword("anything", "not-a-hash")).toBe(false);
  });
  it("development uses admin / admin!@#$ when nothing is configured", () => {
    const env = { NODE_ENV: "development" };
    expect(checkCredentials(DEV_ADMIN_USER, DEV_ADMIN_PASSWORD, env)).toBe(true);
    expect(checkCredentials(DEV_ADMIN_USER, "admin", env)).toBe(false);
    expect(checkCredentials("root", DEV_ADMIN_PASSWORD, env)).toBe(false);
    const c = adminConfig(env);
    expect(c.ok && c.config.devDefault).toBe(true);
  });
  it("production refuses to run without credentials or on the development default", () => {
    expect(adminConfig({ NODE_ENV: "production" }).ok).toBe(false);
    const devHash = hashPassword(DEV_ADMIN_PASSWORD);
    expect(adminConfig({ NODE_ENV: "production", ADMIN_USER: "admin", ADMIN_PASSWORD_HASH: devHash, ADMIN_SESSION_SECRET: "s" }).ok).toBe(false);
    const real = adminConfig({ NODE_ENV: "production", ADMIN_USER: "ops", ADMIN_PASSWORD_HASH: hashPassword("a long real password"), ADMIN_SESSION_SECRET: "secret" });
    expect(real.ok && !real.config.devDefault).toBe(true);
    expect(checkCredentials("ops", "a long real password", { NODE_ENV: "production", ADMIN_USER: "ops", ADMIN_PASSWORD_HASH: hashPassword("a long real password"), ADMIN_SESSION_SECRET: "secret" })).toBe(true);
  });
});

describe("admin session token", () => {
  const secret = "test-secret";
  it("round-trips, expires after 12 hours, and rejects tampering and other secrets", async () => {
    const now = Date.UTC(2026, 9, 9, 12, 0, 0);
    const t = await signSession(newSession("admin", now), secret);
    const s = await verifySession(t, secret, now + 60_000);
    expect(s?.u).toBe("admin");
    expect(s?.exp).toBe(now + ADMIN_SESSION_HOURS * 3_600_000);
    expect(await verifySession(t, secret, now + ADMIN_SESSION_HOURS * 3_600_000 + 1)).toBeNull();
    expect(await verifySession(t, "other-secret", now)).toBeNull();
    expect(await verifySession(t.slice(0, -2) + "xx", secret, now)).toBeNull();
    expect(await verifySession("garbage", secret, now)).toBeNull();
    expect(await verifySession(undefined, secret, now)).toBeNull();
  });
});
