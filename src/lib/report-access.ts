/**
 * Whether this browser has unlocked full feasibility reports. Two steps: an email once (every report), then a payment
 * per address. Storage can be blocked (private windows, strict settings): then access lasts for the page's lifetime only.
 */
const KEY = "pencil.reportAccess.v1";
const PAID_KEY = "pencil.reportPaid.v1";

export function reportAccessEmail(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { email?: unknown };
    return typeof v.email === "string" && v.email.includes("@") ? v.email : null;
  } catch {
    return null;
  }
}

export function hasReportAccess(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { email?: unknown };
    return typeof v.email === "string" && v.email.includes("@");
  } catch {
    return false;
  }
}

export function grantReportAccess(email: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ email, at: new Date().toISOString() }));
  } catch {
    /* storage blocked: the caller keeps access in state for this page */
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PaidReport = { address: string; receiptId: string; at: string };

/** The address as the paid list keys it: case and spacing do not matter. */
export function paidAddressKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function readPaid(): PaidReport[] {
  try {
    const raw = window.localStorage.getItem(PAID_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((p): p is PaidReport => !!p && typeof p === "object" && typeof (p as PaidReport).address === "string") : [];
  } catch {
    return [];
  }
}

export function hasReportPayment(address: string): boolean {
  const key = paidAddressKey(address);
  return readPaid().some((p) => p.address === key);
}

export function grantReportPayment(address: string, receipt: { id: string; at?: string }): void {
  const key = paidAddressKey(address);
  try {
    const rest = readPaid().filter((p) => p.address !== key);
    rest.push({ address: key, receiptId: receipt.id, at: receipt.at ?? new Date().toISOString() });
    window.localStorage.setItem(PAID_KEY, JSON.stringify(rest));
  } catch {
    /* storage blocked: the caller keeps access in state for this page */
  }
}

/** Prepaid reports from the five-pack: each new address opened spends one instead of showing the paywall. */
const CREDITS_KEY = "pencil.reportCredits.v1";

export function reportCreditsLeft(): number {
  try {
    const raw = window.localStorage.getItem(CREDITS_KEY);
    if (!raw) return 0;
    const v = JSON.parse(raw) as { credits?: unknown };
    return typeof v.credits === "number" && v.credits > 0 ? Math.floor(v.credits) : 0;
  } catch {
    return 0;
  }
}

export function grantReportCredits(n: number, receipt: { id: string }): void {
  try {
    window.localStorage.setItem(CREDITS_KEY, JSON.stringify({ credits: reportCreditsLeft() + n, receiptId: receipt.id, at: new Date().toISOString() }));
  } catch {
    /* storage blocked */
  }
}

/** Spends one credit on this address and marks it paid. False when there is no credit to spend (storage blocked counts as none). */
export function spendReportCredit(address: string): boolean {
  if (hasReportPayment(address)) return true;
  const left = reportCreditsLeft();
  if (left < 1) return false;
  try {
    window.localStorage.setItem(CREDITS_KEY, JSON.stringify({ credits: left - 1, at: new Date().toISOString() }));
  } catch {
    return false;
  }
  grantReportPayment(address, { id: "credit" });
  return true;
}
