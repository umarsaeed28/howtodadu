import { beforeEach, describe, expect, it } from "vitest";
import { hasFeasibilityAccess, lastEmail, orderKey, ordersFor, rememberEmail, rememberOrder } from "./report-access";

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe("report access", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { localStorage: new MemoryStorage() };
  });

  it("a feasibility order opens that parcel only", () => {
    expect(hasFeasibilityAccess("0004000070", "610 N 125th St")).toBe(false);
    rememberOrder({ orderId: "o1", token: "t", kind: "feasibility_instant", key: "0004000070", at: "2026-10-08" });
    expect(hasFeasibilityAccess("0004000070", "610 N 125th St")).toBe(true);
    expect(hasFeasibilityAccess("0004000071", "612 N 125th St")).toBe(false);
  });

  it("other products do not open the report; keys ignore case and spacing", () => {
    rememberOrder({ orderId: "o2", token: "t", kind: "custom_plan", key: "  610 N  125th St ", at: "x" });
    expect(hasFeasibilityAccess(null, "610 n 125th st")).toBe(false);
    expect(ordersFor("610 N 125TH ST")).toHaveLength(1);
    expect(orderKey("0004000070")).toBe("0004000070");
  });

  it("honors reports bought before the new tiers", () => {
    window.localStorage.setItem("pencil.reportPaid.v1", JSON.stringify([{ address: "610 n 125th st", receiptId: "r", at: "x" }]));
    expect(hasFeasibilityAccess(null, "610 N 125th St")).toBe(true);
  });

  it("remembers the buyer's email", () => {
    rememberEmail(" Owner@Example.com ");
    expect(lastEmail()).toBe("owner@example.com");
  });

  it("survives blocked storage", () => {
    (globalThis as { window?: unknown }).window = { localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } };
    expect(hasFeasibilityAccess("0004000070", "x")).toBe(false);
    expect(() => rememberOrder({ orderId: "o", token: "t", kind: "feasibility_instant", key: "x", at: "x" })).not.toThrow();
  });
});
