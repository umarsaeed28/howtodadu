import { describe, expect, it } from "vitest";
import { googleMapsUrl } from "./property-image";

const q = (url: string) => decodeURIComponent(new URL(url).searchParams.get("query") ?? "");

describe("googleMapsUrl", () => {
  it("searches the address, adding Seattle, WA where it belongs", () => {
    expect(q(googleMapsUrl("1526 N 107TH ST 98133"))).toBe("1526 N 107TH ST, Seattle, WA 98133");
    expect(q(googleMapsUrl("4247 S Eddy St"))).toBe("4247 S Eddy St, Seattle, WA");
    expect(q(googleMapsUrl("5519 12th Ave NE, Seattle, WA 98105"))).toBe("5519 12th Ave NE, Seattle, WA 98105");
  });

  it("falls back to the coordinates without an address", () => {
    expect(q(googleMapsUrl("", 47.7, -122.33))).toBe("47.7,-122.33");
  });
});
