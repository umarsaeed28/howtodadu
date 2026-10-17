import { describe, expect, it } from "vitest";
import { BUILDING_MODEL_SCHEMA, MODEL_FIELDS, classifySheet, emptyModel, mergeModels, pdfKindFrom, tagsFromFolder } from "./building-model";
import { groupUpload, pool } from "./group-upload";

describe("PDF structure", () => {
  it("tells vector, scanned and mixed sets apart by their text layers", () => {
    const page = "A1.1 FLOOR PLAN SCALE 1/4 IN = 1 FT LIVING ROOM 14'-0\" KITCHEN BEDROOM";
    expect(pdfKindFrom([page, page])).toBe("vector");
    expect(pdfKindFrom(["", " "])).toBe("scanned");
    expect(pdfKindFrom([page, ""])).toBe("mixed");
  });

  it("classifies sheets from title-block text", () => {
    expect(classifySheet(1, "PROJECT DATA  CODE SUMMARY  SHEET INDEX A0.1 lot area 4,000 SF zoning NR3")).toMatchObject({ kind: "code_summary", by: "text" });
    expect(classifySheet(2, "A0.2 SITE PLAN  north arrow  rear setback 5'-0\" property line alley")).toMatchObject({ kind: "site", title: "A0.2 SITE PLAN" });
    expect(classifySheet(3, "A1.1 MAIN FLOOR PLAN bedroom bath kitchen living 1/4\" = 1'-0\" upper floor plan")).toMatchObject({ kind: "floor_plan" });
    expect(classifySheet(4, "A2.1 NORTH ELEVATION SOUTH ELEVATION fiber cement siding roof pitch 4:12")).toMatchObject({ kind: "elevation" });
    expect(classifySheet(5, "A3.1 BUILDING SECTION A  roof framing  wall assembly insulation R-21")).toMatchObject({ kind: "section" });
  });

  it("does not take a code citation for a section, and leaves scans for the vision pass", () => {
    expect(classifySheet(1, "per SMC 23.44.090 and section 23.42.022 general notes for contractors working on site").kind).not.toBe("section");
    expect(classifySheet(9, "  ")).toEqual({ page: 9, kind: "other", title: null, by: "none" });
  });
});

describe("BuildingModel", () => {
  it("the schema requires every field it defines (strict structured output)", () => {
    expect([...BUILDING_MODEL_SCHEMA.required].sort()).toEqual(Object.keys(BUILDING_MODEL_SCHEMA.properties).sort());
    expect(MODEL_FIELDS.every((f) => f.key in BUILDING_MODEL_SCHEMA.properties)).toBe(true);
  });

  it("merges a set's files: first value per field, lists joined", () => {
    const a = { ...emptyModel(), structure_type: "DADU" as const, gross_floor_area_sqft: 998, evidence: [{ field: "gross_floor_area_sqft", page: 1, quote: "998 SF" }] };
    const b = { ...emptyModel(), gross_floor_area_sqft: 1200, bedrooms: 2, levels: [{ name: "Main", area_sqft: 520 }] };
    const m = mergeModels([{ fileIndex: 0, model: a }, { fileIndex: 1, model: b }]);
    expect(m).toMatchObject({ structure_type: "DADU", gross_floor_area_sqft: 998, bedrooms: 2 });
    expect(m.levels).toHaveLength(1);
    expect(m.evidence).toHaveLength(1);
  });
});

describe("grouping an upload", () => {
  const f = (relPath: string, size = 1000) => ({ name: relPath.split("/").pop()!, relPath, size });

  it("makes one set per folder with PDFs, titled after the folder, and skips other files", () => {
    const { sets, skipped } = groupUpload([
      f("Plans/2024/Ballard/123 Main St/A1.1 Floor.pdf"),
      f("Plans/2024/Ballard/123 Main St/A0.1 Site.PDF"),
      f("Plans/2024/Ballard/123 Main St/photo.jpg"),
      f("Plans/2023/Fremont/88 Elm/set.pdf"),
      f("Plans/.DS_Store"),
      f("loose.pdf"),
    ]);
    expect(sets.map((s) => [s.title, s.folder, s.files.length])).toEqual([
      ["loose", "", 1],
      ["88 Elm", "Plans/2023/Fremont/88 Elm", 1],
      ["123 Main St", "Plans/2024/Ballard/123 Main St", 2],
    ]);
    expect(skipped).toEqual(["Plans/2024/Ballard/123 Main St/photo.jpg"]);
    expect(sets.find((s) => s.title === "123 Main St")!.files.map((x) => x.name)).toEqual(["A0.1 Site.PDF", "A1.1 Floor.pdf"]);
    expect(tagsFromFolder("Plans/2024/Ballard/123 Main St")).toEqual(["Plans", "2024", "Ballard", "123 Main St"]);
  });

  it("runs work with a concurrency limit and keeps the order", async () => {
    let running = 0, peak = 0;
    const out = await pool([5, 1, 3, 2, 4], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, n));
      running--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 30, 20, 40]);
    expect(peak).toBe(2);
  });
});
