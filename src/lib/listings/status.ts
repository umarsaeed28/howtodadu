/**
 * Only homes that can be bought today: an active listing. Pending, contingent, under contract, sold, closed, expired,
 * withdrawn, off market and coming soon are all out, whatever spelling the source uses.
 */
export function isForSale(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
  if (!s) return false;
  if (/pending|contingen|under contract|sale pending|sold|closed|expired|withdrawn|cancel|off market|coming soon|inactive/.test(s)) return false;
  return /^(active|for sale|new|price change|back on market)/.test(s);
}

/** Pending or contingent: under contract, not for sale, but shown with a tag (users can hide them). */
export function isPending(status: string | null | undefined): boolean {
  return /pending|contingen|under contract/.test((status ?? "").toLowerCase());
}
