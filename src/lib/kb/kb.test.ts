import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkMarkdown, docTitle, kindOf, parseFrontmatter } from "./markdown";
import { expandQuery } from "./query";
import { embed, rerank } from "./jina";

describe("knowledge-base markdown", () => {
  it("reads the citation block and leaves the body", () => {
    const { meta, body } = parseFrontmatter(`---\ntitle: "ADU rules"\ncitation: SMC 23.42.022\neffective_date: 2026-01-21\nunknown: x\n---\n# Heading\nText`);
    expect(meta).toEqual({ title: "ADU rules", citation: "SMC 23.42.022", effective_date: "2026-01-21" });
    expect(body).toBe("# Heading\nText");
  });

  it("treats a file without front matter as all body", () => {
    expect(parseFrontmatter("# Only a heading\nText")).toEqual({ meta: {}, body: "# Only a heading\nText" });
  });

  it("keeps the heading path and never splits inside a code fence", () => {
    const chunks = chunkMarkdown("# Rules\n## Height\nUp to 32 feet.\n\n```\n# not a heading\n```\n## Parking\nNone required.");
    expect(chunks.map((c) => c.breadcrumb)).toEqual(["Rules > Height", "Rules > Parking"]);
    expect(chunks[0].text).toContain("# not a heading");
    expect(chunks.map((c) => c.idx)).toEqual([0, 1]);
  });

  it("packs paragraphs up to the size limit", () => {
    const para = "word ".repeat(60).trim();
    const chunks = chunkMarkdown(`# A\n${[para, para, para].join("\n\n")}`, 700);
    expect(chunks.length).toBe(2);
  });

  it("names kinds and titles", () => {
    expect(kindOf("test-listings/1-main-st.md")).toBe("test_listing");
    expect(kindOf("20-adu-rules.md")).toBe("rules");
    expect(docTitle({}, "intro\n# Real title\n", "f.md")).toBe("Real title");
    expect(docTitle({ title: "Meta title" }, "# Heading", "f.md")).toBe("Meta title");
  });
});

describe("query expansion", () => {
  it("adds the canonical term for a synonym", () => {
    expect(expandQuery("How tall can a backyard cottage be?")).toBe("How tall can a backyard cottage be? dadu");
    expect(expandQuery("parking near transit")).toBe("parking near transit");
  });
});

describe("Jina client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the retrieval adapter, keeps input order and checks dimensions", async () => {
    vi.stubEnv("JINA_API_KEY", "test-key");
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      const data = (body.input as string[]).map((_, i) => ({ index: i, embedding: new Array(1024).fill(i) })).reverse();
      return new Response(JSON.stringify({ data }), { status: 200 });
    }));
    const out = await embed(["a", "b"], "query");
    expect(bodies[0]).toMatchObject({ task: "retrieval.query", dimensions: 1024, normalized: true, input: ["a", "b"] });
    expect(out.map((v) => v[0])).toEqual([0, 1]);
  });

  it("rejects a vector of the wrong size", async () => {
    vi.stubEnv("JINA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 2, 3] }] }), { status: 200 })));
    await expect(embed(["a"], "passage")).rejects.toThrow(/3 dims/);
  });

  it("returns rerank order as indexes and scores", async () => {
    vi.stubEnv("JINA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ results: [{ index: 1, relevance_score: 0.9 }, { index: 0, relevance_score: 0.2 }] }), { status: 200 })));
    expect(await rerank("q", ["x", "y"], 2)).toEqual([{ index: 1, score: 0.9 }, { index: 0, score: 0.2 }]);
  });

  it("fails clearly without a key", async () => {
    vi.stubEnv("JINA_API_KEY", "");
    await expect(embed(["a"], "query")).rejects.toThrow(/JINA_API_KEY/);
  });
});
