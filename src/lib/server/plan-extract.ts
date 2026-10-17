import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { adminDb } from "@/lib/admin/server";
import type { AdminEnv } from "@/lib/admin/env";
import { BUILDING_MODEL_SCHEMA, MODEL_FIELDS, SHEET_KINDS, classifySheet, emptyModel, mergeModels, pdfKindFrom, type BuildingModel, type PdfKind, type Sheet } from "@/lib/plans/building-model";
import { PLAN_BUCKET, setStatusFrom, type PlanFileRow, type PlanStatus } from "./plan-library";

/**
 * The plan ingestion pipeline, one file at a time:
 *   1. read the PDF's structure (unpdf, PDF.js): page count, a text layer per page (vector) or none (scanned), and a
 *      sheet type per page from its title-block text;
 *   2. Claude reads the whole set (text and page images, so scans work too) into a draft BuildingModel that cites the
 *      page of every number;
 *   3. the file goes to "needs correction": nothing counts until an admin reviews and verifies the set.
 */

/** Claude reads PDFs up to 32 MB per request; bigger files get the structural pass only and a note to read by hand. */
const MAX_VISION_BYTES = 30 * 1024 * 1024;
const MAX_VISION_PAGES = 100;
export const PLAN_READER_MODEL = process.env.PLAN_READER_MODEL || "claude-opus-5-5";

export interface PdfStructure {
  pageCount: number;
  pdfKind: PdfKind;
  sheets: Sheet[];
}

/** Step 1: pages, text layer and sheet types. Throws on a file that is not a readable PDF. */
export async function analyzePdf(bytes: Uint8Array): Promise<PdfStructure> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { pageCount: totalPages, pdfKind: pdfKindFrom(text), sheets: text.map((t, i) => classifySheet(i + 1, t)) };
}

const SYSTEM = `You read architectural drawing sets for Seattle backyard cottages (DADUs), attached ADUs and houses, to record what was designed and built. Report only what the drawings state. A number you would have to estimate or compute is null. Give every number you report an evidence entry with its page (1-based) and the exact text it came from. Classify every page as floor_plan, site, elevation, section, code_summary (code, zoning or project data tables, sheet index, cover sheet) or other. Measurements are in feet and square feet; convert feet-and-inches to decimal feet.`;

/** Step 2: Claude reads the set into a BuildingModel. */
export async function readDrawingSet(bytes: Uint8Array, fileName: string, apiKey: string): Promise<BuildingModel> {
  const client = new Anthropic({ apiKey });
  const params = {
    model: PLAN_READER_MODEL,
    max_tokens: 16000,
    // On a safety decline, the API retries the same request on a fallback model it picks by category.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: BUILDING_MODEL_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") } },
          { type: "text", text: `Drawing set file: ${fileName}. Read it into the schema.` },
        ],
      },
    ],
  };
  // `fallbacks` is newer than the installed SDK's types; the request shape is the documented one.
  const msg = await client.beta.messages.stream(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming).finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("The model declined to read this file.");
  if (msg.stop_reason === "max_tokens") throw new Error("The reading was cut off at the token limit.");
  const text = msg.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("The model returned no reading.");
  return sanitizeModel(JSON.parse(text.text));
}

/** Keeps a model to the schema's shape: unknown keys dropped, numbers finite and non-negative, lists bounded. */
export function sanitizeModel(raw: unknown): BuildingModel {
  const m = emptyModel();
  if (!raw || typeof raw !== "object") return m;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const s = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  if (["DADU", "AADU", "house", "duplex", "multiplex", "other"].includes(r.structure_type as string)) m.structure_type = r.structure_type as BuildingModel["structure_type"];
  for (const f of MODEL_FIELDS) (m as unknown as Record<string, unknown>)[f.key] = f.type === "number" ? n(r[f.key]) : s(r[f.key]);
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 300) : []);
  m.levels = list(r.levels).map((l) => ({ name: s((l as Record<string, unknown>)?.name, 80) ?? "Level", area_sqft: n((l as Record<string, unknown>)?.area_sqft) }));
  m.sheets = list(r.sheets).flatMap((x) => {
    const o = x as Record<string, unknown>;
    const page = typeof o?.page === "number" && o.page >= 1 ? Math.floor(o.page) : null;
    if (!page) return [];
    return [{ page, sheet_number: s(o.sheet_number, 20), title: s(o.title, 120), kind: (SHEET_KINDS as readonly string[]).includes(o.kind as string) ? (o.kind as BuildingModel["sheets"][number]["kind"]) : "other" }];
  });
  m.evidence = list(r.evidence).flatMap((x) => {
    const o = x as Record<string, unknown>;
    const field = s(o?.field, 60), quote = s(o?.quote, 300);
    return field && quote && typeof o?.page === "number" ? [{ field, page: Math.max(1, Math.floor(o.page)), quote }] : [];
  });
  m.notes = s(r.notes, 2000);
  return m;
}

