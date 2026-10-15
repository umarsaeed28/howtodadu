/**
 * Domain synonyms, shared by the built-in keyword search and the Supabase keyword search: a reader who types
 * "backyard cottage" or "detached accessory dwelling unit" finds the DADU passages, and the reverse.
 */
export const SYNONYMS: [RegExp, string][] = [
  [/\bbackyard cottages?\b/g, " dadu "],
  [/\bdetached (accessory dwelling units?|adus?)\b/g, " dadu "],
  [/\battached (accessory dwelling units?|adus?)\b/g, " aadu "],
  [/\baccessory dwelling units?\b/g, " adu "],
  [/\bdriveways?\b/g, " driveway access "],
  [/\bsq\.? ?ft\b|\bsquare feet\b|\bsf\b/g, " sqft "],
];

/** The question plus the canonical term for every synonym it uses, for keyword matching. */
export function expandQuery(question: string): string {
  const low = question.toLowerCase();
  const extra = new Set<string>();
  for (const [re, rep] of SYNONYMS) {
    re.lastIndex = 0;
    if (re.test(low)) for (const w of rep.trim().split(/\s+/)) extra.add(w);
    re.lastIndex = 0;
  }
  return extra.size ? `${question} ${[...extra].join(" ")}` : question;
}
