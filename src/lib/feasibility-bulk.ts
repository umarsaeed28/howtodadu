import type { DashboardPropertySlim } from "./dashboard-normalize";

export type BulkFeasibilityRow = {
  address: string;
  ok: boolean;
  error?: string;
  /** Server-computed dashboard row (slim, no heavy GIS payload) */
  row?: DashboardPropertySlim;
  /** Legacy fields when `row` omitted (older clients) */
  confidence?: number;
  confidenceLabel?: string;
  pin?: string | null;
  lotSqft?: number | null;
  zoning?: string | null;
};

export async function postBulkFeasibility(
  addresses: string[]
): Promise<{ rows: BulkFeasibilityRow[] }> {
  const res = await fetch("/api/feasibility/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    rows?: BulkFeasibilityRow[];
  };
  if (!res.ok) {
    throw new Error(body.error || "Bulk feasibility failed");
  }
  if (!body.rows) {
    throw new Error("Invalid response from bulk feasibility");
  }
  return { rows: body.rows };
}

/** Extract slim rows from API responses. */
export function slimsFromBulkResponse(rows: BulkFeasibilityRow[]): DashboardPropertySlim[] {
  const out: DashboardPropertySlim[] = [];
  for (const br of rows) {
    if (br.row) out.push(br.row);
  }
  return out;
}

/** Merge property lists without duplicate addresses (last wins). */
export function mergeDashboardSlims(
  existing: DashboardPropertySlim[],
  incoming: DashboardPropertySlim[],
  maxTotal: number
): DashboardPropertySlim[] {
  const map = new Map<string, DashboardPropertySlim>();
  for (const r of existing) map.set(r.id, r);
  for (const r of incoming) map.set(r.id, r);
  return Array.from(map.values()).slice(0, maxTotal);
}
