import type { Passage } from "@/lib/ai/types";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { embed, jinaConfigured, rerank } from "@/lib/kb/jina";
import { expandQuery } from "@/lib/kb/query";

/**
 * The knowledge base in Supabase (migration 0012): keyword and vector rankings fused in Postgres, then reranked by
 * Jina. Runs in Vercel functions. It is the app's search only when it can beat the built-in keyword search, i.e. with
 * Supabase configured and an embedding key (JINA_API_KEY); KB_BACKEND=lexical switches it off.
 */

export type Scope = "rules" | "test" | "all";
const KINDS: Record<Scope, string[]> = { rules: ["rules"], test: ["test_listing"], all: ["rules", "test_listing"] };

interface Row {
  id: string;
  source: string;
  kind: string;
  breadcrumb: string;
  content: string;
  context: string | null;
  title: string;
  source_url: string | null;
  citation: string | null;
  effective_date: string | null;
  score: number;
}

export function hybridConfigured(): boolean {
  return process.env.KB_BACKEND !== "lexical" && jinaConfigured() && supabaseAdmin() !== null;
}

/** What the reranker reads for a passage: its place in the document, its context line, then the text. */
const rerankText = (r: Row) => [r.breadcrumb, r.context, r.content].filter(Boolean).join("\n");

export async function hybridSearch(question: string, opts: { k?: number; hyde?: string; scope?: Scope } = {}): Promise<Passage[]> {
  const db = supabaseAdmin();
  if (!db) throw new Error("Supabase is not configured.");
  const k = opts.k ?? 6;
  const useRerank = jinaConfigured() && process.env.KB_RERANK !== "0";

  // The vector reads the question with its hypothetical answer, when there is one; keywords read the question only.
  let vector: number[] | null = null;
  if (jinaConfigured()) {
    try {
      [vector] = await embed([opts.hyde ? `${question}\n\n${opts.hyde}` : question], "query");
    } catch (e) {
      console.warn("[kb] query embedding failed, keyword search only:", e instanceof Error ? e.message : e);
    }
  }

  const { data, error } = await db.rpc("kb_hybrid_search", {
    query_text: expandQuery(question),
    query_embedding: vector,
    match_count: useRerank ? Math.max(k * 3, 15) : k,
    kinds: KINDS[opts.scope ?? "rules"],
  });
  if (error) throw new Error(`Knowledge base search failed: ${error.message}`);
  let rows = (data ?? []) as Row[];
  let scores = rows.map((r) => r.score);

  if (useRerank && rows.length > 1) {
    try {
      const order = await rerank(question, rows.map(rerankText), k);
      rows = order.map((o) => rows[o.index]);
      scores = order.map((o) => o.score);
    } catch (e) {
      console.warn("[kb] rerank failed, keeping the fused order:", e instanceof Error ? e.message : e);
    }
  }

  rows = rows.slice(0, k);
  const best = Math.max(...scores.slice(0, k), 1e-9);
  return rows.map((r, i) => ({
    label: `P${i + 1}`,
    id: r.id,
    docId: r.source.replace(/\.md$/, ""),
    section: r.breadcrumb,
    text: r.content,
    distance: Math.round((1 - scores[i] / best) * 1000) / 1000,
    ...(r.citation ? { citation: r.citation } : {}),
    ...(r.source_url ? { sourceUrl: r.source_url } : {}),
    ...(r.effective_date ? { effectiveDate: r.effective_date } : {}),
    ...(r.title ? { title: r.title } : {}),
  }));
}
