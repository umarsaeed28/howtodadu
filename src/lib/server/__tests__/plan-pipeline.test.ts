import { describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { emptyModel, type BuildingModel } from "@/lib/plans/building-model";
import { groupUpload, pool } from "@/lib/plans/group-upload";

/**
 * The plan library end to end, against an in-memory Supabase (tables and the private bucket) and real PDFs: a folder
 * of 20 drawing sets is uploaded in one batch, every file reaches a status, a set is corrected and verified, and it
 * appears among the admin map's precedent pins. Only Claude's reading is stubbed; the PDF structure pass is real.
 */

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ tables: { plan_sets: [] as Row[], plan_files: [] as Row[], admin_audit: [] as Row[] } as Record<string, Row[]>, bucket: new Map<string, Uint8Array>(), clock: 0 }));

class Q {
  private filters: ((r: Row) => boolean)[] = [];
  private op: "select" | "insert" | "update" = "select";
  private payload: Row = {};
  private cols = "*";
  private orderBy: { col: string; asc: boolean } | null = null;
  private max = Infinity;
  private mode: "many" | "single" | "maybe" = "many";
  private returning = false;
  constructor(private table: string) {}
  select(cols = "*") { if (this.op === "select") this.cols = cols; else this.returning = true; this.cols = cols; return this; }
  insert(row: Row) { this.op = "insert"; this.payload = row; return this; }
  update(patch: Row) { this.op = "update"; this.payload = patch; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, v: unknown[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  gte(c: string, v: number) { this.filters.push((r) => (r[c] as number) >= v); return this; }
  lte(c: string, v: number) { this.filters.push((r) => (r[c] as number) <= v); return this; }
  not(c: string) { this.filters.push((r) => r[c] != null); return this; } // only ever .not(col, "is", null)
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  private shape(r: Row): Row {
    const out = { ...r };
    if (this.cols.includes("files:plan_files")) out.files = db.tables.plan_files.filter((f) => f.set_id === r.id).map((f) => ({ ...f }));
    return out;
  }
  then(resolve: (v: { data: unknown; error: null | { message: string } }) => void) {
    const t = db.tables[this.table];
    let rows: Row[];
    if (this.op === "insert") {
      const defaults: Row = this.table === "plan_files" ? { uploaded: false, status: "uploaded", sheets: [], page_count: null, pdf_kind: null, extracted: null, error: null } : this.table === "plan_sets" ? { status: "uploaded", license: "internal", tags: [], lat: null, lng: null, model: null, draft_model: null, address: null } : {};
      const row = { id: crypto.randomUUID(), created_at: new Date(Date.UTC(2026, 9, 17, 0, 0, db.clock++)).toISOString(), ...defaults, ...this.payload };
      t.push(row);
      rows = [row];
    } else {
      rows = t.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "update") for (const r of rows) Object.assign(r, this.payload);
    }
    if (this.orderBy) { const { col, asc } = this.orderBy; rows = [...rows].sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (asc ? 1 : -1)); }
    rows = rows.slice(0, this.max).map((r) => this.shape(r));
    if (this.op !== "select" && !this.returning) return resolve({ data: null, error: null });
    if (this.mode === "many") return resolve({ data: rows, error: null });
    if (!rows.length) return resolve({ data: null, error: this.mode === "single" ? { message: "no row" } : null });
    return resolve({ data: rows[0], error: null });
  }
}

const storage = {
  from: () => ({
    createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `fake-upload://${path}` }, error: null }),
    list: async (folder: string, o: { search: string }) => ({ data: [...db.bucket.keys()].filter((k) => k === `${folder}/${o.search}`).map((k) => ({ name: k.split("/")[1] })), error: null }),
    download: async (path: string) => (db.bucket.has(path) ? { data: new Blob([db.bucket.get(path)! as BlobPart]), error: null } : { data: null, error: { message: "not found" } }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `fake-read://${path}` }, error: null }),
  }),
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/server", () => ({ adminDb: () => ({ from: (t: string) => new Q(t), storage }) }));
vi.mock("@/lib/server/address-search", () => ({ searchAddresses: async () => ({ provider: "esri", suggestions: [{ lat: 47.6612, lng: -122.3321 }] }) }));

/** A small vector drawing set: a code summary sheet and a floor plan sheet. */
function drawingSet(name: string): Uint8Array {
  const doc = new jsPDF();
  doc.text(`${name}  A0.1 PROJECT DATA  CODE SUMMARY  lot area 4,000 SF  zoning NR3  DADU 998 SF`, 10, 20);
  doc.addPage();
  doc.text("A1.1 MAIN FLOOR PLAN  bedroom  bath  kitchen  living  scale 1/4 in = 1 ft  upper floor plan", 10, 20);
  return new Uint8Array(doc.output("arraybuffer"));
}

