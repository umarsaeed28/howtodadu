import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { normalizeQuery, parseUsAddress, searchAddresses } from "./address-search";

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as Response;

afterEach(() => vi.unstubAllGlobals());

describe("address parsing", () => {
  it("reads Google and Esri address strings", () => {
    expect(parseUsAddress("5519 12th Ave NE, Seattle, WA 98105, USA")).toEqual({ street: "5519 12th Ave NE", city: "Seattle", state: "WA", zip: "98105" });
    expect(parseUsAddress("5519 12th Ave NE, Seattle, WA, 98105, USA")).toEqual({ street: "5519 12th Ave NE", city: "Seattle", state: "WA", zip: "98105" });
    expect(parseUsAddress("5519 12th Ave NE, Seattle, WA, USA")).toEqual({ street: "5519 12th Ave NE", city: "Seattle", state: "WA", zip: "" });
    expect(parseUsAddress("12th Ave NE, Portland, OR, USA")).toBeNull();
    expect(normalizeQuery("  5519   12th ave ne, ")).toBe("5519 12th ave ne");
  });
});

describe("searchAddresses", () => {
  it("uses Google when a key is set, keeps Seattle house addresses only, and passes the session", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain("places:autocomplete");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ input: "5519 12th", sessionToken: "s1", includedRegionCodes: ["us"] });
      expect((init?.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("k");
      return json({
        suggestions: [
          { placePrediction: { placeId: "a", text: { text: "5519 12th Ave NE, Seattle, WA, USA" } } },
          { placePrediction: { placeId: "b", text: { text: "12th Ave NE, Seattle, WA, USA" } } },
          { placePrediction: { placeId: "c", text: { text: "5519 12th St, Bellevue, WA, USA" } } },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await searchAddresses("5519 12th", { session: "s1", env: { GOOGLE_MAPS_API_KEY: "k" } });
    expect(r.provider).toBe("google");
    expect(r.suggestions.map((s) => s.formatted)).toEqual(["5519 12th Ave NE, Seattle, WA"]);
  });

  it("falls back to Esri when Google errors or finds nothing", async () => {
    const esri = { suggestions: [{ text: "5519 12th Ave NE, Seattle, WA, 98105, USA", magicKey: "m" }] };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (String(url).includes("googleapis") ? json({}, false) : json(esri))));
    const r = await searchAddresses("5519 12th", { env: { GOOGLE_MAPS_API_KEY: "k" } });
    expect(r).toEqual({ provider: "esri", suggestions: [expect.objectContaining({ formatted: "5519 12th Ave NE, Seattle, WA 98105" })] });

    vi.stubGlobal("fetch", vi.fn(async (url: string) => (String(url).includes("googleapis") ? json({ suggestions: [] }) : json(esri))));
    expect((await searchAddresses("5519 12th", { env: { GOOGLE_MAPS_API_KEY: "k" } })).provider).toBe("esri");
  });

  it("uses Esri without a key, and resolves coordinates on request", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      String(url).includes("findAddressCandidates")
        ? json({ candidates: [{ location: { x: -122.31, y: 47.67 } }] })
        : json({ suggestions: [{ text: "5519 12th Ave NE, Seattle, WA, 98105, USA", magicKey: "m" }] }),
    ));
    const r = await searchAddresses("5519 12th ave ne", { resolve: true, env: {} });
    expect(r.suggestions[0]).toMatchObject({ formatted: "5519 12th Ave NE, Seattle, WA 98105", lat: 47.67, lng: -122.31 });
  });

  it("returns nothing for one character and survives both providers failing", async () => {
    expect((await searchAddresses("5", { env: {} })).suggestions).toEqual([]);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect((await searchAddresses("5519 12th", { env: { GOOGLE_MAPS_API_KEY: "k" } })).suggestions).toEqual([]);
  });
});
