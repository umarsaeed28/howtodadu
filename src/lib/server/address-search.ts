import "server-only";

/**
 * Seattle address autocomplete with two providers:
 *   - Google Places Autocomplete (New), when GOOGLE_MAPS_API_KEY is set (server only; never sent to the browser).
 *     Typing in one box is one billing session: the browser sends a session token, and the Place Details call
 *     that resolves coordinates reuses it.
 *   - Esri's World Geocoder suggest (no key), the fallback when Google is not configured, errors, or finds nothing.
 * Both are restricted to Seattle and return house addresses only (a number first), formatted the same way.
 */
export interface AddressSuggestion {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
}
type Internal = AddressSuggestion & { ref: string; provider: "google" | "esri" };

const SEATTLE = { south: 47.48, west: -122.46, north: 47.74, east: -122.22 };
const HOUSE_RE = /^\d+(-\d+)?[A-Z]?\s/i;

/* ── Google ── */
const G_AUTOCOMPLETE = "https://places.googleapis.com/v1/places:autocomplete";
const G_DETAILS = (id: string) => `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;

/** "5519 12th Ave NE, Seattle, WA 98105, USA" or "..., Seattle, WA, USA" → parts. */
export function parseUsAddress(text: string): { street: string; city: string; state: string; zip: string } | null {
  const parts = text.split(",").map((p) => p.trim()).filter((p) => p && !/^(USA|United States)$/i.test(p));
  if (parts.length < 3) return null;
  const street = parts[0];
  const city = parts[1];
  const m = parts.slice(2).join(" ").match(/^(WA|Washington)\b\s*(\d{5})?/i);
  if (!m) return null;
  return { street, city, state: "WA", zip: m[2] ?? (/^\d{5}$/.test(parts[3] ?? "") ? parts[3] : "") };
}

async function googleSuggest(q: string, key: string, session?: string): Promise<Internal[]> {
  const res = await fetch(G_AUTOCOMPLETE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text" },
    body: JSON.stringify({
      input: q,
      includedRegionCodes: ["us"],
      locationRestriction: { rectangle: { low: { latitude: SEATTLE.south, longitude: SEATTLE.west }, high: { latitude: SEATTLE.north, longitude: SEATTLE.east } } },
      ...(session ? { sessionToken: session } : {}),
    }),
    signal: AbortSignal.timeout(3500),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = (await res.json()) as { suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[] };
  const out: Internal[] = [];
  for (const s of data.suggestions ?? []) {
    const p = s.placePrediction;
    const parsed = p?.text?.text ? parseUsAddress(p.text.text) : null;
    if (!p?.placeId || !parsed || !/seattle/i.test(parsed.city) || !HOUSE_RE.test(parsed.street)) continue;
    const formatted = `${parsed.street}, Seattle, WA${parsed.zip ? ` ${parsed.zip}` : ""}`;
    if (!out.some((o) => o.formatted === formatted)) out.push({ formatted, street: parsed.street, city: "Seattle", state: "WA", zip: parsed.zip, lat: null, lng: null, ref: p.placeId, provider: "google" });
  }
  return out.slice(0, 6);
}

async function googleResolve(s: Internal, key: string, session?: string): Promise<AddressSuggestion> {
  const url = `${G_DETAILS(s.ref)}${session ? `?sessionToken=${encodeURIComponent(session)}` : ""}`;
  const res = await fetch(url, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location,formattedAddress" }, signal: AbortSignal.timeout(3500) });
  if (!res.ok) return strip(s);
  const d = (await res.json()) as { location?: { latitude?: number; longitude?: number }; formattedAddress?: string };
  const parsed = d.formattedAddress ? parseUsAddress(d.formattedAddress) : null;
  const zip = parsed?.zip || s.zip;
  return { ...strip(s), formatted: `${s.street}, Seattle, WA${zip ? ` ${zip}` : ""}`, zip, lat: d.location?.latitude ?? null, lng: d.location?.longitude ?? null };
}

/* ── Esri ── */
const E_SUGGEST = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";
const E_FIND = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

async function esriSuggest(q: string): Promise<Internal[]> {
  const params = new URLSearchParams({
    text: q,
    searchExtent: `${SEATTLE.west},${SEATTLE.south},${SEATTLE.east},${SEATTLE.north}`,
    location: "-122.335,47.62",
    maxSuggestions: "10",
    countryCode: "USA",
    category: "Address,Point Address,Street Address,Subaddress",
    f: "json",
  });
  const res = await fetch(`${E_SUGGEST}?${params}`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`esri ${res.status}`);
  const data = (await res.json()) as { suggestions?: { text: string; magicKey: string }[] };
  const out: Internal[] = [];
  for (const s of data.suggestions ?? []) {
    const p = parseUsAddress(s.text);
    if (!p || !/seattle/i.test(p.city) || !HOUSE_RE.test(p.street)) continue;
    const formatted = `${p.street}, Seattle, WA${p.zip ? ` ${p.zip}` : ""}`;
    if (!out.some((o) => o.formatted === formatted)) out.push({ formatted, street: p.street, city: "Seattle", state: "WA", zip: p.zip, lat: null, lng: null, ref: s.magicKey, provider: "esri" });
  }
  return out.slice(0, 6);
}

async function esriResolve(s: Internal): Promise<AddressSuggestion> {
  const params = new URLSearchParams({ magicKey: s.ref, singleLine: s.formatted, maxLocations: "1", f: "json" });
  try {
    const res = await fetch(`${E_FIND}?${params}`, { signal: AbortSignal.timeout(4000) });
    const c = res.ok ? ((await res.json()) as { candidates?: { location: { x: number; y: number } }[] }).candidates?.[0] : undefined;
    return c ? { ...strip(s), lat: c.location.y, lng: c.location.x } : strip(s);
  } catch {
    return strip(s);
  }
}

const strip = ({ formatted, street, city, state, zip, lat, lng }: Internal | AddressSuggestion): AddressSuggestion => ({ formatted, street, city, state, zip, lat, lng });

/** Cleans what was typed: single spaces, no trailing ", Seattle" fragments that confuse both providers mid-word. */
export function normalizeQuery(q: string): string {
  return q.replace(/\s+/g, " ").replace(/,\s*$/, "").trim().slice(0, 120);
}

export type SearchResult = { provider: "google" | "esri"; suggestions: AddressSuggestion[] };

/** Suggestions for a typed address: Google when configured, Esri otherwise or when Google fails or comes back empty. */
export async function searchAddresses(raw: string, opts: { resolve?: boolean; session?: string; env?: Record<string, string | undefined> } = {}): Promise<SearchResult> {
  const q = normalizeQuery(raw);
  if (q.length < 2) return { provider: "esri", suggestions: [] };
  const key = (opts.env ?? process.env).GOOGLE_MAPS_API_KEY;
  let list: Internal[] = [];
  let provider: "google" | "esri" = "esri";
  if (key) {
    try {
      list = await googleSuggest(q, key, opts.session);
      provider = "google";
    } catch (e) {
      console.warn("[address-search] Google failed, using Esri:", e instanceof Error ? e.message : e);
    }
  }
  if (!list.length) {
    try {
      list = await esriSuggest(q);
      provider = "esri";
    } catch {
      list = [];
    }
  }
  if (!opts.resolve || !list[0]) return { provider, suggestions: list.map(strip) };
  const first = list[0].provider === "google" && key ? await googleResolve(list[0], key, opts.session) : await esriResolve(list[0]);
  return { provider, suggestions: [first, ...list.slice(1).map(strip)] };
}