/** Text-based sheet types, with the model's reading filling the pages that had no text (scans). */
export function combineSheets(fromText: Sheet[], model: BuildingModel | null): Sheet[] {
  const byPage = new Map((model?.sheets ?? []).map((s) => [s.page, s]));
  return fromText.map((s) => {
    const v = byPage.get(s.page);
    return s.by !== "text" && v ? { page: s.page, kind: v.kind, title: [v.sheet_number, v.title].filter(Boolean).join(" ") || null, by: "vision" as const } : s;
  });
}

/** Recomputes a set's status and draft model from its files. */
export async function refreshSet(env: AdminEnv | null, setId: string): Promise<PlanStatus> {
  const db = adminDb(env);
  const [{ data: set }, { data: files }] = await Promise.all([
    db.from("plan_sets").select("status").eq("id", setId).single(),
    db.from("plan_files").select("status, extracted, created_at").eq("set_id", setId).order("created_at"),
  ]);
  const rows = (files ?? []) as Pick<PlanFileRow, "status" | "extracted">[];
  const status = setStatusFrom((set?.status ?? "uploaded") as PlanStatus, rows);
  const models = rows.flatMap((f, i) => (f.extracted ? [{ fileIndex: i, model: f.extracted }] : []));
  await db.from("plan_sets").update({ status, draft_model: models.length ? mergeModels(models) : null, updated_at: new Date().toISOString() }).eq("id", setId);
  return status;
}

export type ProcessDeps = { analyze?: typeof analyzePdf; read?: typeof readDrawingSet; apiKey?: string | undefined };

/** Steps 1 to 3 for one uploaded file. Never throws for a bad file: the file is marked failed with the reason. */
export async function processPlanFile(env: AdminEnv | null, fileId: string, deps: ProcessDeps = {}): Promise<{ status: PlanStatus; error: string | null }> {
  const db = adminDb(env);
  const analyze = deps.analyze ?? analyzePdf;
  const read = deps.read ?? readDrawingSet;
  const apiKey = "apiKey" in deps ? deps.apiKey : process.env.ANTHROPIC_API_KEY;
  const { data: file } = await db.from("plan_files").select("*").eq("id", fileId).maybeSingle();
  if (!file) return { status: "failed", error: "No such file." };
  const f = file as PlanFileRow;
  if (!f.uploaded) return { status: f.status, error: "The file has not finished uploading." };
  const now = () => new Date().toISOString();
  // Claim the file in one conditional update, so two workers never extract it twice.
  const claim = await db.from("plan_files").update({ status: "extracting", error: null, updated_at: now() }).eq("id", fileId).eq("uploaded", true).in("status", ["uploaded", "failed"]).select("id");
  if (!claim.data?.length) return { status: f.status, error: null }; // already done or in progress
  await refreshSet(env, f.set_id);

  const fail = async (error: string) => {
    await db.from("plan_files").update({ status: "failed", error: error.slice(0, 500), updated_at: now() }).eq("id", fileId);
    await refreshSet(env, f.set_id);
    return { status: "failed" as const, error };
  };

  const dl = await db.storage.from(PLAN_BUCKET).download(f.storage_path);
  if (dl.error || !dl.data) return fail(`Could not read the file from storage: ${dl.error?.message ?? "empty"}`);
  const bytes = new Uint8Array(await dl.data.arrayBuffer());

  let structure: PdfStructure;
  try {
    structure = await analyze(bytes);
  } catch (e) {
    return fail(`Not a readable PDF: ${e instanceof Error ? e.message : String(e)}`);
  }

  let model: BuildingModel | null = null;
  let note: string | null = null;
  if (!apiKey) note = "ANTHROPIC_API_KEY is not set: only the page structure was read. Enter the model by hand.";
  else if (bytes.byteLength > MAX_VISION_BYTES || structure.pageCount > MAX_VISION_PAGES) note = `Too large to read automatically (${structure.pageCount} pages, ${(bytes.byteLength / 1048576).toFixed(0)} MB). Enter the model by hand.`;
  else {
    try {
      model = await read(bytes, f.name, apiKey);
    } catch (e) {
      note = `Automatic reading failed: ${e instanceof Error ? e.message : String(e)}. Enter the model by hand.`;
    }
  }

  await db
    .from("plan_files")
    .update({ page_count: structure.pageCount, pdf_kind: structure.pdfKind, sheets: combineSheets(structure.sheets, model), extracted: model, status: "needs_correction", error: note, updated_at: now() })
    .eq("id", fileId);
  return { status: await refreshSet(env, f.set_id), error: note };
}
