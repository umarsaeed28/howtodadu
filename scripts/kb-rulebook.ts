/** Writes rag/documents/22-pencil-rulebook.md from the rulebook (src/lib/rules/seattle-adu.ts). Run: npm run kb:rulebook */
import { writeFileSync } from "node:fs";
import { renderRulebookDoc } from "../src/lib/rules/render";

const path = "rag/documents/22-pencil-rulebook.md";
writeFileSync(path, renderRulebookDoc());
console.log(`wrote ${path}`);
