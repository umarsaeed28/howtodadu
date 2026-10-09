/**
 * Formatting for the test-mode card fields, so they type like a real card form. Display only: the fields never
 * leave the page and nothing here validates a real card.
 */
export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | null;

export function cardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  return null;
}

/** "4111111111111111" → "4111 1111 1111 1111"; Amex groups 4-6-5. At most 19 digits. */
export function formatCardNumber(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 19);
  if (cardBrand(d) === "amex") return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(" ");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "1230" → "12 / 30". A lone first digit above 1 becomes a padded month ("4" → "04 / "). */
export function formatExpiry(raw: string, previous = ""): string {
  let d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`;
  // Deleting back over the separator removes the month's last digit, not just the slash.
  if (previous.endsWith(" / ") && raw.length < previous.length && d.length === 2) d = d.slice(0, 1);
  if (d.length > 2) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  if (d.length === 2 && raw.length >= previous.length) return `${d} / `;
  return d;
}

/** Three digits, four for Amex. */
export function formatCvc(raw: string, brand: CardBrand): string {
  return raw.replace(/\D/g, "").slice(0, brand === "amex" ? 4 : 3);
}

export const BRAND_LABEL: Record<Exclude<CardBrand, null>, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" };
