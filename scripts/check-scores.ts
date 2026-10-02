/**
 * Check that the map and the full report agree on a lot's score.
 *   npm run check:scores            (40 random lots)
 *   npm run check:scores -- 100     (more)
 * The map reads data/lot-library.json, scored at build time; the report scores the same lot live. Both go through
 * scoreSite with the same tree measurement, so they should match. Exits 1 if any lot differs by more than 2 points,
 * or lands on the other side of the 75 cut-off. Run it after every `npm run build:lots`.
 */
import { readFileSync } from "node:fs";
import { decodeLibrary, type LotLibraryFile } from "../src/lib/lot-library";
import { getFeasibilityForAddress } from "../src/lib/server/feasibility-query";
import { generateADUReport } from "../src/lib/adu-analysis";
import { siteScoreFor } from "../src/lib/feasibility-table-model";
import { MIN_SHOWN_SCORE } from "../src/lib/dadu-score";

async function main() {
  const n = Number(process.argv[2] ?? 40);
  const lots = decodeLibrary(JSON.parse(readFileSync("data/lot-library.json", "utf8")) as LotLibraryFile);
  // A fixed stride through the library, so reruns check the same lots.
  const sample = Array.from({ length: n }, (_, i) => lots[Math.floor(((i + 0.5) * lots.length) / n)]);
  let bad = 0;
  for (const lot of sample) {
    const r = await getFeasibilityForAddress(`${lot.address}, Seattle, WA`);
    if (!r.ok) { console.log(`skip  ${lot.address}: ${r.error}`); continue; }
    const report = generateADUReport(r.data.parcel, r.data.feasibility);
    if (!report) { console.log(`skip  ${lot.address}: no report`); continue; }
    const live = siteScoreFor(r.data, report).score;
    const off = Math.abs(live - lot.score) > 2 || (live >= MIN_SHOWN_SCORE) !== (lot.score >= MIN_SHOWN_SCORE);
    if (off) bad++;
    console.log(`${off ? "DIFF" : "ok  "}  ${String(lot.score).padStart(3)} map  ${String(live).padStart(3)} report  ${lot.address}${off ? `  trees map ${JSON.stringify(lot.trees)} live ${JSON.stringify({ ...r.data.feasibility?.treeStats, clearSpot: undefined })}` : ""}`);
  }
  console.log(`${bad} of ${sample.length} differ`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
