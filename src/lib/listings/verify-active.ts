import type { RawListing } from "./provider";

/**
 * "Truly active": DealMachine's MLS status can lag by days (610 N 125th St was pending on Redfin while DealMachine still
 * said Active, with no pending flag and no freshness date). So every home that would reach the map is checked against
 * Redfin's current Active list for its ZIP (HasData; Redfin's "active" status excludes pending and contingent). A home
 * stays only if Redfin shows it active too. Pure matching here; the HasData calls are injected.
 */

/** "610 N 125TH ST, Seattle, WA 98133" and "610 N 125th St" -> "610 N 125TH ST". Unit numbers and suffix spelling folded. */
export function streetKey(address: string): string {
  return address
    .split(",")[0]
    .toUpperCase()
    .replace(/\s+(#|APT|UNIT)\s*\S+$/, "")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/(\d+)(ST|ND|RD|TH)\b/g, "$1$2")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ActiveOnRedfin {
  street: string;
  url: string | null;
  status: string;
}

export interface Verified {
  /** Active on both: these go on the map. */
  kept: RawListing[];
  /** DealMachine said active, Redfin did not list it as active (pending, contingent, off market, or not found). */
  dropped: { listing: RawListing; reason: string }[];
}

/** Keep the candidates Redfin also lists as active, and give them Redfin's direct link. */
export function verifyActive(candidates: RawListing[], activeByZip: Map<string, ActiveOnRedfin[]>): Verified {
  const kept: RawListing[] = [];
  const dropped: Verified["dropped"] = [];
  for (const l of candidates) {
    const list = activeByZip.get(l.zip);
    if (!list) {
      dropped.push({ listing: l, reason: `Redfin's active list for ${l.zip} could not be read` });
      continue;
    }
    const hit = list.find((r) => r.street === streetKey(l.address));
    if (!hit) {
      dropped.push({ listing: l, reason: "not in Redfin's active listings (pending, contingent, withdrawn or sold)" });
      continue;
    }
    if (!/^(active|for sale|new|price change|back on market)/i.test(hit.status)) {
      dropped.push({ listing: l, reason: `Redfin status: ${hit.status}` });
      continue;
    }
    kept.push({ ...l, listingUrl: l.listingUrl ?? hit.url ?? undefined });
  }
  return { kept, dropped };
}
