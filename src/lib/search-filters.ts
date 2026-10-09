/**
 * The search the home page and the map share: up to five Seattle ZIP codes and a price range, carried in the
 * /search URL (?zip=98103,98107&min=600000&max=1200000) so a search from the home page lands on the map ready.
 */

export const MAX_ZIPS = 5;

/** ZIP codes inside Seattle city limits (partial ones included). Seattle only for now. */
export const SEATTLE_ZIPS = [
  "98101", "98102", "98103", "98104", "98105", "98106", "98107", "98108", "98109", "98112",
  "98115", "98116", "98117", "98118", "98119", "98121", "98122", "98125", "98126", "98133",
  "98134", "98136", "98144", "98146", "98154", "98164", "98174", "98177", "98178", "98195", "98199",
] as const;
const SEATTLE = new Set<string>(SEATTLE_ZIPS);

export const isSeattleZip = (z: string) => SEATTLE.has(z);

/** Price steps for the min and max pickers. 0 means no limit. */
export const PRICE_STEPS = [0, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_250_000, 1_500_000, 1_750_000, 2_000_000, 2_500_000, 3_000_000] as const;

export const priceLabel = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 0).replace(/0$/, "")}M` : `$${Math.round(n / 1000)}k`);

export type ParsedZips = { zips: string[]; rejected: string[]; overLimit: boolean };

/** Splits typed text into Seattle ZIPs, keeping order, dropping repeats, at most MAX_ZIPS (after `existing`). */
export function parseZips(raw: string, existing: string[] = []): ParsedZips {
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const zips = [...existing];
  const rejected: string[] = [];
  let overLimit = false;
  for (const t of tokens) {
    if (!isSeattleZip(t)) {
      rejected.push(t);
      continue;
    }
    if (zips.includes(t)) continue;
    if (zips.length >= MAX_ZIPS) {
      overLimit = true;
      continue;
    }
    zips.push(t);
  }
  return { zips, rejected, overLimit };
}

export type SearchFilters = { zips: string[]; min: number; max: number };

/** Reads ?zip, ?min and ?max. Bad values are dropped; min and max are swapped when reversed. 0 = no limit. */
export function readSearchParams(p: URLSearchParams): SearchFilters {
  const zips = parseZips(p.get("zip") ?? "").zips;
  const num = (k: string) => {
    const n = Math.round(Number(p.get(k) ?? 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  let min = num("min");
  let max = num("max");
  if (min && max && min > max) [min, max] = [max, min];
  return { zips, min, max };
}

export function searchHref(f: Partial<SearchFilters>): string {
  const q = new URLSearchParams();
  if (f.zips?.length) q.set("zip", f.zips.slice(0, MAX_ZIPS).join(","));
  if (f.min) q.set("min", String(f.min));
  if (f.max) q.set("max", String(f.max));
  const s = q.toString();
  return `/search${s ? `?${s.replace(/%2C/g, ",")}` : ""}`;
}

/** Does a price fall in the range? 0 on either side means open-ended. */
export const inPriceRange = (price: number, min: number, max: number) => (!min || price >= min) && (!max || price <= max);
