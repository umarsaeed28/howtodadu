import { describe, expect, it } from "vitest";
import { overrideFor, statusOverrides } from "./status-overrides";
import { isPending } from "./status";

describe("pending listings", () => {
  it("610 N 125th St is on the status list as pending, matched in any case and spelling", () => {
    const m = statusOverrides();
    expect(overrideFor(m, "610 N 125TH ST, Seattle, WA 98133", "98133")?.status).toBe("pending");
    expect(overrideFor(m, "610 North 125th Street", "98133")?.status).toBe("pending");
    expect(overrideFor(m, "612 N 125TH ST, Seattle, WA 98133", "98133")).toBeNull();
  });
  it("pending and contingent statuses are recognized", () => {
    for (const s of ["pending", "Sale Pending", "active contingent", "under contract"]) expect(isPending(s)).toBe(true);
    for (const s of ["active", "sold", ""]) expect(isPending(s)).toBe(false);
  });
});