describe("plan library pipeline", () => {
  it("uploads a folder of 20 PDFs in one action, extracts each, and puts a verified set on the map", async () => {
    const lib = await import("../plan-library");
    const { processPlanFile } = await import("../plan-extract");

    // A folder tree: 4 projects x 5 sheets; the last file is not really a PDF.
    const picked = Array.from({ length: 20 }, (_, i) => {
      const relPath = `Plans/Project ${Math.floor(i / 5) + 1}/Sheet ${(i % 5) + 1}.pdf`;
      const bytes = i === 19 ? new TextEncoder().encode("not a pdf at all") : drawingSet(relPath);
      return { name: relPath.split("/").pop()!, relPath, size: bytes.byteLength, file: bytes };
    });
    const { sets } = groupUpload(picked);
    expect(sets).toHaveLength(4);

    const batch = await lib.createBatch(null, "admin", sets.map((s) => ({ title: s.title, folder: s.folder, files: s.files.map(({ name, relPath, size }) => ({ name, relPath, size })) })));
    const jobs = batch.flatMap((b, si) => b.files.map((f, fi) => ({ ...f, bytes: sets[si].files[fi].file! })));
    expect(jobs).toHaveLength(20);

    // The browser's PUT to each signed URL, then the confirm call.
    await pool(jobs, 3, async (j) => {
      db.bucket.set(j.uploadUrl.replace("fake-upload://", ""), j.bytes);
      await lib.confirmUpload(null, j.fileId);
    });
    expect(db.tables.plan_files.every((f) => f.uploaded === true && f.status === "uploaded")).toBe(true);

    const read = vi.fn(async (_b: Uint8Array, name: string): Promise<BuildingModel> => ({
      ...emptyModel(),
      structure_type: "DADU",
      gross_floor_area_sqft: 998,
      bedrooms: 2,
      evidence: [{ field: "gross_floor_area_sqft", page: 1, quote: "DADU 998 SF" }],
      notes: name,
    }));
    await pool(jobs, 2, (j) => processPlanFile(null, j.fileId, { read, apiKey: "test" }));

    // Every file reached a status: 19 drafted for correction, the broken one failed with its reason.
    const files = db.tables.plan_files;
    expect(files.filter((f) => f.status === "needs_correction")).toHaveLength(19);
    const broken = files.find((f) => f.status === "failed")!;
    expect(broken.rel_path).toBe("Plans/Project 4/Sheet 5.pdf");
    expect(String(broken.error)).toMatch(/Not a readable PDF/);
    const good = files.find((f) => f.status === "needs_correction")!;
    expect(good).toMatchObject({ page_count: 2, pdf_kind: "vector" });
    expect((good.sheets as { kind: string }[]).map((s) => s.kind)).toEqual(["code_summary", "floor_plan"]);
    expect(read).toHaveBeenCalledTimes(19);

    // Sets: all four await correction (the one with a failed file still has four good ones), each with a draft.
    const board = await lib.listPlanSets(null);
    expect(board.map((s) => s.status)).toEqual(["needs_correction", "needs_correction", "needs_correction", "needs_correction"]);
    expect(board.every((s) => s.draft_model?.gross_floor_area_sqft === 998)).toBe(true);

    // Processing again is a no-op.
    await processPlanFile(null, good.id as string, { read, apiKey: "test" });
    expect(read).toHaveBeenCalledTimes(19);

    // Correct and verify one set with its address: it is located and becomes a precedent pin.
    const target = board.find((s) => s.title === "Project 2")!;
    const saved = await lib.updatePlanSet(null, "admin", target.id, { address: "1234 N 45th St, Seattle, WA", built: true, license: "precedent", model: { ...target.draft_model!, bedrooms: 3 }, verify: true });
    expect(saved).toMatchObject({ status: "verified", lat: 47.6612, lng: -122.3321, built: true });
    expect((saved.model as BuildingModel).bedrooms).toBe(3);
    const pins = await lib.precedentPins(null);
    expect(pins.map((p) => p.title)).toEqual(["Project 2"]);
    const near = await lib.nearbyPrecedents(null, 47.662, -122.333);
    expect(near[0]).toMatchObject({ title: "Project 2" });
    expect(near[0].distanceM).toBeLessThan(200);
    expect(db.tables.admin_audit.map((a) => a.action)).toEqual(["plans.upload", "plans.verify"]);
  }, 60_000);

  it("refuses a batch with non-PDFs or oversized files", async () => {
    const { batchProblem } = await import("../plan-library");
    expect(batchProblem([{ title: "x", folder: "", files: [{ name: "a.dwg", relPath: "a.dwg", size: 10 }] }])).toMatch(/not a PDF/);
    expect(batchProblem([{ title: "x", folder: "", files: [{ name: "a.pdf", relPath: "a.pdf", size: 101 * 1024 * 1024 }] }])).toMatch(/over 100 MB/);
    expect(batchProblem([])).toMatch(/No PDF/);
  });
});
