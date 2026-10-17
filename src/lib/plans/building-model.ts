/**
 * What Pencil reads out of an architectural drawing set: the BuildingModel (what was built: size, stories, rooms,
 * setbacks, with the page each number came from), and the per-page sheet classification. Pure, so the extraction
 * pipeline, the correction form and the tests share it.
 */

export const SHEET_KINDS = ["floor_plan", "site", "elevation", "section", "code_summary", "other"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];
export type PdfKind = "vector" | "scanned" | "mixed";

export interface Sheet {
  page: number;
  kind: SheetKind;
  /** The sheet number or title the classification came from, when one was found. */
  title: string | null;
  /** From the page's text ("text") or from reading the drawing ("vision"); "none" for a page with nothing to go on. */
  by: "text" | "vision" | "none";
}

export interface Evidence {
  field: string;
  page: number;
  quote: string;
}

export interface BuildingModel {
  structure_type: "DADU" | "AADU" | "house" | "duplex" | "multiplex" | "other";
  address: string | null;
  permit_number: string | null;
  designer: string | null;
  drawing_date: string | null;
  stories: number | null;
  height_ft: number | null;
  gross_floor_area_sqft: number | null;
  footprint_sqft: number | null;
  footprint_width_ft: number | null;
  footprint_depth_ft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage_sqft: number | null;
  lot_sqft: number | null;
  zoning: string | null;
  setback_front_ft: number | null;
  setback_rear_ft: number | null;
  setback_side_ft: number | null;
  roof_type: string | null;
  foundation: string | null;
  levels: { name: string; area_sqft: number | null }[];
  sheets: { page: number; sheet_number: string | null; title: string | null; kind: SheetKind }[];
  evidence: Evidence[];
  notes: string | null;
}

/** The numeric and text fields an admin corrects, in form order. */
export const MODEL_FIELDS: { key: keyof BuildingModel; label: string; type: "number" | "text" }[] = [
  { key: "address", label: "Address on the drawings", type: "text" },
  { key: "permit_number", label: "Permit number", type: "text" },
  { key: "designer", label: "Designer", type: "text" },
  { key: "drawing_date", label: "Drawing date", type: "text" },
  { key: "stories", label: "Stories", type: "number" },
  { key: "height_ft", label: "Height (ft)", type: "number" },
  { key: "gross_floor_area_sqft", label: "Gross floor area (sq ft)", type: "number" },
  { key: "footprint_sqft", label: "Footprint (sq ft)", type: "number" },
  { key: "footprint_width_ft", label: "Footprint width (ft)", type: "number" },
  { key: "footprint_depth_ft", label: "Footprint depth (ft)", type: "number" },
  { key: "bedrooms", label: "Bedrooms", type: "number" },
  { key: "bathrooms", label: "Bathrooms", type: "number" },
  { key: "garage_sqft", label: "Garage (sq ft)", type: "number" },
  { key: "lot_sqft", label: "Lot (sq ft)", type: "number" },
  { key: "zoning", label: "Zoning", type: "text" },
  { key: "setback_front_ft", label: "Front setback (ft)", type: "number" },
  { key: "setback_rear_ft", label: "Rear setback (ft)", type: "number" },
  { key: "setback_side_ft", label: "Side setback (ft)", type: "number" },
  { key: "roof_type", label: "Roof", type: "text" },
  { key: "foundation", label: "Foundation", type: "text" },
];

export const emptyModel = (): BuildingModel => ({
  structure_type: "other", address: null, permit_number: null, designer: null, drawing_date: null, stories: null, height_ft: null,
  gross_floor_area_sqft: null, footprint_sqft: null, footprint_width_ft: null, footprint_depth_ft: null, bedrooms: null, bathrooms: null,
  garage_sqft: null, lot_sqft: null, zoning: null, setback_front_ft: null, setback_rear_ft: null, setback_side_ft: null, roof_type: null,
  foundation: null, levels: [], sheets: [], evidence: [], notes: null,
});

const num = { anyOf: [{ type: "number" }, { type: "null" }] };
const str = { anyOf: [{ type: "string" }, { type: "null" }] };

