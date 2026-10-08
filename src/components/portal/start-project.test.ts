import { describe, expect, it } from "vitest";
import { projectAddress } from "./StartProjectCta";

describe("projectAddress", () => {
  it("turns the parcel's form into a readable Seattle address", () => {
    expect(projectAddress("610 N 125TH ST 98133")).toBe("610 N 125th St, Seattle, WA");
    expect(projectAddress("3504 NE 93rd St, Seattle, WA 98115")).toBe("3504 NE 93rd St, Seattle, WA");
    expect(projectAddress("522 ne 127th st")).toBe("522 NE 127th St, Seattle, WA");
  });
});
