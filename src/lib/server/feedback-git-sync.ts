import { execSync } from "child_process";

/**
 * Regenerates digest and commits `data/feedback/*` (see `scripts/feedback-git-sync.mjs`).
 */
export function syncFeedbackToGit(): void {
  try {
    execSync("node scripts/feedback-git-sync.mjs", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  } catch {
    /* offline / no git / nothing to commit */
  }
}
