import { beforeEach, describe, expect, it } from "vitest";
import { grantReportAccess, grantReportPayment, hasReportAccess, hasReportPayment, paidAddressKey } from "./report-access";

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

  it("email unlocks every report, payment unlocks one address", () => {
    expect(hasReportAccess()).toBe(false);
    grantReportAccess("a@b.co");
    expect(hasReportAccess()).toBe(true);
    expect(hasReportPayment("610 N 125th St")).toBe(false);
    grantReportPayment("610 N 125th St", { id: "mock_1" });
    expect(hasReportPayment("610 N 125th St")).toBe(true);
    expect(hasReportPayment("  610 n 125TH st ")).toBe(true);
    expect(hasReportPayment("3504 NE 93rd St")).toBe(false);
  });

  it("keeps several paid addresses and replaces a repeat", () => {
    grantReportPayment("A St", { id: "r1" });
    grantReportPayment("B St", { id: "r2" });
    grantReportPayment("a st", { id: "r3" });
    const raw = JSON.parse((globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.getItem("pencil.reportPaid.v1")!) as { address: string; receiptId: string }[];
    expect(raw.map((p) => [p.address, p.receiptId])).toEqual([["b st", "r2"], ["a st", "r3"]]);
  });

  it("never stores anything but the address key and receipt id", () => {
    grantReportPayment("A St", { id: "r1", at: "2026-10-08T00:00:00.000Z" });
    const raw = (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.getItem("pencil.reportPaid.v1")!;
    expect(JSON.parse(raw)).toEqual([{ address: "a st", receiptId: "r1", at: "2026-10-08T00:00:00.000Z" }]);
  });

  it("survives blocked storage", () => {
    (globalThis as { window?: unknown }).window = { localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } };
    expect(() => grantReportPayment("A St", { id: "r1" })).not.toThrow();
    expect(hasReportPayment("A St")).toBe(false);
    expect(paidAddressKey(" X  Y ")).toBe("x y");
  });
});
