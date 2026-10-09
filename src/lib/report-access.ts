/**
 * What this browser has bought, so a report stays open on reload and journeys know the buyer's email.
 * Orders are keyed by parcel PIN (or the address when there is no PIN). Storage can be blocked (private windows,
 * strict settings): then access lasts for the page's lifetime only. Signed-in buyers also see orders on /dashboard.
 */
export type OwnedOrder = { orderId: string; token: string; kind: string; key: string; at: string; dueDate?: string | null };

const ORDERS_KEY = "pencil.orders.v1";
const EMAIL_KEY = "pencil.email.v1";
/** Reports bought before the $200/$600 tiers ($29 single or the 5-pack): still honored. */
const LEGACY_PAID_KEY = "pencil.reportPaid.v1";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A PIN as is; an address lower-cased with single spaces. */
export function orderKey(pinOrAddress: string): string {
  return /^\d{10}$/.test(pinOrAddress) ? pinOrAddress : pinOrAddress.trim().toLowerCase().replace(/\s+/g, " ");
}

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function ordersFor(...keys: (string | null | undefined)[]): OwnedOrder[] {
  const want = new Set(keys.filter((k): k is string => !!k).map(orderKey));
  return read<OwnedOrder>(ORDERS_KEY).filter((o) => o && typeof o.key === "string" && want.has(o.key));
}

/** True when either tier of the feasibility report was bought for this parcel (or, for old purchases, this address). */
export function hasFeasibilityAccess(pin: string | null | undefined, address: string): boolean {
  if (ordersFor(pin, address).some((o) => o.kind.startsWith("feasibility"))) return true;
  const legacy = orderKey(address);
  return read<{ address?: string }>(LEGACY_PAID_KEY).some((p) => p?.address === legacy);
}

export function rememberOrder(o: OwnedOrder): void {
  try {
    const rest = read<OwnedOrder>(ORDERS_KEY).filter((x) => x.orderId !== o.orderId);
    rest.push({ ...o, key: orderKey(o.key) });
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(rest.slice(-50)));
  } catch {
    /* storage blocked: the caller keeps access in state for this page */
  }
}

export function rememberEmail(email: string): void {
  try {
    window.localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* storage blocked */
  }
}

export function lastEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}
