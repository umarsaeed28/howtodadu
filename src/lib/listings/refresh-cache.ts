import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { supabaseAdmin } from "@/utils/supabase/admin";

/** Listings are pulled from the source at most once every 12 hours. */
export const REFRESH_MS = 12 * 60 * 60 * 1000;

interface Entry<T> {
  fetchedAt: number;
  value: T;
}

/**
 * A 12-hour cache that survives restarts and shares one in-flight pull, so concurrent requests never trigger two
 * upstream calls. If a pull fails, the last good value is served. Stored in Supabase (`listing_cache`) when it is
 * configured, so every serverless instance shares one copy; otherwise in a file in the OS temp dir.
 */
export function createCache<T>(name: string, pull: () => Promise<T>) {
  const file = join(tmpdir(), `pencil-${name}.json`);
  let mem: Entry<T> | null = null;
  let inflight: Promise<Entry<T>> | null = null;

  const fromDisk = (): Entry<T> | null => {
    try {
      return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Entry<T>) : null;
    } catch {
      return null;
    }
  };

  /** The shared copy in Supabase, or null when it is not configured, missing or unreachable. */
  const fromDb = async (): Promise<Entry<T> | null> => {
    const db = supabaseAdmin();
    if (!db) return null;
    try {
      const { data, error } = await db.from("listing_cache").select("value, fetched_at").eq("key", name).maybeSingle();
      if (error || !data) return null;
      return { fetchedAt: new Date(data.fetched_at as string).getTime(), value: data.value as T };
    } catch {
      return null;
    }
  };
  const toDb = async (e: Entry<T>) => {
    const db = supabaseAdmin();
    if (!db) return;
    try {
      const { error } = await db.from("listing_cache").upsert({ key: name, value: e.value, fetched_at: new Date(e.fetchedAt).toISOString() });
      if (error) console.warn(`[cache] ${name}: supabase write failed`, error.message);
    } catch {
      /* the memory and file copies still work */
    }
  };

  async function refresh(): Promise<Entry<T>> {
    inflight ??= pull()
      .then((value) => {
        const e = { fetchedAt: Date.now(), value };
        mem = e;
        try {
          writeFileSync(file, JSON.stringify(e));
        } catch {
          /* read-only filesystem: memory cache still works */
        }
        void toDb(e);
        return e;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  return {
    /** The value and when it was pulled. Pulls first if nothing is cached or the cache is over 12 hours old. */
    async get(force = false): Promise<{ value: T; fetchedAt: number }> {
      mem ??= fromDisk();
      if (!force && mem && Date.now() - mem.fetchedAt < REFRESH_MS) return mem;
      // Another instance may already have pulled: use the shared copy before going upstream.
      if (!force) {
        const shared = await fromDb();
        if (shared && (!mem || shared.fetchedAt > mem.fetchedAt)) mem = shared;
        if (mem && Date.now() - mem.fetchedAt < REFRESH_MS) return mem;
      }
      try {
        return await refresh();
      } catch (err) {
        if (mem) return mem; // stale beats nothing
        throw err;
      }
    },
  };
}
