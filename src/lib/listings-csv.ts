import type { MapListing } from "@/app/api/map-listings/route";

const TIER_LABEL: Record<number, string> = { 3: "Top pick", 2: "Good", 1: "Fair", 0: "Marginal" };

const COLUMNS: [string, (l: MapListing) => string | number | boolean | null][] = [
  ["MLS ID", (l) => l.mlsId],
  ["Address", (l) => l.address],
  ["ZIP", (l) => l.zip],
  ["Latitude", (l) => l.lat],
  ["Longitude", (l) => l.lng],
  ["Parcel (PIN)", (l) => l.pin],
  ["Status", (l) => l.status],
  ["Price", (l) => l.price],
  ["Beds", (l) => l.beds],
  ["Baths", (l) => l.baths],
  ["House sqft", (l) => l.sqft],
  ["Price per sqft", (l) => (l.sqft ? Math.round(l.price / l.sqft) : null)],
  ["Lot sqft", (l) => l.lotSqft],
  ["Days on market", (l) => l.daysOnMarket],
  ["DADU site score", (l) => l.score],
  ["DADU grade", (l) => TIER_LABEL[l.tier] ?? ""],
  ["Max DADU sqft", (l) => l.daduSqft],
  ["Corner lot", (l) => (l.corner ? "Yes" : "No")],
  ["Alley access", (l) => (l.alley ? "Yes" : "No")],
  ["Sample data", (l) => (l.test ? "Yes" : "No")],
];

/** Quote a cell, and neutralise spreadsheet formulas (=, +, -, @) in text so a hostile address cannot run in Excel. */
function cell(v: string | number | boolean | null): string {
  if (v == null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function listingsToCsv(rows: MapListing[]): string {
  const head = COLUMNS.map(([h]) => cell(h)).join(",");
  const body = rows.map((l) => COLUMNS.map(([, f]) => cell(f(l))).join(","));
  return `﻿${[head, ...body].join("\r\n")}\r\n`;
}

export function downloadListingsCsv(rows: MapListing[], zips: string[]): void {
  const blob = new Blob([listingsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pencil-dadu-lots${zips.length ? `-${zips.join("-")}` : "-seattle"}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
