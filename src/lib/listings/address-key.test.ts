import { describe, expect, it } from "vitest";
import { streetKey } from "./address-key";

describe("streetKey", () => {
  it("matches the city's parcel address (ZIP appended) to the feed's address", () => {
    expect(streetKey("2745 NE 89TH ST 98115")).toBe(streetKey("2745 NE 89th St, Seattle, WA 98115"));
    expect(streetKey("610 North 125th Street")).toBe("610 N 125TH ST");
    expect(streetKey("1 A ST 98103")).not.toBe(streetKey("12 A ST 98103"));
  });
});
