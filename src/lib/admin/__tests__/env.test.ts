import { describe, expect, it } from "vitest";
import { availableEnvs, defaultEnv, envConnection } from "../env";

describe("admin environments", () => {
  it("counts the app's own connection as prod, and lists only configured environments", () => {
    const e = { NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "k" };
    expect(availableEnvs(e)).toEqual(["prod"]);
    expect(envConnection("prod", e)?.host).toBe("abc.supabase.co");
    expect(envConnection("dev", e)).toBeNull();
    expect(defaultEnv(e)).toBe("prod");
  });
  it("explicit per-environment variables win, and dev is preferred when it exists", () => {
    const e = { NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "k", SUPABASE_URL_PROD: "https://live.supabase.co", SUPABASE_SECRET_KEY_PROD: "p", SUPABASE_URL_DEV: "https://dev.supabase.co", SUPABASE_SECRET_KEY_DEV: "d", SUPABASE_URL_LOCAL: "http://127.0.0.1:54321", SUPABASE_SECRET_KEY_LOCAL: "l" };
    expect(availableEnvs(e)).toEqual(["local", "dev", "prod"]);
    expect(envConnection("prod", e)?.host).toBe("live.supabase.co");
    expect(envConnection("local", e)?.host).toBe("127.0.0.1:54321");
    expect(defaultEnv(e)).toBe("dev");
  });
  it("nothing configured means no environment", () => {
    expect(availableEnvs({})).toEqual([]);
    expect(defaultEnv({})).toBeNull();
  });
});
