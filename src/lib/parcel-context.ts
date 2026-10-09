/**
 * The parcel a visitor is working on, so no journey asks for the address twice. Order of truth: the
 * ?parcel= in the URL, then this browser's last parcel. Signed-in users also have it on their orders and
 * projects (server side). Browser storage can be blocked; then the URL alone carries it.
 */
export type ParcelRef = { pin: string; address: string };

const KEY = "pencil.parcel.v1";

export const isPin = (v: unknown): v is string => typeof v === "string" && /^\d{10}$/.test(v);

export function readParcel(search?: URLSearchParams): ParcelRef | null {
  const fromUrl = search?.get("parcel");
  const stored = readStored();
  if (isPin(fromUrl)) return stored?.pin === fromUrl ? stored : { pin: fromUrl, address: "" };
  return stored;
}

function readStored(): ParcelRef | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ParcelRef>;
    return isPin(v.pin) ? { pin: v.pin, address: typeof v.address === "string" ? v.address : "" } : null;
  } catch {
    return null;
  }
}

export function saveParcel(p: ParcelRef): void {
  if (!isPin(p.pin)) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ pin: p.pin, address: p.address, at: new Date().toISOString() }));
  } catch {
    /* storage blocked: the URL still carries the parcel */
  }
}

/** A path with ?parcel= added (or replaced). */
export function withParcel(path: string, pin: string | null | undefined): string {
  if (!isPin(pin)) return path;
  const [base, q = ""] = path.split("?");
  const sp = new URLSearchParams(q);
  sp.set("parcel", pin);
  return `${base}?${sp.toString()}`;
}

/** "610 N 125TH ST, Seattle, WA" → "610 N 125th St". For display; city records come in capitals. */
export function prettyAddress(a: string): string {
  const street = a.replace(/,\s*Seattle,\s*WA.*$/i, "").replace(/\s+\d{5}(-\d{4})?$/, "").trim();
  return street.replace(/[A-Za-z]+/g, (w) => (/^(N|S|E|W|NE|NW|SE|SW)$/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).replace(/(\d)(St|Nd|Rd|Th)\b/g, (_, d, x) => d + x.toLowerCase());
}
