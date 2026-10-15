import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
// The local Python index (step 2) may exist on a dev machine; here it always fails fast, so the chain reaches step 3.
vi.mock("node:child_process", () => ({ execFile: (_f: string, _a: string[], _o: unknown, cb: (e: Error) => void) => cb(new Error("python disabled in tests")) }));
vi.mock("@/utils/supabase/admin", () => ({ supabaseAdmin: () => ({ rpc }) }));
vi.mock("@/lib/kb/jina", () => ({
  jinaConfigured: () => process.env.JINA_API_KEY === "on",
  embed: vi.fn(async () => [new Array(1024).fill(0.1)]),
  rerank: vi.fn(async (_q: string, docs: string[]) => docs.map((_, i) => ({ index: docs.length - 1 - i, score: 1 - i * 0.1 })).slice(0, 2)),
}));

const row = (id: string, source: string, extra: Record<string, unknown> = {}) => ({
  id, source, kind: "rules", breadcrumb: "Rules > Height", content: `text ${id}`, context: null, title: "T",
  source_url: null, citation: null, effective_date: null, score: 0.03, ...extra,
});

describe("knowledge-base search order", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    rpc.mockReset();
    vi.resetModules();
  });

  it("uses Supabase hybrid search, reranked, with citations, when Jina is configured", async () => {
    vi.stubEnv("JINA_API_KEY", "on");
    rpc.mockResolvedValue({ data: [row("a", "20-adu.md", { citation: "SMC 23.42.022", source_url: "https://x.test" }), row("b", "34-height.md")], error: null });
    const { knowledgeSearch } = await import("./rag");
    const hits = await knowledgeSearch("how tall can a DADU be", { k: 2 });
    expect(rpc).toHaveBeenCalledWith("kb_hybrid_search", expect.objectContaining({ kinds: ["rules"], match_count: 15 }));
    expect(rpc.mock.calls[0][1].query_embedding).toHaveLength(1024);
    expect(hits.map((h) => h.docId)).toEqual(["34-height", "20-adu"]); // the reranker's order
    expect(hits[1]).toMatchObject({ label: "P2", citation: "SMC 23.42.022", sourceUrl: "https://x.test" });
  });

  it("falls back to the built-in search when the database call fails", async () => {
    vi.stubEnv("JINA_API_KEY", "on");
    rpc.mockResolvedValue({ data: null, error: { message: "function kb_hybrid_search does not exist" } });
    const { knowledgeSearch } = await import("./rag");
    const hits = await knowledgeSearch("Is there room for a driveway to the DADU without an alley?", { k: 5 });
    expect(hits.some((h) => h.docId === "32-access-and-driveways")).toBe(true);
  });

  it("keeps the built-in search without an embedding key", async () => {
    vi.stubEnv("JINA_API_KEY", "");
    const { knowledgeSearch } = await import("./rag");
    await knowledgeSearch("parking for an ADU", { k: 3 });
    expect(rpc).not.toHaveBeenCalled();
  });
});