/** JSON schema for structured output: every field required, null when the drawings do not say. */
export const BUILDING_MODEL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["structure_type", ...MODEL_FIELDS.map((f) => f.key), "levels", "sheets", "evidence", "notes"],
  properties: {
    structure_type: { type: "string", enum: ["DADU", "AADU", "house", "duplex", "multiplex", "other"] },
    ...Object.fromEntries(MODEL_FIELDS.map((f) => [f.key, f.type === "number" ? num : str])),
    levels: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "area_sqft"], properties: { name: { type: "string" }, area_sqft: num } } },
    sheets: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["page", "sheet_number", "title", "kind"], properties: { page: { type: "integer" }, sheet_number: str, title: str, kind: { type: "string", enum: [...SHEET_KINDS] } } },
    },
    evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["field", "page", "quote"], properties: { field: { type: "string" }, page: { type: "integer" }, quote: { type: "string" } } } },
    notes: str,
  },
} as const;

/** A page with fewer characters of text than this is treated as a scan (no text layer). */
export const SCANNED_PAGE_CHARS = 40;

/** Vector when every page carries a text layer, scanned when none does, mixed otherwise. */
export function pdfKindFrom(pageTexts: string[]): PdfKind {
  const withText = pageTexts.filter((t) => t.replace(/\s+/g, "").length >= SCANNED_PAGE_CHARS).length;
  if (withText === pageTexts.length) return "vector";
  if (withText === 0) return "scanned";
  return "mixed";
}

/** Title-block phrases per sheet kind, strongest first. Section needs a drawing word: "SMC 23.44" is not a section. */
const SHEET_PATTERNS: [SheetKind, RegExp][] = [
  ["code_summary", /\b(code (summary|analysis|review)|project (data|information|summary)|zoning (summary|analysis)|land use (summary|analysis)|sheet index)\b/i],
  ["site", /\b(site plan|plot plan|site survey|survey|landscape plan|tree protection plan)\b/i],
  ["floor_plan", /\b(floor plans?|main floor|upper floor|lower floor|first floor|second floor|level \d plan|basement plan|roof plan)\b/i],
  ["elevation", /\b(elevations?|(north|south|east|west) elevation)\b/i],
  ["section", /\b(building sections?|wall sections?|cross sections?|section [a-z0-9]{1,3}\b(?!\.))/i],
];

/** Architectural sheet numbers like A1.1, A-201, S2.0, C1. */
const SHEET_NUMBER = /\b([ACSLGTEMP]-?\d{1,3}(?:\.\d{1,2})?)\b/;

/** Classify one page from its text. A scanned page has no text to read and is left for the vision pass. */
export function classifySheet(page: number, text: string): Sheet {
  if (text.replace(/\s+/g, "").length < SCANNED_PAGE_CHARS) return { page, kind: "other", title: null, by: "none" };
  let best: { kind: SheetKind; hits: number; at: number; match: string } | null = null;
  for (const [kind, re] of SHEET_PATTERNS) {
    const g = new RegExp(re.source, "gi");
    const hits = [...text.matchAll(g)];
    if (!hits.length) continue;
    // More mentions win; a tie goes to the earlier pattern (title blocks name the sheet's purpose explicitly).
    if (!best || hits.length > best.hits) best = { kind, hits: hits.length, at: hits[0].index ?? 0, match: hits[0][0] };
  }
  const number = SHEET_NUMBER.exec(text)?.[1] ?? null;
  if (!best) return { page, kind: "other", title: number, by: "text" };
  return { page, kind: best.kind, title: [number, best.match.toUpperCase()].filter(Boolean).join(" "), by: "text" };
}

/** One set's model from its files' models: the first value found for each field, lists joined, pages kept per file. */
export function mergeModels(models: { fileIndex: number; model: BuildingModel }[]): BuildingModel {
  const out = emptyModel();
  for (const { model } of models) {
    if (out.structure_type === "other" && model.structure_type !== "other") out.structure_type = model.structure_type;
    for (const f of MODEL_FIELDS) {
      if (out[f.key] == null && model[f.key] != null) (out as unknown as Record<string, unknown>)[f.key] = model[f.key];
    }
    out.levels.push(...model.levels);
    out.sheets.push(...model.sheets);
    out.evidence.push(...model.evidence);
    if (model.notes) out.notes = out.notes ? `${out.notes}\n${model.notes}` : model.notes;
  }
  return out;
}

/** Folder path segments as tags: "2024/Ballard/123 Main St" gives ["2024", "Ballard", "123 Main St"]. */
export function tagsFromFolder(folder: string): string[] {
  return folder.split("/").map((s) => s.trim()).filter(Boolean).slice(0, 12);
}
