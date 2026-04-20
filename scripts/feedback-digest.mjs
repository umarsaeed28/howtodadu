#!/usr/bin/env node
/**
 * Aggregates local feedback JSONL into a digest for humans + future agent/CI.
 * Run after builds: npm run postbuild (or `node scripts/feedback-digest.mjs`).
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const entriesPath = path.join(root, "data", "feedback", "entries.jsonl");
const digestPath = path.join(root, "data", "feedback", "digest.md");

let lines = [];
try {
  const raw = await readFile(entriesPath, "utf8");
  lines = raw.split("\n").filter(Boolean);
} catch {
  console.log("[feedback-digest] no entries.jsonl yet — skipping");
  process.exit(0);
}

const records = [];
for (const line of lines) {
  try {
    records.push(JSON.parse(line));
  } catch {
    /* skip bad line */
  }
}

const down = records.filter((r) => r.rating === "down");
const up = records.filter((r) => r.rating === "up");
const reasons = down.map((r) => (r.negativeReason || "").trim()).filter(Boolean);

const byReason = new Map();
for (const r of reasons) {
  const key = r.slice(0, 120);
  byReason.set(key, (byReason.get(key) || 0) + 1);
}
const sorted = [...byReason.entries()].sort((a, b) => b[1] - a[1]);

const md = [
  `# Feedback digest (generated)`,
  ``,
  `- Total entries: ${records.length}`,
  `- Thumbs up: ${up.length}`,
  `- Thumbs down: ${down.length}`,
  `- Generated: ${new Date().toISOString()}`,
  ``,
  `## Top negative reasons`,
  ``,
  sorted.length
    ? sorted.map(([text, n]) => `- (${n}×) ${text}`).join("\n")
    : `_No negative reasons recorded._`,
  ``,
  `## Next steps for rules / scoring`,
  ``,
  `1. Review clustered reasons above.`,
  "2. Update `src/lib/dadu-rules-engine/` or `src/lib/adu-analysis.ts` thresholds.",
  "3. Bump `FEEDBACK_RULESET_VERSION` in `src/lib/analysis-feedback/constants.ts`.",
  ``,
].join("\n");

await mkdir(path.dirname(digestPath), { recursive: true });
await writeFile(digestPath, md, "utf8");
console.log(`[feedback-digest] wrote ${digestPath}`);
