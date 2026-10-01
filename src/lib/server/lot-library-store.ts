import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { decodeLibrary, makeLotFinder, zipCounts, type LotLibraryFile } from "@/lib/lot-library";
import type { Candidate } from "./candidates";

const FILE = join(process.cwd(), "data", "lot-library.json");

interface Loaded {
  file: LotLibraryFile;
  byPin: Map<string, number>;
  all: Candidate[] | null;
  find: ReturnType<typeof makeLotFinder> | null;
}
let loaded: Loaded | null = null;
let mtime = 0;

export function libraryAvailable(): boolean {
  return existsSync(FILE);
}

function load(): Loaded | null {
  if (!existsSync(FILE)) return null;
  const m = statSync(FILE).mtimeMs;
  if (loaded && m === mtime) return loaded;
  const file = JSON.parse(readFileSync(FILE, "utf8")) as LotLibraryFile;
  const byPin = new Map<string, number>();
  file.cols.pin.forEach((p, i) => byPin.set(p, i));
  loaded = { file, byPin, all: null, find: null };
  mtime = m;
  return loaded;
}

export interface SlimLots {
  count: number;
  pin: string[];
  lat: number[];
  lng: number[];
  score: number[];
  tier: number[];
  /** bit 1 corner, bit 2 alley */
  flags: number[];
  zip: (string | null)[];
}

/** Slim columnar payload for the map: just what is needed to color and join lots. */
export function getSlimLots(zips: string[] | null): { generatedAt: string; zips: ReturnType<typeof zipCounts>; lots: SlimLots } | null {
  const l = load();
  if (!l) return null;
  const c = l.file.cols;
  const want = zips && zips.length ? new Set(zips) : null;
  const out: SlimLots = { count: 0, pin: [], lat: [], lng: [], score: [], tier: [], flags: [], zip: [] };
  for (let i = 0; i < l.file.count; i++) {
    if (c.tier[i] < 1) continue; // top picks, good and fair lots (score 74 and up); anything lower has no DADU room
    if (want && !(c.zip[i] && want.has(c.zip[i]!))) continue;
    out.pin.push(c.pin[i]);
    out.lat.push(c.lat[i]);
    out.lng.push(c.lng[i]);
    out.score.push(c.score[i]);
    out.tier.push(c.tier[i]);
    out.flags.push(c.corner[i] | (c.alley[i] << 1));
    out.zip.push(c.zip[i]);
  }
  out.count = out.pin.length;
  return { generatedAt: l.file.generatedAt, zips: zipCounts(l.file), lots: out };
}

export function getLot(pin: string): Candidate | null {
  const l = load();
  if (!l) return null;
  const i = l.byPin.get(pin);
  if (i === undefined) return null;
  const one = { ...l.file, count: 1, cols: Object.fromEntries(Object.entries(l.file.cols).map(([k, v]) => [k, [(v as unknown[])[i]]])) } as unknown as LotLibraryFile;
  return decodeLibrary(one)[0] ?? null;
}

export function findNearestLot(lat: number, lng: number, maxMeters = 40): Candidate | null {
  const l = load();
  if (!l) return null;
  if (!l.all) {
    l.all = decodeLibrary(l.file);
    l.find = makeLotFinder(l.all);
  }
  return l.find!(lat, lng, maxMeters);
}

const streetKey = (a: string) => a.split(",")[0].toUpperCase().replace(/\s+\d{5}$/, "").replace(/[^A-Z0-9]+/g, " ").trim();

/**
 * The library lot that is this listing's own parcel. The nearest lot is not enough: a neighbour can be closer
 * to the geocoded point than the listing's own lot, which would give a listing someone else's score. The street
 * address must match. Returns null when the listing's lot is not in the library (not an eligible single-family
 * lot, or the DADU engine found no room), which is the honest answer.
 */
export function findLotForListing(address: string, lat: number, lng: number): Candidate | null {
  const near = findNearestLot(lat, lng, 60);
  return near && streetKey(near.address) === streetKey(address) ? near : null;
}
