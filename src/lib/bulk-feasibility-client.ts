import {
  postBulkFeasibility,
  slimsFromBulkResponse,
  type BulkFeasibilityRow,
} from "./feasibility-bulk";
import type { DashboardPropertySlim } from "./dashboard-normalize";

const CHUNK_SIZE = 250;
const MAX_ADDRESSES = 5000;

export type BulkProgress = {
  completed: number;
  total: number;
  phase: string;
};

/**
 * Chunked POSTs to /api/feasibility/bulk (server enforces per-request limits).
 * Dedupes and caps at 5,000 addresses.
 */
export async function fetchBulkFeasibilityInChunks(
  addresses: string[],
  onProgress?: (p: BulkProgress) => void
): Promise<{ rows: BulkFeasibilityRow[]; merged: DashboardPropertySlim[] }> {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const a of addresses) {
    const t = a.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    list.push(t);
    if (list.length >= MAX_ADDRESSES) break;
  }

  const all: BulkFeasibilityRow[] = [];
  const chunks: string[][] = [];
  for (let i = 0; i < list.length; i += CHUNK_SIZE) {
    chunks.push(list.slice(i, i + CHUNK_SIZE));
  }

  let done = 0;
  for (const chunk of chunks) {
    onProgress?.({
      completed: done,
      total: list.length,
      phase: `Analyzing ${done + 1}–${Math.min(done + chunk.length, list.length)} of ${list.length}`,
    });
    const { rows } = await postBulkFeasibility(chunk);
    all.push(...rows);
    done += chunk.length;
  }

  onProgress?.({ completed: list.length, total: list.length, phase: "Done" });

  const merged = slimsFromBulkResponse(all);
  return { rows: all, merged };
}
