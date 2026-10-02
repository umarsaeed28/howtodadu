import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { streetKey } from "./address-key";

/**
 * Statuses we know better than the feed (data/listing-status.json): a home seen pending on Redfin while DealMachine
 * still says Active. Read on every request, so an edit takes effect on the next deploy with no new pull.
 */
export interface StatusOverride {
  status: "pending" | "contingent";
  note: string;
}

const FILE = join(process.cwd(), "data", "listing-status.json");

export function statusOverrides(): Map<string, StatusOverride> {
  const out = new Map<string, StatusOverride>();
  if (!existsSync(FILE)) return out;
  try {
    const j = JSON.parse(readFileSync(FILE, "utf8")) as { entries?: { address: string; zip?: string; status: string; note?: string }[] };
    for (const e of j.entries ?? []) {
      if (e.status !== "pending" && e.status !== "contingent") continue;
      out.set(`${streetKey(e.address)}|${e.zip ?? ""}`, { status: e.status, note: e.note ?? "" });
    }
  } catch {
    /* a bad edit to the file must not take the map down */
  }
  return out;
}

/** The override for a listing, matched by street address and ZIP (or address alone when the entry has no ZIP). */
export function overrideFor(map: Map<string, StatusOverride>, address: string, zip: string): StatusOverride | null {
  const k = streetKey(address);
  return map.get(`${k}|${zip}`) ?? map.get(`${k}|`) ?? null;
}
