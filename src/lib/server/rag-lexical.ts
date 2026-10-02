import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import type { Passage } from "@/lib/ai/types";

/**
 * Built-in search over the knowledge base (rag/documents/*.md) that runs anywhere Node runs, including Vercel functions.
 * Same shape and scopes as the Python vector search (rag/seattle_rag): heading-aware chunks with a breadcrumb, then BM25
 * ranking with light stemming and a few domain synonyms. No embeddings, no API key, no extra service.
 */

const DOCS_DIR = join(process.cwd(), "rag", "documents");
const MAX_CHUNK_CHARS = 1400;

interface Chunk {
  id: string;
  docId: string;
  kind: "rules" | "test_listing";
  breadcrumb: string;
  text: string;
  terms: Map<string, number>;
  len: number;
}

interface Index {
  chunks: Chunk[];
  df: Map<string, number>;
  avgLen: number;
}

const STOP = new Set("a an and are as at be by can do does for from has have how if in into is it its may not of on or so than that the their then there these this to was what when where which while who why will with you your".split(" "));

/** Domain synonyms folded to one term, so "backyard cottage" finds "DADU" passages and the reverse. */
const SYNONYMS: [RegExp, string][] = [
  [/\bbackyard cottages?\b/g, " dadu "],
  [/\bdetached (accessory dwelling units?|adus?)\b/g, " dadu "],
  [/\battached (accessory dwelling units?|adus?)\b/g, " aadu "],
  [/\baccessory dwelling units?\b/g, " adu "],
  [/\bdriveways?\b/g, " driveway access "],
  [/\bsq\.? ?ft\b|\bsquare feet\b|\bsf\b/g, " sqft "],
];

const stem = (w: string) => w.replace(/(ings|ing|edly|ed|ies|es|s)$/, (m) => (m === "ies" ? "y" : "")).replace(/(.)\1$/, "$1");

function tokenize(text: string): string[] {
  let t = text.toLowerCase();
  for (const [re, rep] of SYNONYMS) t = t.replace(re, rep);
  return t
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (/^\d/.test(w) ? w : stem(w)));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md") && !/^00-README/i.test(name)) out.push(p); // the folder's own README is not knowledge
  }
  return out;
}

/** Split a markdown file on headings, keeping the heading path, then pack paragraphs up to the size limit. */
function chunkFile(path: string): Omit<Chunk, "terms" | "len">[] {
  const rel = relative(DOCS_DIR, path);
  const docId = rel.replace(/\.md$/, "");
  const kind = rel.startsWith("test-listings") ? "test_listing" : "rules";
  const lines = readFileSync(path, "utf8").split("\n");
  const sections: { path: string[]; body: string[] }[] = [];
  const stack: string[] = [];
  let cur = { path: [] as string[], body: [] as string[] };
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence && /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      if (cur.body.join("").trim()) sections.push(cur);
      const level = h[1].length;
      stack.length = level - 1;
      stack[level - 1] = h[2].trim();
      cur = { path: stack.filter(Boolean), body: [] };
    } else cur.body.push(line);
  }
  if (cur.body.join("").trim()) sections.push(cur);

  const out: Omit<Chunk, "terms" | "len">[] = [];
  for (const s of sections) {
    const paras = s.body.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let buf = "";
    const flush = () => {
      if (!buf.trim()) return;
      out.push({ id: `${docId}#${out.length}`, docId, kind, breadcrumb: s.path.join(" > "), text: buf.trim() });
      buf = "";
    };
    for (const p of paras) {
      if (buf && buf.length + p.length > MAX_CHUNK_CHARS) flush();
      buf += (buf ? "\n\n" : "") + p;
    }
    flush();
  }
  return out;
}

let index: Index | null = null;

function build(): Index {
  const chunks: Chunk[] = [];
  for (const f of walk(DOCS_DIR)) {
    for (const c of chunkFile(f)) {
      const terms = new Map<string, number>();
      // The breadcrumb counts as text: section titles carry much of the meaning in rules documents.
      const toks = tokenize(`${c.breadcrumb} ${c.breadcrumb} ${c.text}`);
      for (const t of toks) terms.set(t, (terms.get(t) ?? 0) + 1);
      chunks.push({ ...c, terms, len: toks.length });
    }
  }
  const df = new Map<string, number>();
  for (const c of chunks) for (const t of c.terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = chunks.reduce((s, c) => s + c.len, 0) / Math.max(1, chunks.length);
  return { chunks, df, avgLen };
}

export function lexicalAvailable(): boolean {
  return existsSync(DOCS_DIR);
}

/** BM25 search. `hyde` (a hypothetical answer) is added to the query at half weight, as the vector search does. */
export function lexicalSearch(question: string, opts: { k?: number; hyde?: string; scope?: "rules" | "test" | "all" } = {}): Passage[] {
  index ??= build();
  const { chunks, df, avgLen } = index;
  const scope = opts.scope ?? "rules";
  const N = chunks.length;
  const qWeights = new Map<string, number>();
  for (const t of tokenize(question)) qWeights.set(t, (qWeights.get(t) ?? 0) + 1);
  if (opts.hyde) for (const t of tokenize(opts.hyde)) qWeights.set(t, (qWeights.get(t) ?? 0) + 0.5);

  const k1 = 1.4, b = 0.75;
  const scored: { c: Chunk; s: number }[] = [];
  for (const c of chunks) {
    if (scope === "rules" && c.kind !== "rules") continue;
    if (scope === "test" && c.kind !== "test_listing") continue;
    let s = 0;
    for (const [t, qw] of qWeights) {
      const tf = c.terms.get(t);
      if (!tf) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      s += qw * idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * c.len) / avgLen)));
    }
    if (s > 0) scored.push({ c, s });
  }
  scored.sort((p, q) => q.s - p.s);
  const top = scored.slice(0, opts.k ?? 6);
  const best = top[0]?.s ?? 1;
  return top.map(({ c, s }, i) => ({ label: `P${i + 1}`, id: c.id, docId: c.docId, section: c.breadcrumb, text: c.text, distance: Math.round((1 - s / best) * 1000) / 1000 }));
}
