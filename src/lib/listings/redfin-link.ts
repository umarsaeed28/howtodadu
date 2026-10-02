/**
 * A link to the home on Redfin. The direct listing page when the source gave one; otherwise a web search for the address
 * limited to redfin.com, which lands on the listing in one click. We link out only: no Redfin data is fetched or scraped.
 */
export function redfinLink(address: string, listingUrl?: string | null): { href: string; direct: boolean } {
  if (listingUrl && /^https:\/\/(www\.)?redfin\.com\//i.test(listingUrl)) return { href: listingUrl, direct: true };
  const street = address.split(",")[0].trim();
  const zip = /\b98\d{3}\b/.exec(address)?.[0] ?? "";
  return { href: `https://www.google.com/search?q=${encodeURIComponent(`${street} Seattle WA ${zip} site:redfin.com`.replace(/\s+/g, " ").trim())}`, direct: false };
}
