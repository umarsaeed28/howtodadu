/**
 * Loads the knowledge base (rag/documents/**.md) into Supabase for the hybrid search (migration 0012).
 *
 *   npm run kb:ingest                       changed files only; removed files are deleted
 *   npm run kb:ingest -- --dry-run          parse and chunk, print what would be written, call nothing
 *   npm run kb:ingest -- --force            re-ingest every file
 *   npm run kb:ingest -- --context          also have Claude write one line placing each chunk in its document
 *   npm run kb:ingest -- --only smc-23-42   only files whose path contains the text (nothing is deleted)
 *   npm run kb:ingest -- --sql-out kb.sql   write SQL instead of calling Supabase (local Postgres, the SQL editor)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (.env.local), JINA_API_KEY and ANTHROPIC_API_KEY
 * (.env.local or .env.credentials). Without JINA_API_KEY chunks are stored without vectors: keyword search works,
 * and the next run with a key fills the vectors in. File front matter carries the citation (see src/lib/kb/markdown.ts).
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { chunkMarkdown, docTitle, kindOf, parseFrontmatter } from "../src/lib/kb/markdown";
import { embed, jinaConfigured } from "../src/lib/kb/jina";
import { supabaseAdmin } from "../src/utils/supabase/admin";
import type { AnthropicLlm } from "../src/lib/ai/llm";

// Keys come from the env files; the modules above read them only when called.
for (const f of [".env.local", ".env.credentials"]) {
  try {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch {
    /* the file is optional */
  }
}


const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const ROOT = opt("dir") ?? join("rag", "documents");
const ONLY = opt("only");
const SQL_OUT = opt("sql-out");
const DRY = flag("dry-run");
const FORCE = flag("force");
const CONTEXT = flag("context");

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
const isoDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md") && !/^00-README/i.test(name)) out.push(p); // the folder's README is not knowledge
  }
  return out.sort();
}

interface DocRow {
  source: string;
  kind: string;
  title: string;
  content_hash: string;
  embedding: number[] | null;
  source_url: string | null;
  citation: string | null;
  publisher: string | null;
  effective_date: string | null;
  retrieved_at: string | null;
  updated_at: string;
}
interface ChunkRow {
  id: string;
  source: string;
  kind: string;
  breadcrumb: string;
  idx: number;
  text: string;
  context: string | null;
  embedding: number[] | null;
}
interface Writer {
  known(): Promise<{ hash: Map<string, string>; unembedded: Set<string> }>;
  write(doc: DocRow, chunks: ChunkRow[]): Promise<void>;
  remove(sources: string[]): Promise<void>;
  finish(): Promise<void>;
}

function supabaseWriter(): Writer {
  const db = supabaseAdmin();
  if (!db) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, or use --sql-out.");
  return {
    async known() {
      const { data, error } = await db.from("rag_documents").select("source, content_hash");
      if (error) throw new Error(`Reading rag_documents failed (is migration 0012 applied?): ${error.message}`);
      const missing = await db.from("rag_chunks").select("source").is("embedding", null);
      if (missing.error) throw new Error(`Reading rag_chunks failed: ${missing.error.message}`);
      return {
        hash: new Map((data ?? []).map((r: { source: string; content_hash: string }) => [r.source, r.content_hash])),
        unembedded: new Set((missing.data ?? []).map((r: { source: string }) => r.source)),
      };
    },
    async write(doc, chunks) {
      const up = await db.from("rag_documents").upsert(doc, { onConflict: "source" });
      if (up.error) throw new Error(`Writing ${doc.source} failed: ${up.error.message}`);
      const del = await db.from("rag_chunks").delete().eq("source", doc.source);
      if (del.error) throw new Error(`Clearing ${doc.source} chunks failed: ${del.error.message}`);
      for (let i = 0; i < chunks.length; i += 200) {
        const ins = await db.from("rag_chunks").insert(chunks.slice(i, i + 200));
        if (ins.error) throw new Error(`Writing ${doc.source} chunks failed: ${ins.error.message}`);
      }
    },
    async remove(sources) {
      if (!sources.length) return;
      const del = await db.from("rag_documents").delete().in("source", sources);
      if (del.error) throw new Error(`Removing documents failed: ${del.error.message}`);
    },
    async finish() {},
  };
}

