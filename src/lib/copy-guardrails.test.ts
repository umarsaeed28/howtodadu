import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/*
 * Copy guardrails from the product brief, enforced on the source:
 *  - never promise permit approval or approval timelines;
 *  - never call a custom or modified plan "pre-approved";
 *  - never present feasibility as a certification, a guarantee or legal advice.
 */
const ROOTS = ["src/app", "src/components", "src/lib/pricing.ts"];
const files = (p: string): string[] => {
  const s = statSync(p);
  if (s.isFile()) return /\.(tsx?|md)$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  return readdirSync(p).flatMap((f) => files(path.join(p, f)));
};
const all = ROOTS.flatMap((r) => files(path.join(process.cwd(), r)));
// Only user-facing strings matter: JSX text and string literals. Comments are stripped first.
const text = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("copy guardrails", () => {
  it("never promises approval", () => {
    const bad = all.filter((f) => /\b(will be approved|guaranteed approval|approval guaranteed|approved in \d|permit in \d+ (days|weeks))/i.test(text(f)));
    expect(bad).toEqual([]);
  });

  it("never presents feasibility as certified, stamped or legal advice (except the disclaimer that says it is not)", () => {
    const bad = all.filter((f) => {
      const t = text(f).replace(/not (a )?stamped professional certification/gi, "").replace(/is not a professional certification/gi, "").replace(/a professional certification\?/gi, "");
      // "Not a final determination, legal advice, or a permit approval" is a disclaimer, so a "not" shortly before is fine.
      const noDisclaimers = t.replace(/\bnot\b[^.]{0,80}?legal advice/gi, "");
      return /\b(certified (report|feasibility)|stamped (report|feasibility)|legal advice)\b/i.test(noDisclaimers);
    });
    expect(bad).toEqual([]);
  });

  it("never calls a custom or draft plan pre-approved", () => {
    const customFiles = all.filter((f) => /[\\/](custom|permit)[\\/]|Custom|Draft|layout\.ts$/.test(f));
    const bad = customFiles.filter((f) => /pre-approved|preapproved|city-reviewed/i.test(text(f).replace(/never call[^.]*pre-approved/gi, "")));
    expect(bad).toEqual([]);
  });
});
