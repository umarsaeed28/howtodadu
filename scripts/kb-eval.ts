/**
 * Retrieval eval for the knowledge base: does the expected document come back for each question in
 * evals/golden.json, and how high? Compares every backend that is available:
 *
 *   lexical   the built-in BM25 search (always)
 *   supabase  the hybrid search in Supabase (when Supabase and JINA_API_KEY are configured)
 *   psql      the same SQL function on a local Postgres (KB_EVAL_PSQL="-h 127.0.0.1 -p 55432 -U postgres")
 *
 *   npm run kb:eval
 *
 * Metrics: hit@1, hit@3 (expected document among the first 3 passages) and MRR@5 (1 / rank of its first passage).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { lexicalSearch } from "../src/lib/server/rag-lexical";
import { hybridConfigured, hybridSearch } from "../src/lib/server/kb-search";
import { embed, jinaConfigured } from "../src/lib/kb/jina";
import { expandQuery } from "../src/lib/kb/query";

for (const f of [".env.local", ".env.credentials"]) {
  try {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch {
    /* optional */
  }
}

/** `alsoAccept`: other documents that state the same answer, e.g. the generated rulebook for a rule question. */
type Case = { query: string; expectDoc: string; alsoAccept?: string[] };
type Backend = { name: string; search: (q: string) => Promise<string[]> };

const cases = (JSON.parse(readFileSync("evals/golden.json", "utf8")).retrieval ?? []) as Case[];
const K = 5;

async function psqlSearch(q: string): Promise<string[]> {
  const args = (process.env.KB_EVAL_PSQL ?? "").split(/\s+/).filter(Boolean);
  const vec = jinaConfigured() ? `'[${(await embed([q], "query"))[0].join(",")}]'::extensions.vector` : "null";
  const lit = `'${expandQuery(q).replace(/'/g, "''")}'`;
  const out = execFileSync("psql", [...args, "-At", "-c", `select source from public.kb_hybrid_search(${lit}, ${vec}, ${K})`], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "en_US.UTF-8" },
  });
  return out.split("\n").filter(Boolean).map((s) => s.replace(/\.md$/, ""));
}

const backends: Backend[] = [{ name: "lexical", search: async (q) => lexicalSearch(q, { k: K }).map((p) => p.docId) }];
if (hybridConfigured()) backends.push({ name: "supabase", search: async (q) => (await hybridSearch(q, { k: K })).map((p) => p.docId) });
if (process.env.KB_EVAL_PSQL) backends.push({ name: `psql${jinaConfigured() ? "" : " (keywords only)"}`, search: psqlSearch });

async function main() {
  if (!cases.length) throw new Error("evals/golden.json has no retrieval cases.");
  for (const b of backends) {
    let h1 = 0, h3 = 0, mrr = 0, ms = 0;
    const misses: string[] = [];
    for (const c of cases) {
      const t0 = Date.now();
      const docs = await b.search(c.query);
      ms += Date.now() - t0;
      const ok = new Set([c.expectDoc, ...(c.alsoAccept ?? [])]);
      const rank = docs.findIndex((d) => ok.has(d)) + 1;
      // The expected document itself must still be in the top 3, so the explanation is never crowded out.
      if (!docs.slice(0, 3).includes(c.expectDoc)) misses.push(`  note: "${c.query}" top 3 lacks ${c.expectDoc}: ${docs.slice(0, 3).join(", ")}`);
      if (rank === 1) h1++;
      if (rank >= 1 && rank <= 3) h3++;
      if (rank >= 1) mrr += 1 / rank;
      else misses.push(`  miss: "${c.query}" expected ${c.expectDoc}, got ${docs.slice(0, 3).join(", ") || "nothing"}`);
    }
    const n = cases.length;
    console.log(`${b.name.padEnd(24)} hit@1 ${h1}/${n}  hit@3 ${h3}/${n}  MRR@5 ${(mrr / n).toFixed(3)}  ${Math.round(ms / n)} ms/query`);
    for (const m of misses) console.log(m);
  }
  if (!hybridConfigured()) console.log("(supabase hybrid skipped: needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and JINA_API_KEY)");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
