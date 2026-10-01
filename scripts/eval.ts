/**
 * Evaluation, on the 3 axes:
 *   scope        component checks (retrieval recall, HOA gate) and end-to-end (full chain on the sample listings)
 *   determinism  objective (ids, schema, grounding validator) and subjective (LLM-as-judge against a rubric)
 *   metric       pass/fail and latency, plus the judge's written audit
 * Run: npm run eval        (component + objective checks need no key; end-to-end and judge need ANTHROPIC_API_KEY)
 */
import { readFileSync } from "node:fs";
import { AnthropicLlm, FAST_MODEL, REASONING_MODEL } from "../src/lib/ai/llm";
import { runAssessment } from "../src/lib/ai/orchestrator";
import { validateFindings } from "../src/lib/ai/validate";
import { ragSearch } from "../src/lib/server/rag";
import { findNearestLot } from "../src/lib/server/lot-library-store";
import type { RawListing } from "../src/lib/listings";

const golden = JSON.parse(readFileSync("evals/golden.json", "utf8"));
const rows: [string, string, string, string][] = []; // scope, name, result, detail
let failed = 0;
const rec = (scope: string, name: string, ok: boolean, detail = "") => { rows.push([scope, name, ok ? "PASS" : "FAIL", detail]); if (!ok) failed++; };

async function main() {
  // Component, objective: retrieval puts the expected document in the top results.
  for (const c of golden.retrieval) {
    const t0 = Date.now();
    const p = await ragSearch(c.query, { k: 4 });
    rec("component/objective", `retrieval: ${c.query}`, p.slice(0, 3).some((x) => x.docId === c.expectDoc), `${Date.now() - t0} ms, top: ${p[0]?.docId}`);
  }
  // Component, objective: the HOA gate never calls a model.
  for (const g of golden.gate) {
    let calls = 0;
    const llm = { async text() { calls++; return ""; }, async json() { calls++; return {} as never; } };
    const l = { mlsId: "g", address: "1 Test St", city: "Seattle", zip: "98105", lat: 0, lng: 0, listPrice: 1, lotSqft: 1, status: "active", photos: [], updatedAt: "", hoaMonthly: g.hoaMonthly } as RawListing;
    const a = await runAssessment(l, null, { llm, search: async () => [] });
    rec("component/objective", `gate: ${g.name}`, a.verdict === g.expect && calls === 0, `${calls} model calls`);
  }
  // Component, objective: the grounding validator rejects an invented number.
  const v = validateFindings([{ claim: "A 1,400 sf DADU fits.", cites: ["F1"] }], [], [{ label: "F1", text: "Largest DADU: 895 sf", source: "city GIS" }]);
  rec("component/objective", "validator rejects an invented number", v.kept.length === 0);

  // Dataset: the labelled 98105 properties are the golden set. Labels come from the deterministic rules, not a model.
  const data = JSON.parse(readFileSync("data/test-data/properties.json", "utf8")).properties as { address: string; hoaMonthly?: number; label: string; lat: number; lng: number; mls: string }[];
  for (const d of data.filter((x) => x.label !== "unverified")) {
    const l = { mlsId: d.mls, address: d.address, city: "Seattle", zip: "98105", lat: d.lat, lng: d.lng, listPrice: 1, lotSqft: 1, status: "active", photos: [], updatedAt: "", hoaMonthly: d.hoaMonthly } as RawListing;
    if (d.label === "excluded") {
      const a = await runAssessment(l, null, { llm: null as never, search: async () => [] });
      rec("dataset/objective", `${d.address}: HOA excludes`, a.verdict === "excluded");
    }
    const hit = (await ragSearch(`${d.address} listing`, { k: 3, scope: "test" })).some((p) => p.docId.includes(d.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")));
    rec("dataset/objective", `${d.address}: its record is retrievable`, hit);
  }

  // End to end + subjective judge, only with a key.
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    rows.push(["end-to-end", "full chain + LLM judge", "SKIP", "ANTHROPIC_API_KEY is not set"]);
  } else {
    const llm = new AnthropicLlm(key);
    const listings = JSON.parse(readFileSync(process.env.LISTINGS_FIXTURE_FILE ?? "data/test-data/listings.fixture.json", "utf8")) as RawListing[];
    const labelOf = new Map(data.map((d) => [d.mls, d.label]));
    for (const l of listings.slice(0, 4)) {
      const t0 = Date.now();
      try {
        const a = await runAssessment(l, findNearestLot(l.lat, l.lng), { llm, search: (q, o) => ragSearch(q, o) });
        const objective = a.findings.every((f) => f.cites.length > 0) && a.trace.every((t) => t.node);
        rec("end-to-end/objective", `${l.address.split(",")[0]}: cited, traced`, objective, `${Date.now() - t0} ms, ${a.verdict}`);
        const want = labelOf.get(l.mlsId.replace("test-", ""));
        const agree = want === "excluded" ? a.verdict === "excluded" : want === "candidate" ? a.verdict !== "excluded" && a.verdict !== "not_candidate" : true;
        rec("end-to-end/objective", `${l.address.split(",")[0]}: verdict agrees with dataset label (${want})`, agree, a.verdict);
        const judged = await llm.json<{ scores: { criterion: string; pass: boolean; note: string }[] }>({
          model: REASONING_MODEL, maxTokens: 700, toolName: "grade",
          system: "You grade an answer against a rubric. Be strict. Quote the exact words that fail a criterion.",
          user: `Rubric:\n${golden.rubric.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}\n\nAnswer:\n${a.text}`,
          schema: { type: "object", properties: { scores: { type: "array", items: { type: "object", properties: { criterion: { type: "string" }, pass: { type: "boolean" }, note: { type: "string" } }, required: ["criterion", "pass", "note"] } } }, required: ["scores"] },
        });
        const bad = judged.scores.filter((s) => !s.pass);
        rec("end-to-end/subjective", `${l.address.split(",")[0]}: judge (${FAST_MODEL === REASONING_MODEL ? "" : "rubric"})`, bad.length === 0, bad.map((b) => b.note).join(" | ").slice(0, 160));
      } catch (e) {
        rec("end-to-end", l.address, false, e instanceof Error ? e.message.slice(0, 120) : "failed");
      }
    }
  }
  for (const [s, n, r, d] of rows) console.log(`${r.padEnd(4)}  [${s}] ${n}${d ? `  (${d})` : ""}`);
  console.log(failed ? `\n${failed} failed` : "\nNo failures");
  process.exit(failed ? 1 : 0);
}
main();
