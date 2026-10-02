/**
 * Builds the TEST listings dataset (sample data for development; real data will come from the live feed). Inputs:
 *   data/test-data/nwmls-export.tsv   the MLS export (the user's list: 79 listings)
 *   data/test-data/redfin-hand-read.json           listings read by hand from Redfin pages (HOA, lot, year, notes, schools)
 * Each listing is joined to city GIS (cached in data/test-data/.gis-cache.json). Outputs:
 *   data/test-data/properties.json   labelled dataset
 *   rag/documents/test-listings/<slug>.md      one RAG document per property (re-index: cd rag && python -m seattle_rag ingest)
 *   data/test-data/listings.fixture.json     what the map shows when LISTINGS_PROVIDER=fixture
 * Labels come from deterministic rules, never a model (see labelOf). Run: npm run build:dataset
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { generateADUReport } from "../src/lib/adu-analysis";
import { buildFeasibilityTableRow } from "../src/lib/feasibility-table-model";
import { getFeasibilityForAddress } from "../src/lib/server/feasibility-query";
import { MIN_DADU_SQFT } from "../src/lib/server/candidates";

type Hand = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const raw = JSON.parse(readFileSync("data/test-data/redfin-hand-read.json", "utf8")) as { retrievedAt: string; properties: Hand[] };
const CACHE = "data/test-data/.gis-cache.json";
const cache: Record<string, any> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {}; // eslint-disable-line @typescript-eslint/no-explicit-any

const norm = (a: string) => a.toLowerCase().replace(/\bne\b/g, "ne").replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (a: string, mls: string) => `${a.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${mls.slice(-4)}`;
const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v <= 1 ? v * 100 : v));
const isUnit = (a: string) => /#|\b\d+\s[A-Z]\s\d|\bHouse [A-Z]\b/.test(a);
const stripUnit = (a: string) => a.replace(/\s*#.*$/, "").replace(/\sHouse [A-Z]\b/, "").replace(/^(\d+)\s[A-Z]\s/, "$1 ");

async function gisFor(address: string) {
  const q = stripUnit(address);
  if (cache[q]) return cache[q];
  if (Object.keys(cache).length % 15 === 0) writeFileSync(CACHE, JSON.stringify(cache)); // survive an interrupted run
  const r = await getFeasibilityForAddress(`${q}, Seattle, WA`);
  if (!r.ok || !r.data.parcel || !r.data.feasibility) return (cache[q] = { error: r.ok ? "no parcel found" : r.error });
  const { parcel, feasibility, coordinates } = r.data;
  const report = generateADUReport(parcel, feasibility);
  const row = report ? buildFeasibilityTableRow(r.data, report) : null;
  return (cache[q] = {
    lat: coordinates.lat, lng: coordinates.lng, zip: parcel.zip, pin: parcel.pin, zoning: parcel.baseZone ?? parcel.zoning, cityLotSqft: parcel.lotSqft,
    lotType: feasibility.lotType, alley: feasibility.hasAlley, lotWidth: feasibility.lotWidth, lotDepth: feasibility.lotDepth,
    canopyPct: pct(feasibility.treeCanopyPercent), steepPct: pct(feasibility.steepSlopePercent), existingAdus: feasibility.totalADU,
    nearbyAdus: (feasibility.nearbyDADU ?? 0) + (feasibility.nearbyAADU ?? 0), score: row?.daduScore ?? null,
    daduSqft: report?.daduFootprint?.buildableSqft ?? null, daduMaxAllowedSqft: report?.daduFootprint?.maxAllowedSqft ?? null,
  });
}

/** House photos from the King County Assessor's public property record (eRealProperty), by parcel number. Cached. */
const KC = "https://blue.kingcounty.com/Assessor/eRealProperty";
async function assessorPhotos(pin: string | null | undefined): Promise<string[]> {
  if (!pin) return [];
  try {
    const res = await fetch(`${KC}/Detail.aspx?ParcelNbr=${pin}`, { headers: { "User-Agent": "Mozilla/5.0 (Pencil dataset build)" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    // Only the building photos ("Current Picture"); the record also links floor-plan sketches.
    const ids = [...new Set([...(await res.text()).matchAll(/<img[^>]*_CurrentImage"[^>]*src="MediaHandler\.aspx\?Media=(\d+)"/g)].map((m) => m[1]))];
    return ids.slice(0, 6).map((id) => `${KC}/MediaHandler.aspx?Media=${id}`);
  } catch {
    return [];
  }
}

/** Deterministic label. HOA known and above zero wins; unknown HOA can never produce "candidate". */
function labelOf(p: Hand, g: any): { label: string; why: string } { // eslint-disable-line @typescript-eslint/no-explicit-any
  if ((p.hoaMonthly ?? 0) > 0) return { label: "excluded", why: `HOA dues of $${p.hoaMonthly} per month. A property with an HOA is never a DADU candidate.` };
  if (g.error) return { label: "unverified", why: `City lookup failed (${g.error}). Confirm the lot and zoning by hand.` };
  if (/^(LR|MR|NC|C1|C2|SM|IC|IB|IG|HR|BN|RSL)/i.test(String(g.zoning ?? ""))) return { label: "unverified", why: `Zoned ${g.zoning}, outside the Neighborhood Residential rules this knowledge base covers. Confirm the DADU rules for this zone.` };
  if (isUnit(p.address)) return { label: "unverified", why: "A unit in a multi-unit building. A DADU belongs to a lot, so check who owns the land and whether an HOA or condo association applies." };
  if (g.daduSqft == null || g.daduSqft < MIN_DADU_SQFT) return { label: "not_candidate", why: g.daduSqft == null ? "The engine found no room for a DADU." : `The engine caps the DADU at ${g.daduSqft} sf, below the ${MIN_DADU_SQFT} sf minimum worth building.` };
  if ((g.existingAdus ?? 0) >= 2) return { label: "not_candidate", why: "The lot already has the maximum two ADUs." };
  if (p.hoaMonthly == null) return { label: "unverified", why: `A DADU of up to ${g.daduSqft} sf fits (site score ${g.score} out of 100), but the HOA is not reported. Confirm there is none.` };
  return { label: "candidate", why: `A DADU of up to ${g.daduSqft} sf fits (site score ${g.score} out of 100).` };
}

async function main() {
  const rows = readFileSync("data/test-data/nwmls-export.tsv", "utf8").trim().split("\n").slice(1).map((l) => {
    const [mls, address, area, price, dom, beds, baths, sqft, statDate] = l.split("\t");
    return { mls, address, area, price: +price, dom: +dom, beds: +beds, baths: +baths, sqft: +sqft, statDate };
  });
  const handByMls = new Map(raw.properties.map((h) => [String(h.mls), h]));
  const handByAddr = new Map(raw.properties.map((h) => [norm(h.address), h]));

  const merged: Hand[] = rows.map((r) => {
    const h = handByMls.get(r.mls) ?? handByAddr.get(norm(r.address));
    return { ...(h ?? {}), address: h?.address ?? r.address, mls: r.mls, area: r.area, price: r.price, beds: r.beds, baths: r.baths, sqft: r.sqft, daysOnMarket: r.dom, statusDate: r.statDate, status: h?.status ?? "For sale", type: h?.type ?? (isUnit(r.address) ? "Unit" : "Single-family"), sources: h ? ["NWMLS export", "Redfin page"] : ["NWMLS export"] };
  });
  const inExport = new Set(merged.map((m) => norm(m.address) + "|" + m.mls));
  for (const h of raw.properties) if (!merged.some((m) => m.mls === String(h.mls) || norm(m.address) === norm(h.address))) merged.push({ ...h, mls: String(h.mls), sources: ["Redfin page"] });
  void inExport;

  // City lookups, four at a time.
  const queue = [...merged];
  await Promise.all(Array.from({ length: 4 }, async () => { for (let p = queue.shift(); p; p = queue.shift()) { try { await gisFor(p.address); } catch (e) { cache[stripUnit(p.address)] = { error: e instanceof Error ? e.message.slice(0, 80) : "failed" }; } } }));
  writeFileSync(CACHE, JSON.stringify(cache));

  // Assessor house photos, four at a time, once per parcel (kept in the GIS cache).
  const needPhotos = [...new Set(merged.map((p) => stripUnit(p.address)))].filter((q) => cache[q]?.pin && !cache[q].photos);
  await Promise.all(Array.from({ length: 4 }, async () => { for (let q = needPhotos.shift(); q; q = needPhotos.shift()) cache[q].photos = await assessorPhotos(cache[q].pin); }));
  writeFileSync(CACHE, JSON.stringify(cache));

  rmSync("rag/documents/test-listings", { recursive: true, force: true });
  mkdirSync("rag/documents/test-listings", { recursive: true });
  const out: Hand[] = [];
  const fixture: Hand[] = [];
  const seen = new Set<string>();
  for (const p of merged) {
    const g = cache[stripUnit(p.address)];
    const { label, why } = labelOf(p, g);
        const conflicts: string[] = [...(p.conflicts ?? [])];
    if (p.lotSqft && g.cityLotSqft && Math.abs(p.lotSqft - g.cityLotSqft) / g.cityLotSqft > 0.1 && !conflicts.some((c) => /lot/i.test(c))) conflicts.push(`Listing lot is ${p.lotSqft.toLocaleString()} sf but city GIS shows ${g.cityLotSqft.toLocaleString()} sf.`);
    const dup = rows.filter((r) => norm(r.address) === norm(p.address)).length > 1;
    if (dup) conflicts.push("The same address appears under more than one MLS number in the export.");
    const id = `test-${p.mls}`;
    const pics: string[] = g.photos?.length ? g.photos : [];
    const rec = { ...p, id, zip: g.zip ?? "98105", lat: g.lat ?? null, lng: g.lng ?? null, photos: pics, gis: g, label, why, conflicts, dataKind: "test", source: p.sources.join(" + "), retrievedAt: raw.retrievedAt };
    out.push(rec);

    const hoa = p.hoaMonthly;
    const file = slug(p.address, String(p.mls));
    const md = `# ${p.address}, Seattle ${rec.zip}

> **TEST DATA, not a live listing.** Listing dataset record, retrieved ${raw.retrievedAt} (${rec.source}, MLS ${p.mls}). Screening label: **${label}**.

## Listing facts
- Price: $${p.price.toLocaleString("en-US")}. Status: ${p.status}.${p.daysOnMarket != null ? ` ${p.daysOnMarket} days on market.` : ""}
- ${p.beds} beds, ${p.baths} baths, ${p.sqft.toLocaleString()} sf${p.yearBuilt ? `, built ${p.yearBuilt}` : ""}. ${p.type}.${p.neighborhood ? ` Neighborhood: ${p.neighborhood}.` : ""}
- ${p.lotSqft ? `Lot per listing: ${p.lotSqft.toLocaleString()} sf. ` : ""}HOA: ${hoa == null ? "not reported" : hoa > 0 ? `$${hoa} per month` : "none"}.
${p.summary ? `- ${p.summary}\n` : ""}${(p.notes ?? []).map((n: string) => `- Note: ${n}`).join("\n")}

## City GIS facts
${g.error ? `- City lookup failed: ${g.error}.` : `- Lot per city: ${g.cityLotSqft?.toLocaleString()} sf, ${g.lotType ?? "unknown"} lot, ${g.lotWidth ?? "?"} ft wide by ${g.lotDepth ?? "?"} ft deep. Alley: ${g.alley ? "yes" : "no"}. Zoning: ${g.zoning}.
- Tree canopy: ${g.canopyPct ?? "unknown"}%. Steep slope: ${g.steepPct ? `${g.steepPct}% of lot` : "none"}. Existing ADUs on the lot: ${g.existingAdus ?? "unknown"}. ADUs nearby: ${g.nearbyAdus}.
- Largest DADU the lot allows: ${g.daduSqft ?? "none found"} sf (code allows up to ${g.daduMaxAllowedSqft ?? "n/a"} sf). Site score: ${g.score ?? "n/a"} out of 100.`}

## DADU screening outcome
${label === "excluded" ? "Excluded." : label === "candidate" ? "Candidate." : label === "unverified" ? "Unverified." : "Not a candidate."} ${why}
${conflicts.length ? `\n## Conflicts to confirm\n${conflicts.map((c) => `- ${c}`).join("\n")}\n` : ""}`;
    writeFileSync(`rag/documents/test-listings/${file}.md`, md);

    if (g.lat == null || seen.has(id)) continue;
    seen.add(id);
    fixture.push({
      mlsId: id, address: `${stripUnit(p.address)}, Seattle, WA ${rec.zip}`, city: "Seattle", zip: rec.zip, lat: g.lat, lng: g.lng, listPrice: p.price,
      lotSqft: p.lotSqft ?? g.cityLotSqft ?? 0, livingSqft: p.sqft, yearBuilt: p.yearBuilt, beds: p.beds, baths: p.baths, daysOnMarket: p.daysOnMarket,
      status: String(p.status).toLowerCase().replace(/\s+/g, "_").replace("for_sale", "active"), photos: pics, listingUrl: p.redfinUrl,
      propertyType: p.type, hoaMonthly: hoa, updatedAt: `${raw.retrievedAt}T00:00:00Z`,
      detail: p.summary ? { description: p.summary, photos: pics, propertyType: p.type, hoaMonthly: hoa, priceHistory: [], taxHistory: [], schools: (p.schools ?? []).map((s: any) => ({ name: s.name, rating: s.rating, level: s.level })), scores: p.scores ?? {} } : undefined, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
  }
  const counts: Record<string, number> = {};
  for (const r of out) counts[r.label] = (counts[r.label] ?? 0) + 1;
  writeFileSync("data/test-data/properties.json", JSON.stringify({ dataKind: "test", note: "Sample data for development. Replace with the live Redfin feed once it is connected.", generatedAt: new Date().toISOString(), count: out.length, labels: counts, properties: out }, null, 1));
  writeFileSync("data/test-data/listings.fixture.json", JSON.stringify(fixture, null, 1));
  console.log(`Wrote ${out.length} records.`, counts, `map fixture: ${fixture.length}`);
}
main();
