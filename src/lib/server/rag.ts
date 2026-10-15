import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import type { Passage } from "@/lib/ai/types";
import { lexicalAvailable, lexicalSearch } from "./rag-lexical";
import { hybridConfigured, hybridSearch } from "./kb-search";

// Built from an array, not join(process.cwd(), ...), so Turbopack can't trace it: the local virtualenv's python
// symlinks outside the project and tracing it panics the build. The Python side never ships (next.config.ts
// excludes it); it only runs where rag/.venv exists.
const RAG_DIR = [process.cwd(), "rag"].join(sep);
const PY = join(RAG_DIR, ".venv", "bin", "python");

export function ragAvailable(): boolean {
  return existsSync(PY) && existsSync(join(RAG_DIR, "storage"));
}

interface Raw {
  id: string;
  source: string;
  breadcrumb: string;
  text: string;
  distance: number;
}

/**
 * Two-level semantic search over the local knowledge base (rag/): documents first, then paragraph chunks inside them.
 * `hyde` is an optional hypothetical answer, embedded as a second query. Runs locally, needs no API key.
 */
export function ragSearch(question: string, opts: { k?: number; hyde?: string; scope?: "rules" | "test" | "all" } = {}): Promise<Passage[]> {
  const args = ["-m", "seattle_rag", "query", question, "-k", String(opts.k ?? 6), "--json"];
  if (opts.hyde) args.push("--hyde", opts.hyde);
  if (opts.scope) args.push("--scope", opts.scope);
  return new Promise((resolve, reject) => {
    execFile(PY, args, { cwd: RAG_DIR, timeout: 60_000, maxBuffer: 4_000_000 }, (err, stdout) => {
      if (err) return reject(new Error(`RAG search failed: ${err.message.slice(0, 200)}`));
      try {
        const rows = JSON.parse(stdout.trim().split("\n").pop() ?? "[]") as Raw[];
        resolve(rows.map((r, i) => ({ label: `P${i + 1}`, id: r.id, docId: r.source.replace(/\.md$/, ""), section: r.breadcrumb, text: r.text, distance: r.distance })));
      } catch {
        reject(new Error("RAG search returned unreadable output."));
      }
    });
  });
}

/**
 * The knowledge-base search the app uses, best first:
 *   1. Supabase hybrid search (keywords + vectors, reranked), when Supabase and JINA_API_KEY are configured: production.
 *   2. The local Python vector index, when rag/.venv is set up: development.
 *   3. The built-in BM25 search over rag/documents, which ships with the site and always works.
 * A path that fails or finds nothing falls through to the next.
 */
export function knowledgeAvailable(): boolean {
  return hybridConfigured() || ragAvailable() || lexicalAvailable();
}

export async function knowledgeSearch(question: string, opts: { k?: number; hyde?: string; scope?: "rules" | "test" | "all" } = {}): Promise<Passage[]> {
  if (hybridConfigured()) {
    try {
      const hits = await hybridSearch(question, opts);
      if (hits.length) return hits;
    } catch (e) {
      console.warn("[kb] hybrid search unavailable, falling back:", e instanceof Error ? e.message : e);
    }
  }
  if (ragAvailable()) {
    try {
      return await ragSearch(question, opts);
    } catch {
      /* fall through to the built-in search */
    }
  }
  return lexicalSearch(question, opts);
}
