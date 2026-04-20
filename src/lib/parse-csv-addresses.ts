/**
 * Parse Seattle addresses from CSV text or plain newline-separated lines.
 * Uses an `address` column when headers match; otherwise one address per line.
 */

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuote = false;
  while (i < line.length) {
    const c = line[i]!;
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (c === ",") {
      out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  out.push(cur.trim());
  return out;
}

function findAddressColumn(header: string[]): number {
  const h = header.map((cell) =>
    cell.toLowerCase().replace(/^\ufeff/, "").trim()
  );
  const needles = [
    "address",
    "street",
    "property address",
    "site address",
    "location",
    "full address",
  ];
  for (let col = 0; col < h.length; col++) {
    const cell = h[col]!;
    for (const n of needles) {
      if (cell === n || cell.includes(n)) return col;
    }
  }
  return -1;
}

function isProbablyHeaderLine(line: string): boolean {
  const first = parseCsvLine(line)[0]?.toLowerCase().replace(/^\ufeff/, "") ?? "";
  return (
    first === "address" ||
    first.startsWith("address") ||
    /^address\s*,/i.test(line.trim())
  );
}

export function parseAddressesFromCsvText(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstRow = parseCsvLine(lines[0]!);
  const addrCol = findAddressColumn(firstRow);
  const seen = new Set<string>();
  const out: string[] = [];

  if (addrCol >= 0 && lines.length > 1) {
    for (let r = 1; r < lines.length; r++) {
      const row = parseCsvLine(lines[r]!);
      const cell = row[addrCol]?.trim() ?? "";
      if (!cell) continue;
      const key = cell.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cell);
    }
    if (out.length > 0) return out;
  }

  for (const line of lines) {
    if (isProbablyHeaderLine(line)) continue;
    const t = line.includes(",") ? parseCsvLine(line)[0]?.trim() ?? "" : line;
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }

  return out;
}
