import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geocode?q=12004 5th
 * Seattle address autocomplete. One ArcGIS "suggest" call limited to Seattle's extent (about 100 ms), so it keeps up
 * with typing. Suggestions carry no coordinates; pass `resolve=1` to also geocode the top suggestion (the map needs it).
 * Response shape: [{ formatted, street, city, state, zip, lat, lng }], lat/lng null unless resolved.
 */
const SUGGEST_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";
const FIND_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

/** Seattle city limits, with a small margin. */
const SEATTLE_EXTENT = "-122.46,47.48,-122.22,47.74";
const SEATTLE_CENTER = "-122.335,47.62";

export interface GeocodeSuggestion {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
}

// Typing repeats the same prefixes; a small in-memory cache keeps those instant.
const cache = new Map<string, { at: number; value: GeocodeSuggestion[] }>();
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 1000;

/** "12004 5th Ave NE, Seattle, WA, 98125, USA" -> parts. */
function parse(text: string, magicKey: string): (GeocodeSuggestion & { magicKey: string }) | null {
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  const [street, city, state, zip] = parts;
  if (!/seattle/i.test(city) || !/^(WA|Washington)$/i.test(state)) return null;
  // A house address ("12004 5th Ave NE", "3920 B S Juneau St"), not a bare street like "47th Ave SW".
  if (!/^\d+(-\d+)?[A-Z]?\s/i.test(street)) return null;
  const z = /^\d{5}$/.test(zip ?? "") ? zip : "";
  return { formatted: `${street}, Seattle, WA${z ? ` ${z}` : ""}`, street, city: "Seattle", state: "WA", zip: z, lat: null, lng: null, magicKey };
}

async function suggest(q: string): Promise<(GeocodeSuggestion & { magicKey: string })[]> {
  const params = new URLSearchParams({
    text: q,
    searchExtent: SEATTLE_EXTENT,
    location: SEATTLE_CENTER,
    maxSuggestions: "8",
    countryCode: "USA",
    category: "Address,Point Address,Street Address,Subaddress",
    f: "json",
  });
  const res = await fetch(`${SUGGEST_URL}?${params}`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { suggestions?: { text: string; magicKey: string }[] };
  const out: (GeocodeSuggestion & { magicKey: string })[] = [];
  for (const s of data.suggestions ?? []) {
    const p = parse(s.text, s.magicKey);
    if (p && !out.some((o) => o.formatted === p.formatted)) out.push(p);
  }
  return out.slice(0, 6);
}

async function resolve(s: GeocodeSuggestion & { magicKey: string }): Promise<GeocodeSuggestion> {
  const params = new URLSearchParams({ magicKey: s.magicKey, singleLine: s.formatted, maxLocations: "1", outFields: "Postal", f: "json" });
  try {
    const res = await fetch(`${FIND_URL}?${params}`, { signal: AbortSignal.timeout(4000) });
    const c = res.ok ? ((await res.json()) as { candidates?: { location: { x: number; y: number } }[] }).candidates?.[0] : undefined;
    return c ? { ...s, lat: c.location.y, lng: c.location.x } : s;
  } catch {
    return s;
  }
}

const strip = ({ formatted, street, city, state, zip, lat, lng }: GeocodeSuggestion): GeocodeSuggestion => ({ formatted, street, city, state, zip, lat, lng });

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().replace(/\s+/g, " ") ?? "";
  const wantCoords = request.nextUrl.searchParams.get("resolve") === "1";
  if (q.length < 2) return NextResponse.json([]);

  const key = `${q.toLowerCase()}|${wantCoords ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.value, { headers: { "Cache-Control": "private, max-age=300" } });

  try {
    const list = await suggest(q);
    const value = wantCoords && list[0] ? [await resolve(list[0]), ...list.slice(1)].map(strip) : list.map(strip);
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), value });
    return NextResponse.json(value, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    return NextResponse.json([]);
  }
}
