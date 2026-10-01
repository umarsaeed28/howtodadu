import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Archival memory: long-lived, queried on demand. Holds finished assessments so a listing is not re-analysed
 * until its facts change or 12 hours pass. (Working memory is the in-flight `RunState` in the orchestrator.)
 */
const FILE = join(tmpdir(), "pencil-assessments.json");
const TTL_MS = 12 * 60 * 60 * 1000;

type Store = Record<string, { at: number; value: unknown }>;

function load(): Store {
  try {
    return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as Store) : {};
  } catch {
    return {};
  }
}

export const archival = {
  get<T>(key: string): T | null {
    const e = load()[key];
    return e && Date.now() - e.at < TTL_MS ? (e.value as T) : null;
  },
  set(key: string, value: unknown) {
    const s = load();
    s[key] = { at: Date.now(), value };
    try {
      writeFileSync(FILE, JSON.stringify(s));
    } catch {
      /* read-only filesystem: skip caching */
    }
  },
};
