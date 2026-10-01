#!/usr/bin/env node
// Smoke test against a running dev server: node scripts/smoke.mjs [baseUrl]
const base = process.argv[2] ?? "http://localhost:3100";
let failed = 0;
const results = [];
async function check(name, fn) {
  try {
    const note = await fn();
    results.push(["PASS", name, note ?? ""]);
  } catch (e) {
    failed++;
    results.push(["FAIL", name, e.message]);
  }
}
const get = async (path, init) => {
  const r = await fetch(base + path, { ...init, signal: AbortSignal.timeout(120000) });
  const body = await r.text();
  return { status: r.status, body, json: () => JSON.parse(body) };
};
const expect = (c, msg) => { if (!c) throw new Error(msg); };

for (const p of ["/", "/about", "/calculator", "/feasibility", "/faq", "/contact"]) {
  await check(`page ${p}`, async () => { const r = await get(p); expect(r.status === 200, `HTTP ${r.status}`); });
}
await check("api/lots serves the lot library", async () => { const d = (await get("/api/lots?zip=98105")).json(); expect(d.lots?.count > 100, "no lots"); return `${d.lots.count} lots in 98105`; });
let listings = [];
await check("api/map-listings returns DADU-potential listings", async () => {
  const d = (await get("/api/map-listings?zip=98105")).json();
  expect(d.connected, "no listings feed connected");
  listings = d.listings; expect(listings.length > 0, "no listings on good lots");
  return `${listings.length} of ${d.scanned} listings sit on a good lot`;
});
const id = listings[0]?.mlsId;
await check("listing detail page renders", async () => {
  expect(id, "no listing to open");
  const r = await get(`/listing/${encodeURIComponent(id)}`);
  expect(r.status === 200, `HTTP ${r.status}`);
  expect(r.body.includes("DADU potential") && r.body.includes("Home facts"), "detail sections missing");
});
await check("listing detail 404s for unknown id", async () => { expect((await get("/listing/does-not-exist")).status === 404, "expected 404"); });
await check("api/feasibility returns a parcel", async () => { const d = (await get("/api/feasibility?address=" + encodeURIComponent("4545 5th Ave NE, Seattle, WA"))).json(); expect(d.parcel?.pin, "no parcel"); return d.parcel.pin; });
await check("RAG retrieves the no-HOA rule", async () => {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(process.cwd() + "/rag/.venv/bin/python", ["-m", "seattle_rag", "query", "can a property with an HOA be a DADU candidate", "-k", "2", "--json"], { cwd: "rag", stdio: ["ignore", "pipe", "ignore"] }).toString();
  const top = JSON.parse(out.trim().split("\n").pop())[0];
  expect(/HOA/i.test(top.text), "top passage is not the HOA rule"); return top.source;
});
await check("Claude + RAG assessment answers", async () => {
  const r = await get(`/api/assessment?id=${encodeURIComponent(id)}`);
  expect(r.status === 200, `HTTP ${r.status}: ${r.body.slice(0, 200)}`);
  const d = r.json(); expect(d.text?.length > 40 && d.model, "empty answer"); expect(d.sources.length > 0, "no RAG sources");
  return `${d.model}, ${d.sources.length} sources`;
});

for (const [s, n, note] of results) console.log(`${s}  ${n}${note ? `  (${note})` : ""}`);
console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
