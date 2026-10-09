import { NextRequest, NextResponse } from "next/server";
import { searchAddresses, type AddressSuggestion } from "@/lib/server/address-search";

export type { AddressSuggestion as GeocodeSuggestion };

/**
 * GET /api/geocode?q=5519 12th&session=<token>[&resolve=1]
 * Seattle address autocomplete: Google Places when GOOGLE_MAPS_API_KEY is set, Esri otherwise (and as the fallback).
 * `session` groups one typing session for Google billing. `resolve=1` also returns the top match's coordinates.
 * Response: [{ formatted, street, city, state, zip, lat, lng }] (lat/lng null unless resolved); header x-provider.
 */
const cache = new Map<string, { at: number; value: AddressSuggestion[]; provider: string }>();
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 2000;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim().replace(/\s+/g, " ") ?? "";
  const wantCoords = sp.get("resolve") === "1";
  const session = (sp.get("session") ?? "").slice(0, 64) || undefined;
  if (q.length < 2) return NextResponse.json([]);

  // Typing repeats the same prefixes; cached answers keep those instant and free. Resolved answers are cached too.
  const key = `${q.toLowerCase()}|${wantCoords ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.value, { headers: { "Cache-Control": "private, max-age=300", "x-provider": hit.provider } });

  const { provider, suggestions } = await searchAddresses(q, { resolve: wantCoords, session });
  if (suggestions.length) {
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), value: suggestions, provider });
  }
  return NextResponse.json(suggestions, { headers: { "Cache-Control": "private, max-age=300", "x-provider": provider } });
}
