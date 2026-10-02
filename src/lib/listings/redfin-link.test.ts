import { describe, expect, it } from "vitest";
import { redfinLink } from "./redfin-link";

describe("Redfin link", () => {
  it("uses the direct Redfin listing when the source has one", () => {
    expect(redfinLink("1 A St, Seattle, WA 98103", "https://www.redfin.com/WA/Seattle/1-A-St-98103/home/123")).toEqual({ href: "https://www.redfin.com/WA/Seattle/1-A-St-98103/home/123", direct: true });
  });
  it("otherwise searches for the address on redfin.com", () => {
    const r = redfinLink("4002 12TH AVE S, Seattle, WA 98108");
    expect(r.direct).toBe(false);
    expect(decodeURIComponent(r.href)).toContain("4002 12TH AVE S Seattle WA 98108 site:redfin.com");
  });
  it("ignores a non-Redfin link", () => expect(redfinLink("1 A St, Seattle, WA 98103", "https://evil.example/x").direct).toBe(false));
});
