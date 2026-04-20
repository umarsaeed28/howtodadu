const STORAGE_KEY = "howtodadu.recentAddresses";
const MAX_RECENT = 8;

function safeParse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x) => typeof x === "string" && x.trim().length > 0);
  } catch {
    return [];
  }
}

export function loadRecentAddresses(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function pushRecentAddress(address: string): void {
  const t = address.trim();
  if (t.length < 6) return;
  if (typeof window === "undefined") return;
  try {
    const prev = loadRecentAddresses();
    const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(
      0,
      MAX_RECENT
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
