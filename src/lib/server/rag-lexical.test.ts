import { describe, expect, it } from "vitest";
import { lexicalSearch } from "./rag-lexical";

describe("built-in knowledge base search", () => {
  it("finds the access rules for a driveway question", () => {
    const hits = lexicalSearch("Is there room for a driveway to the backyard cottage without an alley?", { k: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.docId === "32-access-and-driveways")).toBe(true);
    expect(hits[0].label).toBe("P1");
  });
  it("keeps test listings out of rule lookups unless asked", () => {
    expect(lexicalSearch("5th Ave NE listing", { k: 10 }).every((h) => !h.docId.startsWith("test-listings"))).toBe(true);
    expect(lexicalSearch("4743 5th Ave NE", { k: 3, scope: "test" })[0]?.docId.startsWith("test-listings")).toBe(true);
  });
  it("ranks the site score document for a scoring question", () => {
    const hits = lexicalSearch("How is the DADU site score weighted and what are the grade bands?", { k: 3 });
    expect(hits.map((h) => h.docId)).toContain("36-site-score");
  });
});
