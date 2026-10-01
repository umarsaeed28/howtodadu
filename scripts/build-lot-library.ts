/**
 * Build the Seattle DADU lot library.
 *   npm run build:lots
 * Finds existing single-family homes in the NR zone from current PARCEL_GEO, joins the
 * ADUniverse site factors by PIN, scores every lot with the report's own scoring, and writes
 * data/lot-library.json.
 * Run it again when the city refreshes the layer, or on a weekly schedule.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fetchAllCandidates } from "../src/lib/server/candidates";
import { encodeLibrary, zipCounts } from "../src/lib/lot-library";

async function main() {
  const t0 = Date.now();
  const rows = await fetchAllCandidates((stage, done, total) => {
    if (done % 5 === 0 || done === total) process.stdout.write(`\r${stage} pages ${done}/${total}   `);
  });
  process.stdout.write("\n");
  const file = encodeLibrary(rows, "ADUniverse_feasibility_factors (Seattle ArcGIS)");
  mkdirSync("data", { recursive: true });
  writeFileSync("data/lot-library.json", JSON.stringify(file));
  const tops = rows.filter((r) => r.topPick).length;
  console.log(`${rows.length} lots, ${tops} top picks, ${zipCounts(file).length} ZIP codes, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
