import { NextRequest, NextResponse } from "next/server";

const SUGGEST_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";
const FIND_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

const SEATTLE_CENTER = "-122.335,47.608";

interface SuggestResult {
  text: string;
  magicKey: string;
  isCollection: boolean;
}

interface Candidate {
  address: string;
  location: { x: number; y: number };
  attributes: Record<string, string | number>;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const suggestParams = new URLSearchParams({
      text: q,
      location: SEATTLE_CENTER,
      maxSuggestions: "6",
      countryCode: "USA",
      category: "Address,Street Address,Point Address",
      f: "json",
    });

    const suggestRes = await fetch(`${SUGGEST_URL}?${suggestParams}`, {
      signal: AbortSignal.timeout(4000),
    });

    if (!suggestRes.ok) {
      return NextResponse.json([]);
    }

    const suggestData = await suggestRes.json();
    const suggestions: SuggestResult[] = suggestData.suggestions ?? [];

    if (suggestions.length === 0) {
      return NextResponse.json([]);
    }

    const seattleSuggestions = suggestions.filter(
      (s) =>
        s.text.toLowerCase().includes("seattle") ||
        s.text.toLowerCase().includes(", wa")
    );

    // Restrict to Seattle addresses only — return nothing if no Seattle match
    const toResolve = seattleSuggestions;

    const resolved = await Promise.all(
      toResolve.slice(0, 5).map(async (s) => {
        try {
          const findParams = new URLSearchParams({
            magicKey: s.magicKey,
            singleLine: s.text,
            outFields: "StAddr,City,Region,Postal",
            maxLocations: "1",
            f: "json",
          });

          const findRes = await fetch(`${FIND_URL}?${findParams}`, {
            signal: AbortSignal.timeout(3000),
          });

          if (!findRes.ok) return null;

          const findData = await findRes.json();
          const candidate: Candidate | undefined =
            findData.candidates?.[0];

          if (!candidate) return null;

          const attr = candidate.attributes;
          const street = attr.StAddr || "";
          const city = attr.City || "Seattle";
          const state = attr.Region || "WA";
          const zip = attr.Postal || "";

          const formatted = [street, city, state, zip]
            .filter(Boolean)
            .join(", ");

          return {
            formatted,
            street: String(street),
            city: String(city),
            state: String(state),
            zip: String(zip),
            lat: candidate.location.y,
            lng: candidate.location.x,
          };
        } catch {
          return null;
        }
      })
    );

    const results = resolved.filter(Boolean);

    const unique = results.filter(
      (item, index, self) =>
        self.findIndex((t) => t!.formatted === item!.formatted) === index
    );

    return NextResponse.json(unique, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
