import { describe, expect, it, vi } from "vitest";
import { createCache } from "./refresh-cache";

describe("createCache without Supabase", () => {
  it("pulls once, then serves the cached value", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const pull = vi.fn(async () => ({ n: 1 }));
    const cache = createCache(`test-${Date.now()}-${Math.random()}`, pull);
    const a = await cache.get();
    const b = await cache.get();
    expect(a.value).toEqual({ n: 1 });
    expect(b.fetchedAt).toBe(a.fetchedAt);
    expect(pull).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("serves the last good value when a forced pull fails", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    let fail = false;
    const cache = createCache(`test-${Date.now()}-${Math.random()}`, async () => {
      if (fail) throw new Error("upstream down");
      return "ok";
    });
    await cache.get();
    fail = true;
    expect((await cache.get(true)).value).toBe("ok");
    vi.unstubAllEnvs();
  });
});
