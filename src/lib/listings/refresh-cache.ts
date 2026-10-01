import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Listings are pulled from the source at most once every 12 hours. */
export const REFRESH_MS = 12 * 60 * 60 * 1000;

interface Entry<T> {
  fetchedAt: number;
  value: T;
}

/**
 * A 12-hour cache that survives restarts (file in the OS temp dir) and shares one in-flight pull,
 * so concurrent requests never trigger two upstream calls. If a pull fails, the last good value is served.
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
      try {
        return await refresh();
      } catch (err) {
        if (mem) return mem; // stale beats nothing
        throw err;
      }
    },
  };
}
