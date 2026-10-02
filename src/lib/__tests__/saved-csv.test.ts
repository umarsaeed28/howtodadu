import { describe, expect, it } from "vitest";
import { savedToCsv } from "../listings-csv";

describe("saved homes CSV", () => {
  it("has a Market column and leaves price blank for off-market", () => {
    const csv = savedToCsv(
      [
        { mlsId: "dm-1", address: "1 A St", price: 900000, photo: null, score: 88, market: "on", pin: "1", tier: 2, savedAt: "2026-10-02" },
        { mlsId: "pin-2", address: "2 B Ave NE", price: 0, photo: null, score: 80, market: "off", pin: "2", tier: 1, lotSqft: 6000, daduSqft: 1000, savedAt: "2026-10-02" },
      ],
      []
    );
    expect(csv.startsWith("\uFEFF")).toBe(true); // so Excel reads it as UTF-8
    const lines = csv.slice(1).trim().split("\r\n");
    expect(lines[0]).toMatch(/^Market,Address,Price/);
    expect(lines[1]).toMatch(/^On market,1 A St,900000,88,Good/);
    expect(lines[2]).toMatch(/^Off market,2 B Ave NE,,80,Fair,6000,1000,/);
  });
});
