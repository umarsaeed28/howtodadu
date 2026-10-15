/**
 * Knowledge-base documents: markdown with an optional front-matter block that says where the text came from.
 * One chunker serves the built-in keyword search, the Supabase ingest and the evals, so every path cuts the same chunks.
 *
 *   ---
 *   title: Accessory dwelling units
 *   citation: SMC 23.42.022
 *   source_url: https://library.municode.com/wa/seattle/codes/municipal_code?nodeId=...
 *   publisher: City of Seattle
 *   effective_date: 2026-01-21
 *   retrieved_at: 2026-10-15
 *   ---
 */

export type DocKind = "rules" | "test_listing";

export interface DocMeta {
  title?: string;
  citation?: string;
  source_url?: string;
  publisher?: string;
  effective_date?: string;
  retrieved_at?: string;
}

export interface MdChunk {
  idx: number;
  breadcrumb: string;
  text: string;
}

const META_KEYS = new Set<keyof DocMeta>(["title", "citation", "source_url", "publisher", "effective_date", "retrieved_at"]);

/** Splits off a leading `---` block of `key: value` lines. Unknown keys are ignored; quotes around values are dropped. */
export function parseFrontmatter(raw: string): { meta: DocMeta; body: string } {
  const text = raw.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta: DocMeta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^\s*([a-z_]+)\s*:\s*(.*?)\s*$/i.exec(line);
    if (!kv) continue;
    const key = kv[1].toLowerCase() as keyof DocMeta;
    const value = kv[2].replace(/^(["'])(.*)\1$/, "$2").trim();
    if (META_KEYS.has(key) && value) meta[key] = value;
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Test listings live under test-listings/; everything else is a rule or guidance document. */
export function kindOf(relPath: string): DocKind {
  return relPath.replace(/\\/g, "/").startsWith("test-listings") ? "test_listing" : "rules";
}

/** The front-matter title, else the first heading, else the file name. */
export function docTitle(meta: DocMeta, body: string, fallback: string): string {
  if (meta.title) return meta.title;
  const h = /^#{1,6}\s+(.+?)\s*#*\s*$/m.exec(body);
  return h ? h[1].trim() : fallback;
}

/** Split on headings, keeping the heading path, then pack paragraphs up to `maxChars`. Code fences never split. */
export function chunkMarkdown(body: string, maxChars = 1400): MdChunk[] {
  const sections: { path: string[]; body: string[] }[] = [];
  const stack: string[] = [];
  let cur = { path: [] as string[], body: [] as string[] };
  let inFence = false;
  for (const line of body.split("\n")) {
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

  const out: MdChunk[] = [];
  for (const s of sections) {
    const paras = s.body.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let buf = "";
    const flush = () => {
      if (!buf.trim()) return;
      out.push({ idx: out.length, breadcrumb: s.path.join(" > "), text: buf.trim() });
      buf = "";
    };
    for (const p of paras) {
      if (buf && buf.length + p.length > maxChars) flush();
      buf += (buf ? "\n\n" : "") + p;
    }
    flush();
  }
  return out;
}
