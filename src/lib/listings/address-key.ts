/** "610 N 125TH ST, Seattle, WA 98133", "610 N 125TH ST 98133" and "610 North 125th Street" -> "610 N 125TH ST". Unit numbers and suffix spelling folded. */
export function streetKey(address: string): string {
  return address
    .split(",")[0]
    .toUpperCase()
    .replace(/\s+\d{5}(-\d{4})?$/, "") // the city's parcel address ends in the ZIP
    .replace(/\s+(#|APT|UNIT)\s*\S+$/, "")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
