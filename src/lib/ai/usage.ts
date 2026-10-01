/**
 * Token accounting. A run meter counts every model call in one assessment; the daily counter enforces the
 * day's budget across all runs. The daily counter uses Upstash Redis (REST) when configured, otherwise memory
 * (per server instance, fine for local and a single region).
 */
export interface Usage {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
}

export class RunMeter {
  readonly calls: Usage[] = [];
  constructor(readonly limit: number) {}
  add(u: Usage) {
    this.calls.push(u);
  }
  get total(): number {
    return this.calls.reduce((s, u) => s + u.input + u.output, 0);
  }
  /** Tokens still available in this run. */
  get left(): number {
    return Math.max(0, this.limit - this.total);
  }
  /** Calls since an index, for per-node notes. */
  since(i: number): { input: number; output: number; cacheRead: number } {
    return this.calls.slice(i).reduce((s, u) => ({ input: s.input + u.input, output: s.output + u.output, cacheRead: s.cacheRead + u.cacheRead }), { input: 0, output: 0, cacheRead: 0 });
  }
}

const day = () => new Date().toISOString().slice(0, 10);
let memDay = day();
let memUsed = 0;

async function upstash(cmd: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(3000) });
  return ((await res.json()) as { result?: unknown }).result;
}

export const dailyBudget = {
  async used(): Promise<number> {
    try {
      const r = await upstash(["GET", `ai:tokens:${day()}`]);
      if (r !== undefined) return Number(r ?? 0);
    } catch {
      /* fall through to memory */
    }
    if (memDay !== day()) [memDay, memUsed] = [day(), 0];
    return memUsed;
  },
  async add(n: number): Promise<void> {
    if (n <= 0) return;
    try {
      const key = `ai:tokens:${day()}`;
      const r = await upstash(["INCRBY", key, n]);
      if (r !== undefined) {
        await upstash(["EXPIRE", key, 60 * 60 * 48]);
        return;
      }
    } catch {
      /* fall through */
    }
    if (memDay !== day()) [memDay, memUsed] = [day(), 0];
    memUsed += n;
  },
};