function sqlWriter(path: string): Writer {
  const q = (v: string | number | null) => (v === null ? "null" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
  const vec = (v: number[] | null) => (v ? `'[${v.join(",")}]'::extensions.vector` : "null");
  const lines = ["-- Generated by scripts/kb-ingest.ts. Loads the knowledge base; needs migrations 0005 and 0012.", "begin;"];
  return {
    async known() {
      return { hash: new Map(), unembedded: new Set() };
    },
    async write(d, chunks) {
      lines.push(
        `insert into public.rag_documents (source, kind, title, content_hash, embedding, source_url, citation, publisher, effective_date, retrieved_at, updated_at) values (${[q(d.source), q(d.kind), q(d.title), q(d.content_hash), vec(d.embedding), q(d.source_url), q(d.citation), q(d.publisher), q(d.effective_date), q(d.retrieved_at), q(d.updated_at)].join(", ")}) on conflict (source) do update set kind = excluded.kind, title = excluded.title, content_hash = excluded.content_hash, embedding = excluded.embedding, source_url = excluded.source_url, citation = excluded.citation, publisher = excluded.publisher, effective_date = excluded.effective_date, retrieved_at = excluded.retrieved_at, updated_at = excluded.updated_at;`,
        `delete from public.rag_chunks where source = ${q(d.source)};`,
      );
      for (const c of chunks) {
        lines.push(`insert into public.rag_chunks (id, source, kind, breadcrumb, idx, text, context, embedding) values (${[q(c.id), q(c.source), q(c.kind), q(c.breadcrumb), q(c.idx), q(c.text), q(c.context), vec(c.embedding)].join(", ")});`);
      }
    },
    async remove() {},
    async finish() {
      lines.push("commit;");
      writeFileSync(path, lines.join("\n") + "\n");
    },
  };
}

/** One line that places a chunk in its document (Anthropic's contextual retrieval). The document is the cached prefix. */
async function contextFor(llm: AnthropicLlm, model: string, title: string, body: string, chunk: string): Promise<string | null> {
  try {
    const text = await llm.text({
      model,
      system: `You index Seattle housing rules for search. Here is the whole document, titled "${title}":\n<document>\n${body.slice(0, 60_000)}\n</document>`,
      user: `Here is a passage from that document:\n<passage>\n${chunk}\n</passage>\nWrite one short sentence that situates this passage within the document (which rule, which housing type, which zone or topic), so the passage can be found by search. Use the document's own terms; call a detached accessory dwelling unit a DADU. Answer with the sentence only.`,
      maxTokens: 120,
    });
    const line = text.trim().split("\n")[0]?.trim();
    return line ? line.slice(0, 400) : null;
  } catch (e) {
    console.warn(`  context failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  const files = walk(ROOT).filter((f) => !ONLY || f.includes(ONLY));
  if (!files.length) throw new Error(`No .md files under ${ROOT}${ONLY ? ` matching "${ONLY}"` : ""}.`);
  const embedOn = jinaConfigured();
  if (!embedOn && !DRY) console.warn("JINA_API_KEY is not set: chunks are stored without vectors (keyword search only). Re-run with the key to add them.");

  let llm: AnthropicLlm | null = null;
  let model = "";
  if (CONTEXT && !DRY) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("--context needs ANTHROPIC_API_KEY.");
    const ai = await import("../src/lib/ai/llm");
    llm = new ai.AnthropicLlm(key);
    model = ai.FAST_MODEL;
  }

  const writer = DRY ? null : SQL_OUT ? sqlWriter(SQL_OUT) : supabaseWriter();
  const known = writer ? await writer.known() : { hash: new Map<string, string>(), unembedded: new Set<string>() };
  let written = 0, skipped = 0, chunkTotal = 0;
  const seen = new Set<string>();

  for (const path of files) {
    const source = relative(ROOT, path).replace(/\\/g, "/");
    seen.add(source);
    const raw = readFileSync(path, "utf8");
    const hash = sha1(raw);
    const needsVectors = embedOn && known.unembedded.has(source);
    if (!FORCE && known.hash.get(source) === hash && !needsVectors) {
      skipped++;
      continue;
    }
    const { meta, body } = parseFrontmatter(raw);
    const title = docTitle(meta, body, source);
    const kind = kindOf(source);
    const chunks = chunkMarkdown(body);
    if (!chunks.length) {
      console.warn(`  ${source}: no text, skipped`);
      continue;
    }
    chunkTotal += chunks.length;
    if (DRY) {
      console.log(`${source}: ${chunks.length} chunks, "${title}"${meta.citation ? `, ${meta.citation}` : ""}${meta.effective_date ? `, effective ${meta.effective_date}` : ""}`);
      written++;
      continue;
    }

    const contexts: (string | null)[] = [];
    for (let i = 0; i < chunks.length; i += 4) {
      const batch = chunks.slice(i, i + 4);
      contexts.push(...(await Promise.all(batch.map((c) => (llm ? contextFor(llm, model, title, body, c.text) : Promise.resolve(null))))));
    }
    const embedText = (i: number) => [title, chunks[i].breadcrumb, contexts[i], chunks[i].text].filter(Boolean).join("\n");
    const vectors = embedOn ? await embed([`${title}\n${body}`, ...chunks.map((_, i) => embedText(i))], "passage") : null;

    const doc: DocRow = {
      source,
      kind,
      title,
      content_hash: hash,
      embedding: vectors ? vectors[0] : null,
      source_url: meta.source_url ?? null,
      citation: meta.citation ?? null,
      publisher: meta.publisher ?? null,
      effective_date: isoDate(meta.effective_date),
      retrieved_at: isoDate(meta.retrieved_at),
      updated_at: new Date().toISOString(),
    };
    const rows: ChunkRow[] = chunks.map((c, i) => ({
      id: `${source}::${c.idx}::${sha1(c.text).slice(0, 12)}`,
      source,
      kind,
      breadcrumb: c.breadcrumb,
      idx: c.idx,
      text: c.text,
      context: contexts[i] ?? null,
      embedding: vectors ? vectors[i + 1] : null,
    }));
    await writer!.write(doc, rows);
    written++;
    console.log(`${source}: ${rows.length} chunks${vectors ? ", embedded" : ""}${llm ? ", with context" : ""}`);
  }

  const gone = ONLY ? [] : [...known.hash.keys()].filter((s) => !seen.has(s));
  if (writer) {
    await writer.remove(gone);
    await writer.finish();
  }
  console.log(`${DRY ? "would write" : "wrote"} ${written} files (${chunkTotal} chunks), ${skipped} unchanged, ${gone.length} removed${SQL_OUT ? `, SQL in ${SQL_OUT}` : ""}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
