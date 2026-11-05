import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Passage } from "@/lib/ai/types";
import { lexicalAvailable, lexicalSearch } from "./rag-lexical";

const RAG_DIR = join(process.cwd(), "rag");
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
 * The knowledge-base search the app uses: the local Python vector index when it is set up (development), otherwise the
 * built-in BM25 search over the same documents, which ships with the site and runs on Vercel.
 */
export function knowledgeAvailable(): boolean {
  return ragAvailable() || lexicalAvailable();
}

export async function knowledgeSearch(question: string, opts: { k?: number; hyde?: string; scope?: "rules" | "test" | "all" } = {}): Promise<Passage[]> {
  if (ragAvailable()) {
    try {
      return await ragSearch(question, opts);
    } catch {
      /* fall through to the built-in search */
    }
  }
  return lexicalSearch(question, opts);
}
