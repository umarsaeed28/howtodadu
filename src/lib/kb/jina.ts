/**
 * Jina AI embeddings and reranking over plain HTTPS, the same models the Python service uses
 * (jina-embeddings-v3 at 1024 dims, so both write vectors the database can compare). Passages and queries use
 * Jina's separate retrieval adapters. Needs JINA_API_KEY; callers check `jinaConfigured()` first.
 */

const BASE = "https://api.jina.ai/v1";
export const EMBED_MODEL = process.env.KB_EMBED_MODEL || "jina-embeddings-v3";
export const EMBED_DIMS = 1024; // fixed by the vector(1024) columns
export const RERANK_MODEL = process.env.KB_RERANK_MODEL || "jina-reranker-v2-base-multilingual";

export const jinaConfigured = () => !!process.env.JINA_API_KEY;

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const key = process.env.JINA_API_KEY;
  if (!key) throw new Error("JINA_API_KEY is not set.");
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`Jina ${path} failed: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T;
}

/** Embeds texts in batches of 64 (each cut to 8,000 characters). Returns one normalized vector per text, in order. */
export async function embed(texts: string[], task: "passage" | "query"): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64).map((t) => t.slice(0, 8000));
    const res = await post<{ data: { index: number; embedding: number[] }[] }>(
      "/embeddings",
      { model: EMBED_MODEL, task: task === "passage" ? "retrieval.passage" : "retrieval.query", dimensions: EMBED_DIMS, normalized: true, input: batch },
      task === "query" ? 8_000 : 60_000,
    );
    const rows = [...res.data].sort((a, b) => a.index - b.index);
    if (rows.length !== batch.length) throw new Error(`Jina returned ${rows.length} embeddings for ${batch.length} texts.`);
    for (const row of rows) {
      if (row.embedding.length !== EMBED_DIMS) throw new Error(`Jina returned ${row.embedding.length} dims, expected ${EMBED_DIMS}.`);
      out.push(row.embedding);
    }
  }
  return out;
}

/** Reorders `documents` by relevance to `query`. Returns the top `topN` as indexes into `documents` with scores 0 to 1. */
export async function rerank(query: string, documents: string[], topN: number): Promise<{ index: number; score: number }[]> {
  if (!documents.length) return [];
  const res = await post<{ results: { index: number; relevance_score: number }[] }>(
    "/rerank",
    { model: RERANK_MODEL, query, documents: documents.map((d) => d.slice(0, 4000)), top_n: Math.min(topN, documents.length), return_documents: false },
    8_000,
  );
  return res.results.map((r) => ({ index: r.index, score: r.relevance_score }));
}
