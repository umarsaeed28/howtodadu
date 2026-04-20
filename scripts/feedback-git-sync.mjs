#!/usr/bin/env node
/**
 * Regenerates digest + commits data/feedback/*. Used by POST /api/feedback and `npm run feedback:git-sync`.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

if (process.env.FEEDBACK_AUTO_GIT_COMMIT === "0") {
  process.exit(0);
}
if (process.env.CI === "true" || process.env.VERCEL === "1") {
  process.exit(0);
}

process.chdir(root);

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "pipe" });
} catch {
  console.warn("[feedback-git-sync] not a git repo — skipping");
  process.exit(0);
}

try {
  execSync("node scripts/feedback-digest.mjs", { stdio: "pipe" });
} catch {
  /* non-fatal */
}

try {
  execSync("git add -- data/feedback/entries.jsonl data/feedback/digest.md", {
    stdio: "pipe",
  });
} catch (e) {
  console.warn("[feedback-git-sync] git add failed", e);
  process.exit(0);
}

let hasStaged = false;
try {
  execSync("git diff --cached --quiet", { stdio: "pipe" });
} catch {
  hasStaged = true;
}

if (!hasStaged) {
  process.exit(0);
}

try {
  execSync('git commit -m "chore(feedback): update ML feedback data" --no-verify', {
    stdio: "pipe",
  });
  console.log("[feedback-git-sync] committed data/feedback/");
} catch (e) {
  console.warn("[feedback-git-sync] git commit failed — set user.name / user.email?", e);
  process.exit(0);
}
